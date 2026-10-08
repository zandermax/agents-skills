/**
 * Entrypoint and backward-compatibility module re-exporting git and workspace safety checks
 * from deny-non-read-git.js, pre-tool-safety.js, and pre-tool-safety-workspace.js. When run
 * directly, it delegates to runCli() in pre-tool-safety.js to evaluate tool invocations from stdin.
 *
 * Delegated modules:
 * - deny-non-read-git.js: Implements command tokenization, git policy enforcement (restricting
 *   git commands to read-only subcommands), and workspace boundary checking.
 * - pre-tool-safety.js: Top-level hook coordinator evaluating tool payloads against GitHub mutation,
 *   workspace path, and command safety policies, formatting decisions ("allow" vs "ask").
 * - pre-tool-safety-workspace.js: Policy checker validating tool arguments against workspace paths.
 */
import {
	canonicalPath,
	checkCommandForNonReadGit,
	checkCommandPaths,
	checkGitCommandTokens,
	expandPath,
	isApprovedExternalReadPath,
	isExternalPath,
	isTemporaryPath,
	isWithin,
	READ_ONLY_PATH_TOOLS,
	resolveWorkspaceRoots,
	splitShellStatements,
	tokenizeStatement,
} from "./deny-non-read-git.js";
import { evaluateToolUse, runCli } from "./pre-tool-safety.js";
import { checkToolInputPaths } from "./pre-tool-safety-workspace.js";

export {
	canonicalPath,
	checkCommandForNonReadGit,
	checkCommandPaths,
	checkGitCommandTokens,
	checkToolInputPaths,
	evaluateToolUse,
	expandPath,
	isApprovedExternalReadPath,
	isExternalPath,
	isTemporaryPath,
	isWithin,
	READ_ONLY_PATH_TOOLS,
	resolveWorkspaceRoots,
	runCli,
	splitShellStatements,
	tokenizeStatement,
};

if (process.argv[1]?.endsWith("deny-non-read-git.mts")) {
	runCli();
}
