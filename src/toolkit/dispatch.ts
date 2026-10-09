import { Worker } from "node:worker_threads";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
	dedupe,
	frequencies,
	groupCount,
	mode,
	type Scalar,
} from "../lib/collections.ts";
import {
	countOccurrences,
	graphemeCount,
	type OccurrenceOptions,
} from "../lib/text.ts";
import { DEFAULT_ROOT, loadInput, type ToolKind } from "./input.ts";

export const MAX_OUTPUT_BYTES = 16 * 1024;

export function errorResult(error: unknown): CallToolResult {
	const message = error instanceof Error ? error.message : "Operation failed";
	return {
		isError: true,
		content: [{ type: "text", text: message.slice(0, 512) }],
	};
}

function integerOption(
	args: Record<string, unknown>,
	name: string,
	fallback: number,
	minimum = 0,
): number {
	const value = args[name] ?? fallback;
	if (
		typeof value !== "number" ||
		!Number.isSafeInteger(value) ||
		value < minimum
	) {
		throw new TypeError(`${name} must be an integer >= ${minimum}`);
	}
	return value;
}

function booleanOption(
	args: Record<string, unknown>,
	name: string,
	fallback: boolean,
): boolean {
	const value = args[name] ?? fallback;
	if (typeof value !== "boolean")
		throw new TypeError(`${name} must be boolean`);
	return value;
}

function stringOption(args: Record<string, unknown>, name: string): string {
	const value = args[name];
	if (typeof value !== "string" || value.length === 0)
		throw new TypeError(`${name} must be nonempty`);
	return value;
}

function boundedResult(value: unknown, maxRows: number): CallToolResult {
	const rows = Array.isArray(value) ? value : null;
	const totalRows = rows ? rows.length : 1;
	const rowCount = rows ? Math.min(totalRows, maxRows) : 1;
	const pack = (returnedRows: number, byteLimited: boolean): CallToolResult => {
		const rowLimited = totalRows > maxRows;
		const envelope = {
			result: rows ? rows.slice(0, returnedRows) : value,
			totalRows,
			returnedRows,
			truncated: returnedRows < totalRows,
			reason: byteLimited
				? rowLimited
					? "row_and_byte_limit"
					: "byte_limit"
				: rowLimited
					? "row_limit"
					: null,
		};
		return {
			content: [{ type: "text", text: JSON.stringify(envelope) }],
			structuredContent: envelope,
		};
	};
	const result = pack(rowCount, false);
	if (Buffer.byteLength(JSON.stringify(result)) <= MAX_OUTPUT_BYTES)
		return result;
	if (!rows) return errorResult(new Error("Result exceeds the byte limit"));
	let lower = 0;
	let upper = rowCount;
	while (lower < upper) {
		const middle = Math.ceil((lower + upper) / 2);
		if (
			Buffer.byteLength(JSON.stringify(pack(middle, true))) <= MAX_OUTPUT_BYTES
		)
			lower = middle;
		else upper = middle - 1;
	}
	return pack(lower, true);
}

function regexCount(
	text: string,
	needle: string,
	options: OccurrenceOptions,
	signal?: AbortSignal,
): Promise<number> {
	if (signal?.aborted) return Promise.reject(new Error("Operation cancelled"));
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL("./regex-worker.ts", import.meta.url), {
			workerData: { text, needle, options },
		});
		let settled = false;
		const finish = (error: Error | null, count = 0) => {
			if (settled) return;
			settled = true;
			clearTimeout(deadline);
			signal?.removeEventListener("abort", abort);
			void worker.terminate().then(
				() => (error ? reject(error) : resolve(count)),
				(error: Error) => reject(error),
			);
		};
		const abort = () => finish(new Error("Operation cancelled"));
		const deadline = setTimeout(
			() => finish(new Error("Regex timed out after 2000ms")),
			2_000,
		);
		signal?.addEventListener("abort", abort, { once: true });
		worker.once("message", (message: { count?: number; error?: string }) => {
			if (message.error !== undefined) finish(new Error(message.error));
			else if (typeof message.count === "number") finish(null, message.count);
			else finish(new Error("Invalid regex worker response"));
		});
		worker.once("error", (error) => finish(error));
		worker.once("exit", () =>
			finish(new Error("Regex worker exited before replying")),
		);
		if (signal?.aborted) abort();
	});
}

const operationFields: Record<string, readonly string[]> = {
	mode: ["top", "maxRows"],
	frequencies: ["sort", "limit", "maxRows"],
	dedupe: ["caseSensitive", "keepFirst", "maxRows"],
	group_count: ["key", "maxRows"],
	count_occurrences: ["needle", "overlapping", "caseSensitive", "regex"],
	grapheme_count: [],
};

export function createDispatcher(root = DEFAULT_ROOT) {
	let active = false;
	return async (
		kind: ToolKind,
		args: Record<string, unknown>,
		signal?: AbortSignal,
	): Promise<CallToolResult> => {
		if (active)
			return errorResult(
				new Error("Toolkit busy: one active operation, no queue"),
			);
		active = true;
		try {
			if (signal?.aborted) throw new Error("Operation cancelled");
			const op = stringOption(args, "op");
			const supported =
				kind === "collection"
					? ["mode", "frequencies", "dedupe", "group_count"]
					: ["count_occurrences", "grapheme_count"];
			if (!supported.includes(op)) throw new TypeError("Unsupported operation");
			const inline =
				kind === "text" ? "text" : op === "group_count" ? "records" : "items";
			const allowed = new Set([
				"op",
				"path",
				"format",
				"column",
				inline,
				...(operationFields[op] ?? []),
			]);
			if (Object.keys(args).some((field) => !allowed.has(field)))
				throw new TypeError("Unexpected option for this operation");
			const maxRows = integerOption(args, "maxRows", 200, 1);
			if (maxRows > 1_000) throw new RangeError("maxRows must not exceed 1000");
			const input = await loadInput(kind, op, args, root);
			if (signal?.aborted) throw new Error("Operation cancelled");
			let result: unknown;
			switch (op) {
				case "mode":
					result = mode(input as Scalar[], {
						top: integerOption(args, "top", 1, 1),
					});
					break;
				case "frequencies": {
					const sort = args.sort ?? "count_desc";
					if (
						sort !== "count_desc" &&
						sort !== "first_seen" &&
						sort !== "alpha"
					)
						throw new TypeError("Invalid frequency sort");
					result = frequencies(input as Scalar[], {
						sort,
						...(args.limit === undefined
							? {}
							: { limit: integerOption(args, "limit", 0) }),
					});
					break;
				}
				case "dedupe":
					result = dedupe(input as Scalar[], {
						caseSensitive: booleanOption(args, "caseSensitive", true),
						keepFirst: booleanOption(args, "keepFirst", true),
					});
					break;
				case "group_count":
					result = groupCount(
						input as Record<string, unknown>[],
						stringOption(args, "key"),
					);
					break;
				case "grapheme_count":
					result = graphemeCount(input as string);
					break;
				case "count_occurrences": {
					const options = {
						overlapping: booleanOption(args, "overlapping", false),
						caseSensitive: booleanOption(args, "caseSensitive", true),
						regex: booleanOption(args, "regex", false),
					};
					const needle = stringOption(args, "needle");
					result = options.regex
						? await regexCount(input as string, needle, options, signal)
						: countOccurrences(input as string, needle, options);
					break;
				}
			}
			return boundedResult(result, maxRows);
		} catch (error) {
			return errorResult(error);
		} finally {
			active = false;
		}
	};
}
