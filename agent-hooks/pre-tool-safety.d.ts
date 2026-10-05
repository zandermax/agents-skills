import type { spawn } from "node:child_process";

export interface ToolEvaluationResult {
	readonly decision: "allow" | "ask" | "deny";
	readonly reason?: string;
}

export function evaluateToolUse(
	toolName: string | undefined,
	toolInput: unknown,
	context?: {
		readonly cwd?: string;
		readonly transcriptPath?: string;
		readonly workspaceRoots?: readonly string[];
	},
): ToolEvaluationResult;

export function runCli(): void;

export function dispatchShadowEvaluation(
	payload: Record<string, unknown>,
	spawnImpl?: typeof spawn,
): boolean;
