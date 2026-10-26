export function checkCommandPaths(
	command: string,
	context?: {
		readonly cwd?: string;
		readonly transcriptPath?: string;
		readonly workspaceRoots?: readonly string[];
	},
): string | null;
export function checkToolInputPaths(
	toolInput: unknown,
	toolName?: string,
	context?: {
		readonly cwd?: string;
		readonly transcriptPath?: string;
		readonly workspaceRoots?: readonly string[];
	},
): string | null;
export function isTemporaryPath(value: string): boolean;
export function checkWorkspacePolicy(
	command: string,
	context?: {
		readonly cwd?: string;
		readonly transcriptPath?: string;
		readonly workspaceRoots?: readonly string[];
	},
): string | null;
