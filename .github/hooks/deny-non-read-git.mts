import {
	READ_ONLY_PATH_TOOLS,
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
	runCli,
	splitShellStatements,
	tokenizeStatement,
} from "./deny-non-read-git.js";

export {
	READ_ONLY_PATH_TOOLS,
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
	runCli,
	splitShellStatements,
	tokenizeStatement,
};

if (process.argv[1]?.endsWith("deny-non-read-git.mts")) {
	runCli();
}
