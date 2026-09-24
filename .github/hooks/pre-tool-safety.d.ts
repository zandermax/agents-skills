export interface ToolEvaluationResult {
	readonly decision: "allow" | "ask" | "deny";
	readonly reason?: string;
}

export function evaluateToolUse(
	toolName: string | undefined,
	toolInput: unknown,
): ToolEvaluationResult;

export function runCli(): void;
