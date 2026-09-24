export interface ToolEvaluationResult {
	readonly decision: "allow" | "ask" | "deny";
	readonly reason?: string;
}

export function splitShellStatements(cmdLine: string): string[];
export function tokenizeStatement(statement: string): string[];
export function checkGitCommandTokens(tokens: readonly string[]): string | null;
export function checkCommandForNonReadGit(fullCommand: string): string | null;
export function checkToolInputPaths(toolInput: unknown): string | null;
export function checkCommandPaths(command: string): string | null;
export function evaluateToolUse(
	toolName: string | undefined,
	toolInput: unknown,
): ToolEvaluationResult;

export function runCli(): void;
