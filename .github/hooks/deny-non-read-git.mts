import {
	canonicalPath,
	checkCommandForNonReadGit,
	checkCommandPaths,
	checkGitCommandTokens,
	expandPath,
	isApprovedExternalReadPath,
	isExternalPath,
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
