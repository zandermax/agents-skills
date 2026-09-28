import {
	formatDateTimeSlug,
	recordToolExecution,
	resolveShadowLogPath,
	runCli,
} from "./post-tool-recorder.js";

export {
	formatDateTimeSlug,
	recordToolExecution,
	resolveShadowLogPath,
	runCli,
};

if (process.argv[1]?.endsWith("post-tool-recorder.mts")) {
	runCli();
}
