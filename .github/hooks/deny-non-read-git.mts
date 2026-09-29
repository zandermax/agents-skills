import {
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
	runCli,
	splitShellStatements,
	tokenizeStatement,
} from "./deny-non-read-git.js";

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
	runCli,
	splitShellStatements,
	tokenizeStatement,
};

if (process.argv[1]?.endsWith("deny-non-read-git.mts")) {
	runCli();
}
