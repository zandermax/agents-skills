import type { EvalTranscript } from "./agent-evals.js";

function extractJsonEvents(rawOutput: string): readonly unknown[] {
	const trimmed = rawOutput.trim();
	if (trimmed.length === 0) {
		return [];
	}

	try {
		const parsed = JSON.parse(trimmed);
		return Array.isArray(parsed) ? parsed : [parsed];
	} catch {
		// Not a single JSON value; fall through to JSONL parsing below.
	}

	const events: unknown[] = [];
	for (const line of trimmed.split("\n")) {
		const trimmedLine = line.trim();
		if (trimmedLine.length === 0) {
			continue;
		}
		try {
			events.push(JSON.parse(trimmedLine));
		} catch {
			// Ignore non-JSON lines (e.g. banners); transcripts are best-effort.
		}
	}
	return events;
}

const FILE_ARGUMENT_KEYS = ["path", "filePath", "file_path"] as const;

/**
 * Extracts memory/skill access from tool-invocation events nested under an
 * event's `data` field. Covers Copilot's `skill` tool (names the memory
 * directly, no file path) and its `view` tool (a `path` argument), verified
 * against a real captured transcript (2026-09-10, see plan Phase 2).
 */
function extractFilesAccessed(events: readonly unknown[]): readonly string[] {
	const found = new Set<string>();
	for (const event of events) {
		if (typeof event !== "object" || event === null) {
			continue;
		}
		const data = (event as Record<string, unknown>).data;
		if (typeof data !== "object" || data === null) {
			continue;
		}
		const dataRecord = data as Record<string, unknown>;

		if (dataRecord.toolName === "skill") {
			const args = dataRecord.arguments;
			if (typeof args === "object" && args !== null) {
				const skillName = (args as Record<string, unknown>).skill;
				if (typeof skillName === "string") {
					found.add(skillName);
				}
			}
		}

		const args = dataRecord.arguments ?? dataRecord.input;
		if (typeof args === "object" && args !== null) {
			const argsRecord = args as Record<string, unknown>;
			for (const key of FILE_ARGUMENT_KEYS) {
				const value = argsRecord[key];
				if (typeof value === "string") {
					found.add(value);
				}
			}
		}
	}
	return Array.from(found);
}

/**
 * Extracts the final response text. Handles Copilot's JSONL
 * `assistant.message` events (`data.content` is a plain string) and Claude's
 * `--output-format json` single-result object (top-level `result` string).
 * The nested content-block scan is best-effort for Claude's stream-json mode
 * and not yet verified against a real transcript.
 */
function extractResponseText(events: readonly unknown[]): string {
	let combined = "";
	for (const event of events) {
		if (typeof event !== "object" || event === null) {
			continue;
		}
		const record = event as Record<string, unknown>;

		if (typeof record.result === "string" && record.result.length > 0) {
			combined += `${record.result}\n`;
		}

		const data = record.data;
		if (typeof data !== "object" || data === null) {
			continue;
		}
		const dataRecord = data as Record<string, unknown>;

		if (
			record.type === "assistant.message" &&
			typeof dataRecord.content === "string" &&
			dataRecord.content.length > 0
		) {
			combined += `${dataRecord.content}\n`;
		}

		const content = dataRecord.content;
		if (Array.isArray(content)) {
			for (const block of content) {
				if (typeof block !== "object" || block === null) {
					continue;
				}
				const blockRecord = block as Record<string, unknown>;
				if (
					blockRecord.type === "text" &&
					typeof blockRecord.text === "string"
				) {
					combined += `${blockRecord.text}\n`;
				}
			}
		}
	}
	return combined.trim();
}

/**
 * Schema-tolerant transcript parser covering a single JSON result object and
 * JSONL event streams. Validated against a real Copilot CLI transcript in
 * docs/plans/2026-09-09-agent-behavioral-testing-paradigm.md Phase 2; Claude
 * support remains best-effort pending a real captured transcript.
 */
export function parseCliTranscript(rawOutput: string): EvalTranscript {
	const events = extractJsonEvents(rawOutput);
	return {
		filesAccessed: extractFilesAccessed(events),
		responseText: extractResponseText(events),
	};
}
