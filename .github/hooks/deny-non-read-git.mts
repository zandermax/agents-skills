import {
	checkCommandForNonReadGit,
	checkGitCommandTokens,
	splitShellStatements,
	tokenizeStatement,
} from "./deny-non-read-git.js";
import { evaluateToolUse, runCli } from "./pre-tool-safety.js";
import { checkToolInputPaths } from "./pre-tool-safety-workspace.js";

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
