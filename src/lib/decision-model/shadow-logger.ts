import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { appendFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ShadowLogEvent, ToolDecisionResult } from "./types.js";

export const DEFAULT_SHADOW_LOG_DIR = path.join(os.homedir(), ".decisions");
export const DEFAULT_SHADOW_LOG_ARCHIVE_DIR = path.join(
	DEFAULT_SHADOW_LOG_DIR,
	"archive",
);
export const DEFAULT_SHADOW_LOG_SESSIONS_DIR = path.join(
	DEFAULT_SHADOW_LOG_DIR,
	".sessions",
);

export const DEFAULT_SHADOW_LOG_PATH = path.join(
	DEFAULT_SHADOW_LOG_DIR,
	"shadow.jsonl",
);

export function formatDateTimeSlug(date: Date = new Date()): string {
	return date.toISOString().replace(/[:.]/g, "-");
}

export function resolveShadowLogPath(
	sessionId?: string | undefined,
	options?: {
		readonly baseDir?: string | undefined;
		readonly now?: Date | undefined;
	},
): string {
	if (
		process.env.SHADOW_LOG_PATH &&
		process.env.SHADOW_LOG_PATH.trim().length > 0
	) {
		return process.env.SHADOW_LOG_PATH.trim();
	}

	const baseDir = options?.baseDir ?? DEFAULT_SHADOW_LOG_DIR;
	const sessionsDir = path.join(baseDir, ".sessions");

	try {
		mkdirSync(sessionsDir, { recursive: true });

		if (sessionId && sessionId.trim().length > 0) {
			const safeSessionId = sessionId.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
			const sessionFile = path.join(sessionsDir, `${safeSessionId}.txt`);

			if (existsSync(sessionFile)) {
				const existing = readFileSync(sessionFile, "utf8").trim();
				if (existing.length > 0) {
					return existing;
				}
			}

			const timestamp = formatDateTimeSlug(options?.now);
			const newRunPath = path.join(baseDir, `${timestamp}_shadow.jsonl`);
			try {
				writeFileSync(sessionFile, `${newRunPath}\n`, {
					encoding: "utf8",
					flag: "wx",
				});
				return newRunPath;
			} catch (writeErr: unknown) {
				if (
					writeErr &&
					typeof writeErr === "object" &&
					"code" in writeErr &&
					writeErr.code === "EEXIST"
				) {
					const existing = readFileSync(sessionFile, "utf8").trim();
					if (existing.length > 0) {
						return existing;
					}
				}
			}
			return newRunPath;
		}

		const latestPointerFile = path.join(sessionsDir, "latest_session.txt");
		if (existsSync(latestPointerFile)) {
			const candidatePath = readFileSync(latestPointerFile, "utf8").trim();
			if (candidatePath.length > 0 && existsSync(candidatePath)) {
				return candidatePath;
			}
		}

		const timestamp = formatDateTimeSlug(options?.now);
		const newRunPath = path.join(baseDir, `${timestamp}_shadow.jsonl`);
		try {
			writeFileSync(latestPointerFile, `${newRunPath}\n`, "utf8");
		} catch {
			// ignore fail-safe
		}
		return newRunPath;
	} catch {
		const timestamp = formatDateTimeSlug(options?.now);
		return path.join(baseDir, `${timestamp}_shadow.jsonl`);
	}
}

export interface LogShadowDecisionParams {
	readonly toolName: string;
	readonly toolInput: unknown;
	readonly result: ToolDecisionResult;
	readonly toolUseId?: string | undefined;
	readonly sessionId?: string | undefined;
	readonly actualPermissionDecision?: "allow" | "ask" | "deny" | undefined;
	readonly userOutcome?:
		| "approved"
		| "rejected"
		| "skipped"
		| "unspecified"
		| undefined;
	readonly llmBaselineTokens?:
		| {
				readonly inputTokens?: number | undefined;
				readonly outputTokens?: number | undefined;
		  }
		| undefined;
	readonly logFilePath?: string | undefined;
}

export function formatShadowLogEvent(
	params: LogShadowDecisionParams,
): ShadowLogEvent {
	const rawSnippet =
		typeof params.toolInput === "string"
			? params.toolInput
			: JSON.stringify(params.toolInput ?? null);
	const toolInputSnippet =
		rawSnippet.length > 300 ? `${rawSnippet.slice(0, 300)}...` : rawSnippet;

	return {
		timestamp: new Date().toISOString(),
		toolName: params.toolName,
		toolInputSnippet,
		model: params.result.model,
		shadowDecision: params.result.decision,
		rawChoice: params.result.rawChoice,
		confidence: params.result.confidence,
		probabilities: params.result.probabilities,
		thresholdApplied: params.result.thresholdApplied,
		inputTokens: params.result.inputTokens,
		outputTokens: params.result.outputTokens,
		latencyMs: params.result.latencyMs,
		toolUseId: params.toolUseId,
		sessionId: params.sessionId,
		actualPermissionDecision: params.actualPermissionDecision,
		userOutcome: params.userOutcome,
		llmBaselineTokens: params.llmBaselineTokens,
	};
}

export async function logShadowDecision(
	params: LogShadowDecisionParams,
): Promise<boolean> {
	try {
		const targetPath =
			params.logFilePath ?? resolveShadowLogPath(params.sessionId);
		const event = formatShadowLogEvent(params);
		const line = `${JSON.stringify(event)}\n`;

		await mkdir(path.dirname(targetPath), { recursive: true });
		await appendFile(targetPath, line, "utf8");
		return true;
	} catch {
		// Non-blocking fail-safe: never throw or bubble error
		return false;
	}
}

export async function logToolExecution(params: {
	readonly toolUseId: string;
	readonly toolName?: string | undefined;
	readonly sessionId?: string | undefined;
	readonly logFilePath?: string | undefined;
}): Promise<boolean> {
	try {
		const targetPath =
			params.logFilePath ?? resolveShadowLogPath(params.sessionId);
		const event = {
			type: "tool_execution" as const,
			timestamp: new Date().toISOString(),
			toolUseId: params.toolUseId,
			toolName: params.toolName,
			sessionId: params.sessionId,
			status: "executed" as const,
		};
		const line = `${JSON.stringify(event)}\n`;

		await mkdir(path.dirname(targetPath), { recursive: true });
		await appendFile(targetPath, line, "utf8");
		return true;
	} catch {
		// Non-blocking fail-safe: never throw or bubble error
		return false;
	}
}
