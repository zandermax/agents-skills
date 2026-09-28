import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { ShadowLogEvent, ToolDecisionResult } from "./types.js";

export const DEFAULT_SHADOW_LOG_PATH = path.join(
	process.cwd(),
	"results",
	"tool-decisions",
	"shadow.jsonl",
);

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
		const targetPath = params.logFilePath ?? DEFAULT_SHADOW_LOG_PATH;
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
		const targetPath = params.logFilePath ?? DEFAULT_SHADOW_LOG_PATH;
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
