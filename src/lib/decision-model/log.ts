import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

import type { ToolSafetyDecision } from "./client.js";

export function sessionIdFromTranscriptPath(
	transcriptPath: string | null | undefined,
): string | null {
	if (!transcriptPath) {
		return null;
	}
	const base = basename(transcriptPath).replace(/\.(jsonl|json)$/i, "");
	return base.trim() ? base : null;
}

export function sessionLogFileName(sessionId: string): string {
	const safe = sessionId
		.replace(/[^A-Za-z0-9._-]+/g, "_")
		.replace(/^\.+/, "")
		.slice(0, 120);
	return `${safe || "unknown"}.jsonl`;
}

export function defaultShadowLogPath(
	sessionId?: string | null,
	now: Date = new Date(),
): string {
	const id = sessionId?.trim()
		? sessionId.trim()
		: `unknown-${now.toISOString().slice(0, 10)}`;
	return join(homedir(), ".decisions", "sessions", sessionLogFileName(id));
}

export interface ShadowLogRecord {
	readonly timestamp: string;
	readonly cwd: string;
	readonly model: string;
	readonly rawChoice: ToolSafetyDecision["rawChoice"];
	readonly decision: ToolSafetyDecision["decision"];
	readonly confidence: number | null;
	readonly inputTokens: number | null;
	readonly outputTokens: number | null;
	readonly promptTokens: number | null;
	readonly baselineTokens: number | null;
	readonly error: string | null;
	readonly toolName: string | null;
	readonly hookDecision: string | null;
	readonly hookReason: string | null;
	readonly hookLatencyMs: number | null;
	readonly shadowLatencyMs: number | null;
	readonly userResolution: "deferred" | null;
}

export function createShadowLogRecord(
	decision: ToolSafetyDecision,
	options: {
		readonly cwd?: string;
		readonly timestamp?: string;
		readonly baselineTokens?: number | null;
		readonly toolName?: string | null;
		readonly hookDecision?: string | null;
		readonly hookReason?: string | null;
		readonly hookLatencyMs?: number | null;
		readonly shadowLatencyMs?: number | null;
		readonly userResolution?: "deferred" | null;
	} = {},
): ShadowLogRecord {
	return {
		timestamp: options.timestamp ?? new Date().toISOString(),
		cwd: options.cwd ?? process.cwd(),
		model: decision.model,
		rawChoice: decision.rawChoice,
		decision: decision.decision,
		confidence: decision.confidence,
		inputTokens: decision.inputTokens,
		outputTokens: decision.outputTokens,
		promptTokens: decision.promptTokens,
		baselineTokens: options.baselineTokens ?? null,
		error: decision.error,
		toolName: options.toolName ?? null,
		hookDecision: options.hookDecision ?? null,
		hookReason: options.hookReason ?? null,
		hookLatencyMs: options.hookLatencyMs ?? null,
		shadowLatencyMs: options.shadowLatencyMs ?? null,
		userResolution: options.userResolution ?? null,
	};
}

export async function appendShadowRecord(
	record: ShadowLogRecord,
	logPath: string = defaultShadowLogPath(),
): Promise<boolean> {
	try {
		await mkdir(dirname(logPath), { recursive: true });
		await appendFile(logPath, `${JSON.stringify(record)}\n`, "utf8");
		return true;
	} catch {
		return false;
	}
}
