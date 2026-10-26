// @ts-check

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { findRepositoryRoot } from "./check-project-history.mjs";
import { parseArgs } from "./record-history-helpers.mjs";
import { recordHistory } from "./record-history-operation.mjs";

export { recordHistory };

const historyPath = "PROJECT_HISTORY.md";

function runCLI() {
	const args = parseArgs(process.argv.slice(2));
	try {
		const root = findRepositoryRoot();
		const result = recordHistory(root, args);
		if (result.commitHash) {
			process.stdout.write(
				`${args.amend ? "Amended" : "Recorded"} project history in commit ${result.commitHash.slice(0, 7)}: "${result.subject}" (${result.committedAt})\n`,
			);
		} else if (result.subject) {
			process.stdout.write(
				`Updated ${historyPath} with prospective commit "${result.subject}" (${result.committedAt})\n`,
			);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		process.stderr.write(`Failed to record project history: ${message}\n`);
		process.exitCode = 1;
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	runCLI();
}
