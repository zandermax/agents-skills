import { evaluateToolUse, runCli } from "./pre-tool-safety.js";

export { evaluateToolUse, runCli };

if (process.argv[1]?.endsWith("pre-tool-safety.mts")) {
	runCli();
}
