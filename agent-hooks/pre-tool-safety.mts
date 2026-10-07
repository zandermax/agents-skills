/**
 * TypeScript entrypoint for the PreToolUse safety hook. Re-exports evaluateToolUse and runCli
 * from pre-tool-safety.js and invokes runCli() when executed directly.
 *
 * pre-tool-safety.js parses JSON hook input from stdin, checks tool parameters and commands
 * against GitHub mutations, out-of-workspace file paths, and disallowed git subcommands, and outputs
 * the hook decision ("allow" or "ask" with user prompt explanation).
 */
import { evaluateToolUse, runCli } from "./pre-tool-safety.js";

export { evaluateToolUse, runCli };

if (process.argv[1]?.endsWith("pre-tool-safety.mts")) {
	runCli();
}
