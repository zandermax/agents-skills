import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
	createDispatcher,
	errorResult,
	MAX_OUTPUT_BYTES,
} from './toolkit/dispatch.ts';
import { DEFAULT_ROOT, MAX_INPUT_BYTES, MAX_ITEMS } from './toolkit/input.ts';

class BoundedStdioTransport extends StdioServerTransport {
	override async send(message: JSONRPCMessage): Promise<void> {
		if (
			'result' in message &&
			Array.isArray(message.result.content) &&
			Buffer.byteLength(JSON.stringify(message.result)) > MAX_OUTPUT_BYTES
		) {
			return super.send({
				...message,
				result: errorResult(new Error('Tool response exceeded the byte limit')),
			});
		}
		if ('error' in message) {
			return super.send({
				...message,
				error: {
					code: message.error.code,
					message: message.error.message.slice(0, 512),
				},
			});
		}
		return super.send(message);
	}
}

const fileFields = {
	path: z
		.string()
		.min(1)
		.optional()
		.describe(
			'File inside the configured input root; exclusive with inline data.',
		),
	format: z
		.enum(['lines', 'json', 'csv'])
		.optional()
		.describe('Required with path.'),
	column: z
		.string()
		.min(1)
		.optional()
		.describe('CSV column, required except group_count.'),
};
const scalar = z.union([
	z.string(),
	z.number().finite(),
	z.boolean(),
	z.null(),
]);
const collectionSchema = z
	.object({
		op: z.enum(['mode', 'frequencies', 'dedupe', 'group_count']),
		items: z
			.array(scalar)
			.max(MAX_ITEMS)
			.optional()
			.describe('Inline scalars, except group_count.'),
		records: z
			.array(z.record(z.string(), z.unknown()))
			.max(MAX_ITEMS)
			.optional()
			.describe('Inline group_count records.'),
		...fileFields,
		top: z
			.number()
			.int()
			.positive()
			.optional()
			.describe('mode only; default 1.'),
		sort: z
			.enum(['count_desc', 'first_seen', 'alpha'])
			.optional()
			.describe('frequencies only; default count_desc.'),
		limit: z
			.number()
			.int()
			.nonnegative()
			.optional()
			.describe('frequencies logical limit.'),
		caseSensitive: z
			.boolean()
			.optional()
			.describe('dedupe only; default true.'),
		keepFirst: z.boolean().optional().describe('dedupe only; default true.'),
		key: z
			.string()
			.min(1)
			.optional()
			.describe('group_count own-property dot path.'),
		maxRows: z
			.number()
			.int()
			.min(1)
			.max(1_000)
			.optional()
			.describe('Response row cap, default 200; counts remain exact.'),
	})
	.strict();
const textSchema = z
	.object({
		op: z.enum(['count_occurrences', 'grapheme_count']),
		text: z
			.string()
			.max(MAX_INPUT_BYTES)
			.optional()
			.describe('Inline text, exclusive with path.'),
		...fileFields,
		needle: z
			.string()
			.min(1)
			.max(MAX_INPUT_BYTES)
			.optional()
			.describe(
				'count_occurrences literal or regex pattern without delimiters.',
			),
		overlapping: z
			.boolean()
			.optional()
			.describe('count_occurrences only; default false.'),
		caseSensitive: z
			.boolean()
			.optional()
			.describe('count_occurrences only; default true.'),
		regex: z
			.boolean()
			.optional()
			.describe(
				'count_occurrences only; default false; isolated 2-second deadline.',
			),
	})
	.strict();
const outputSchema = z.object({
	result: z.unknown(),
	totalRows: z.number().int(),
	returnedRows: z.number().int(),
	truncated: z.boolean(),
	reason: z.string().nullable(),
});
const annotations = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false,
};

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	if (
		args.length !== 0 &&
		(args.length !== 2 || args[0] !== '--input-root' || !args[1])
	) {
		throw new Error('Usage: bun run src/server.ts [--input-root DIRECTORY]');
	}
	const root = resolve(args[1] ?? DEFAULT_ROOT);
	if (!(await stat(root)).isDirectory())
		throw new Error('Input root must be a directory');
	const dispatch = createDispatcher(root);
	const shutdown = new AbortController();
	const server = new McpServer(
		{ name: 'deterministic-toolkit', version: '1.0.0' },
		{
			instructions:
				'Offline deterministic text/collection utilities. Exactly inline data or path+format. Counts use complete accepted input; outputs are capped with explicit truncation. Files stay inside the configured canonical root; not an OS sandbox. One active operation; retry a busy response later.',
		},
	);
	server.registerTool(
		'collection',
		{
			inputSchema: collectionSchema,
			outputSchema,
			annotations,
			description:
				'Deterministic scalar mode/frequencies/dedupe and record group_count without shell locale or sort/uniq tie ambiguity. mode and count_desc ties keep first-seen order; first_seen preserves encounter order; alpha compares Unicode code points of type:value keys. Scalars are type-sensitive (-0=0); no coercion or normalization. dedupe defaults first/case-sensitive; insensitive strings use Unicode lowercasing, not full folding; keep-last follows retained positions. group_count uses own-property dot paths, errors on missing/non-scalar values. Empty collections return []. Files: lines preserve blanks, JSON arrays, CSV strings with headers (column except grouping); group_count lines are JSON records. Only options for the selected op. 10 MiB/100000 items/depth32 inputs; 16 KiB whole-value output prefixes with explicit truncation.',
		},
		(args, extra) =>
			dispatch(
				'collection',
				args,
				AbortSignal.any([extra.signal, shutdown.signal]),
			),
	);
	server.registerTool(
		'text',
		{
			inputSchema: textSchema,
			outputSchema,
			annotations,
			description:
				'Unicode-correct counts without LLM guessing or shell byte/character confusion. grapheme_count returns graphemes via Intl.Segmenter plus utf16Length and codePoints (runtime Unicode version; no normalization). count_occurrences defaults literal, case-sensitive, nonoverlapping; regex is ECMAScript Unicode pattern without delimiters, insensitive uses Unicode i not full folding. Overlap advances one original code point after match start; nonoverlap resumes at match end. Empty needle, invalid regex, and zero-width matches error. Regex runs in a terminable worker with a 2-second deadline. Lines text is verbatim; JSON must be a string; CSV joins a required column with LF. 10 MiB input, 16 KiB bounded responses. Only options for the selected op.',
		},
		(args, extra) =>
			dispatch('text', args, AbortSignal.any([extra.signal, shutdown.signal])),
	);
	server.server.onclose = () => shutdown.abort();
	for (const signal of ['SIGTERM', 'SIGINT'] as const) {
		process.once(signal, () => {
			shutdown.abort();
			void server.close();
		});
	}
	await server.connect(
		new BoundedStdioTransport(process.stdin, process.stdout, {
			maxBufferSize: MAX_INPUT_BYTES * 6 + 4_096,
		}),
	);
}

void main().catch((error: unknown) => {
	console.error(
		error instanceof Error
			? error.message.slice(0, 512)
			: 'Server startup failed',
	);
	process.exitCode = 1;
});
