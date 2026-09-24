import {
	checkCommandForNonReadGit,
	checkGitCommandTokens,
	checkToolInputPaths,
	evaluateToolUse,
	runCli,
	splitShellStatements,
	tokenizeStatement,
} from "./deny-non-read-git.js";

export {
	checkCommandForNonReadGit,
	checkGitCommandTokens,
	checkToolInputPaths,
	evaluateToolUse,
	runCli,
	splitShellStatements,
	tokenizeStatement,
};

if (process.argv[1]?.endsWith("deny-non-read-git.mts")) {
	runCli();
}
