export interface ToolEvaluationResult {
	readonly decision: "allow" | "ask" | "deny";
	readonly reason?: string;
}

export const READ_ONLY_PATH_TOOLS: ReadonlySet<string>;
export function expandPath(value: string): string;
export function canonicalPath(value: string): string;
export function isWithin(
	root: string,
	candidate: string,
	requireDescendant?: boolean,
): boolean;
export function isApprovedExternalReadPath(value: string): boolean;
export function isExternalPath(value: string): boolean;
export function checkToolInputPaths(
	toolInput: unknown,
	toolName?: string,
): string | null;
export function checkCommandPaths(command: string): string | null;

export function splitShellStatements(cmdLine: string): string[];
export function tokenizeStatement(statement: string): string[];
export function checkGitCommandTokens(tokens: readonly string[]): string | null;
export function checkCommandForNonReadGit(fullCommand: string): string | null;
export function evaluateToolUse(
	toolName: string | undefined,
	toolInput: unknown,
): ToolEvaluationResult;

export function runCli(): void;
