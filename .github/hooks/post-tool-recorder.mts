import { recordToolExecution, runCli } from "./post-tool-recorder.js";

export { recordToolExecution, runCli };

if (process.argv[1]?.endsWith("post-tool-recorder.mts")) {
	runCli();
}
