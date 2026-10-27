// @ts-check

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { findRepositoryRoot, runGit } from "./history-git.mjs";
import { validateHistory } from "./history-validation.mjs";

/** @typedef {import("./history-git.mjs").GitBranchTip} GitBranchTip */
/** @typedef {import("./history-git.mjs").BranchRecord} BranchRecord */
/** @typedef {import("./history-git.mjs").CommitRecord} CommitRecord */
/** @typedef {import("./history-git.mjs").TreeEntry} TreeEntry */
/** @typedef {import("./history-git.mjs").ValidationResult} ValidationResult */
/** @typedef {import("./history-git.mjs").StartupWarningCallback} StartupWarningCallback */

export { parseHistoryData } from "./history-document-data.mjs";
export { formatHistoryDocument } from "./history-document-format.mjs";
export { parseLogDocument } from "./history-domain-log.mjs";
export {
	findRepositoryRoot,
	readActualBranches,
	runGit,
} from "./history-git.mjs";
export { syncHistory } from "./history-sync.mjs";
export { validateHistory };

/**
 * @returns {void}
 */
function runChecker() {
	const args = process.argv.slice(2);
	const startup = args.length === 1 && args[0] === "--startup";
	if (args.length > 0 && !startup) {
		process.stderr.write("Usage: node check-project-history.mjs [--startup]\n");
		process.exitCode = 1;
		return;
	}
	try {
		const root = findRepositoryRoot();
		const status = runGit(["status", "--short", "--branch"], { cwd: root });
		process.stdout.write(status);
		if (status && !status.endsWith("\n")) process.stdout.write("\n");
		const { advisories } = validateHistory(root, {
			onStartupWarning: startup
				? (count, threshold) => {
						process.stderr.write(
							`Warning: actual branch count ${count} exceeds configured threshold ${threshold}.\n`,
						);
					}
				: null,
		});
		for (const advisory of advisories) {
			process.stderr.write(
				`Advisory: ${advisory}; refresh on the next explicit history recording.\n`,
			);
		}
		process.stdout.write("Project history validation passed.\n");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		process.stderr.write(`Project history validation failed: ${message}\n`);
		process.exitCode = 1;
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	runChecker();
}
