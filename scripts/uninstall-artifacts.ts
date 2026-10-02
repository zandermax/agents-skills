import { runCli } from "./install-artifacts.js";

runCli(process.argv.slice(2), "uninstall").catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
