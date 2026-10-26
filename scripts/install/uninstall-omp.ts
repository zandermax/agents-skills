import { runCli } from "./install-omp.js";

runCli("uninstall").catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
