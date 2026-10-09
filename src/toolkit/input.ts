import { constants } from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

export const DEFAULT_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_ITEMS = 100_000;
export const MAX_DEPTH = 32;
export type ToolKind = 'collection' | 'text';

function assertBudget(value: unknown): void {
	const serialized = typeof value === 'string' ? value : JSON.stringify(value);
	if (
		serialized === undefined ||
		Buffer.byteLength(serialized) > MAX_INPUT_BYTES
	) {
		throw new RangeError(
			'Input exceeds the 10 MiB byte limit or is not JSON data',
		);
	}
	const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
	let items = 0;
	while (pending.length > 0) {
		const entry = pending.pop();
		if (!entry) break;
		if (entry.depth > MAX_DEPTH)
			throw new RangeError('Input nesting exceeds depth 32');
		if (Array.isArray(entry.value)) {
			items += entry.value.length;
			if (items > MAX_ITEMS)
				throw new RangeError('Input exceeds 100,000 items/records');
			for (const child of entry.value)
				pending.push({ value: child, depth: entry.depth + 1 });
		} else if (entry.value !== null && typeof entry.value === 'object') {
			for (const child of Object.values(entry.value)) {
				pending.push({ value: child, depth: entry.depth + 1 });
			}
		} else if (
			entry.value !== null &&
			typeof entry.value !== 'string' &&
			typeof entry.value !== 'boolean' &&
			!(typeof entry.value === 'number' && Number.isFinite(entry.value))
		) {
			throw new TypeError('Input must contain only JSON values');
		}
	}
}

function withinRoot(root: string, target: string): boolean {
	const remainder = relative(root, target);
	return (
		remainder !== '..' &&
		!remainder.startsWith(`..${sep}`) &&
		!isAbsolute(remainder)
	);
}

async function readFileInput(filename: string, root: string): Promise<string> {
	const canonicalRoot = await realpath(root);
	const requested = resolve(canonicalRoot, filename);
	if (!withinRoot(canonicalRoot, requested))
		throw new Error('File path is outside the input root');
	const target = await realpath(requested);
	if (!withinRoot(canonicalRoot, target))
		throw new Error('File symlink escapes the input root');
	if (!(await stat(target)).isFile())
		throw new Error('Input must be a regular file');
	const handle = await open(
		target,
		constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW,
	);
	try {
		const opened = await handle.stat();
		if (!opened.isFile()) throw new Error('Input must be a regular file');
		if (opened.size > MAX_INPUT_BYTES)
			throw new RangeError('File exceeds the 10 MiB byte limit');
		const chunks: Buffer[] = [];
		let total = 0;
		while (true) {
			const buffer = Buffer.alloc(
				Math.min(64 * 1024, MAX_INPUT_BYTES - total + 1),
			);
			const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
			if (bytesRead === 0) break;
			total += bytesRead;
			if (total > MAX_INPUT_BYTES)
				throw new RangeError('File exceeds the 10 MiB byte limit');
			chunks.push(buffer.subarray(0, bytesRead));
		}
		return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
			Buffer.concat(chunks, total),
		);
	} finally {
		await handle.close();
	}
}

function readCsv(text: string): Record<string, string>[] {
	let hasHeader = false;
	const rows = parse(text, {
		bom: true,
		columns: (headers: string[]) => {
			if (
				headers.some((header) => header.length === 0) ||
				new Set(headers).size !== headers.length
			) {
				throw new TypeError('CSV requires nonempty unique headers');
			}
			hasHeader = true;
			return headers;
		},
		max_record_size: MAX_INPUT_BYTES,
	}) as Record<string, string>[];
	if (!hasHeader) throw new TypeError('CSV requires a header row');
	return rows;
}

function assertShape(value: unknown, kind: ToolKind, op: string): void {
	if (kind === 'text') {
		if (typeof value !== 'string')
			throw new TypeError('Text input must be a string');
	} else if (!Array.isArray(value)) {
		throw new TypeError('Collection input must be an array');
	} else if (op === 'group_count') {
		if (
			value.some(
				(record) =>
					record === null ||
					typeof record !== 'object' ||
					Array.isArray(record),
			)
		) {
			throw new TypeError('group_count requires record objects');
		}
	} else if (
		value.some(
			(item) =>
				item !== null &&
				typeof item !== 'string' &&
				typeof item !== 'boolean' &&
				!(typeof item === 'number' && Number.isFinite(item)),
		)
	) {
		throw new TypeError('Collection items must be JSON scalars');
	}
}

export async function loadInput(
	kind: ToolKind,
	op: string,
	args: Record<string, unknown>,
	root: string = DEFAULT_ROOT,
): Promise<unknown> {
	const inlineField =
		kind === 'text' ? 'text' : op === 'group_count' ? 'records' : 'items';
	const sources = ['items', 'records', 'text', 'path'].filter((field) =>
		Object.hasOwn(args, field),
	);
	if (
		sources.length !== 1 ||
		(sources[0] !== inlineField && sources[0] !== 'path')
	) {
		throw new TypeError(`Provide exactly ${inlineField} or path with format`);
	}
	let value: unknown;
	if (sources[0] === inlineField) {
		if (args.format !== undefined || args.column !== undefined)
			throw new TypeError('format/column require a file source');
		value = args[inlineField];
	} else {
		if (typeof args.path !== 'string' || args.path.length === 0)
			throw new TypeError('path must be nonempty');
		if (!['lines', 'json', 'csv'].includes(String(args.format)))
			throw new TypeError('File format must be lines, json, or csv');
		if (args.format !== 'csv' && args.column !== undefined)
			throw new TypeError('column requires CSV');
		const text = await readFileInput(args.path, root);
		if (args.format === 'json') {
			value = JSON.parse(text);
		} else if (args.format === 'lines') {
			if (kind === 'text') value = text;
			else {
				const lines = text.length === 0 ? [] : text.split(/\r?\n/);
				if (text.endsWith('\n')) lines.pop();
				value =
					op === 'group_count'
						? lines
								.filter((line) => line.trim().length > 0)
								.map((line) => JSON.parse(line))
						: lines;
			}
		} else {
			const rows = readCsv(text);
			if (op === 'group_count') {
				if (args.column !== undefined)
					throw new TypeError('group_count uses full CSV records, not column');
				value = rows;
			} else {
				if (typeof args.column !== 'string' || args.column.length === 0)
					throw new TypeError('CSV requires a column');
				const column = args.column;
				const cells = rows.map((row) => {
					if (!Object.hasOwn(row, column))
						throw new TypeError('CSV column does not exist');
					return row[column];
				});
				value = kind === 'text' ? cells.join('\n') : cells;
			}
		}
	}
	assertShape(value, kind, op);
	assertBudget(value);
	return value;
}
