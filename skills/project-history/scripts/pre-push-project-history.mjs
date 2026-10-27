// @ts-check

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	findRepositoryRoot,
	readActualBranches,
	runGit,
	validateHistory,
} from "./check-project-history.mjs";

/**
 * @typedef {Object} RefUpdate
 * @property {boolean} deletion
 * @property {string} localRef
 * @property {string} remoteRef
 */

/**
 * @param {string} ref
 * @param {number} lineNumber
 * @returns {void}
 */
function ensureValidRef(ref, lineNumber) {
	const result = spawnSync("git", ["check-ref-format", ref], {
		cwd: process.cwd(),
		encoding: "utf8",
	});
	if (result.error)
		throw new Error(
			`Could not validate ref on input line ${lineNumber}: ${result.error.message}`,
		);
	if (result.status !== 0) {
		throw new Error(
			`Malformed ref name ${ref} on pre-push input line ${lineNumber}`,
		);
	}
}

/**
 * @param {string} input
 * @returns {RefUpdate[]}
 */
function parseUpdates(input) {
	if (input.length === 0) return [];
	const lines = input.split(/\r?\n/);
	if (lines.at(-1) === "") lines.pop();
	/** @type {RefUpdate[]} */
	const updates = [];
	for (const [index, line] of lines.entries()) {
		const fields = line.trim().split(/\s+/);
		if (fields.length !== 4 || fields.some((field) => !field)) {
			throw new Error(
				`Malformed pre-push ref update on input line ${index + 1}`,
			);
		}
		const [localRef, localObject, remoteRef, remoteObject] = fields;
		if (
			!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(localObject) ||
			!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(remoteObject) ||
			localObject.length !== remoteObject.length
		) {
			throw new Error(
				`Malformed object ID in pre-push ref update on input line ${index + 1}`,
			);
		}
		const localIsZero = /^0+$/.test(localObject);
		if ((localRef === "(delete)") !== localIsZero) {
			throw new Error(
				`Malformed deletion ref update on input line ${index + 1}`,
			);
		}
		if (localRef !== "(delete)") {
			if (!localRef.startsWith("refs/")) {
				throw new Error(
					`Malformed local ref name in pre-push update on input line ${index + 1}`,
				);
			}
			ensureValidRef(localRef, index + 1);
		}
		if (!remoteRef.startsWith("refs/")) {
			throw new Error(
				`Malformed remote ref name in pre-push update on input line ${index + 1}`,
			);
		}
		ensureValidRef(remoteRef, index + 1);
		updates.push({
			deletion: localRef === "(delete)",
			localRef,
			remoteRef,
		});
	}
	return updates;
}

/**
 * @returns {void}
 */
function runPrePush() {
	const [remoteName, remoteUrl, ...extraArgs] = process.argv.slice(2);
	if (!remoteName || !remoteUrl || extraArgs.length > 0) {
		process.stderr.write(
			"Usage: node pre-push-project-history.mjs <remote-name> <remote-url>\n",
		);
		process.exitCode = 1;
		return;
	}
	try {
		const updates = parseUpdates(readFileSync(0, "utf8"));
		if (updates.length === 0 || updates.every((update) => update.deletion))
			return;
		const root = findRepositoryRoot();

		const { mainBranch, branchRecords, advisories } = validateHistory(root, {
			treeRef: "HEAD",
		});
		for (const advisory of advisories) {
			process.stderr.write(
				`Advisory: ${advisory}; refresh on the next explicit history recording.\n`,
			);
		}

		const isPushingToMain = updates.some(
			(update) =>
				!update.deletion &&
				(update.localRef === `refs/heads/${mainBranch}` ||
					update.remoteRef === `refs/heads/${mainBranch}` ||
					update.remoteRef === mainBranch),
		);

		if (isPushingToMain) {
			/** @type {string[]} */
			const otherBranchesWithUnpushed = [];
			const actualBranches = readActualBranches(root);
			const localOutput = runGit(
				["for-each-ref", "--format=%(refname)", "refs/heads"],
				{ cwd: root },
			);
			const localRefs = localOutput.trim().split("\n");
			const mainRef = localRefs.includes(`refs/heads/${mainBranch}`)
				? `refs/heads/${mainBranch}`
				: `refs/remotes/${remoteName}/${mainBranch}`;
			if (!localRefs.includes(mainRef) && !actualBranches.has(mainRef)) {
				process.stderr.write(
					`Advisory: main ref ${mainRef} is unavailable; skipping ancestry-based branch advice.\n`,
				);
				return;
			}
			for (const localRef of localRefs) {
				if (!localRef.startsWith("refs/heads/")) continue;
				const name = localRef.slice("refs/heads/".length);
				if (name === mainBranch) continue;
				const beingPushed = updates.some(
					(update) => !update.deletion && update.localRef === localRef,
				);
				if (beingPushed) continue;
				const unmerged = runGit(["rev-list", localRef, `^${mainRef}`], {
					cwd: root,
				}).trim();
				if (!unmerged) continue;
				const remoteRef = `refs/remotes/${remoteName}/${name}`;
				if (
					!actualBranches.has(remoteRef) ||
					runGit(["rev-list", `${remoteRef}..${localRef}`], {
						cwd: root,
					}).trim()
				) {
					otherBranchesWithUnpushed.push(name);
				}
			}

			if (otherBranchesWithUnpushed.length > 0) {
				process.stderr.write(
					`Note: the following branch(es) have unpushed changes:\n`,
				);
				for (const name of otherBranchesWithUnpushed) {
					process.stderr.write(`  - ${name}\n`);
				}
				process.stderr.write(
					"\nRemember to push other branch changes when ready.\n\n",
				);
			}

			const removalCandidates = branchRecords.filter(
				(record) =>
					record.status === "removal candidate" &&
					record.ref.replace(/^refs\/remotes\/[^/]+\//, "") !== mainBranch &&
					actualBranches.has(record.ref) &&
					!runGit(["rev-list", record.ref, `^${mainRef}`], {
						cwd: root,
					}).trim(),
			);
			if (removalCandidates.length > 0) {
				process.stderr.write(
					`Note: snapshot removal candidates still present and merged into main:\n`,
				);
				for (const candidate of removalCandidates) {
					process.stderr.write(`  - ${candidate.ref}\n`);
				}
				process.stderr.write(
					"\nRun the following command(s) to delete them:\n\n",
				);
				for (const candidate of removalCandidates) {
					if (candidate.ref.startsWith("refs/remotes/")) {
						const withoutPrefix = candidate.ref.slice("refs/remotes/".length);
						const slash = withoutPrefix.indexOf("/");
						if (slash > 0) {
							const remote = withoutPrefix.slice(0, slash);
							const name = withoutPrefix.slice(slash + 1);
							const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
							process.stderr.write(
								`git push ${quote(remote)} --delete ${quote(name)}\n`,
							);
						}
					}
				}
				process.stderr.write("\n");
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		process.stderr.write(`Pre-push project-history check failed: ${message}\n`);
		process.stderr.write(
			`Run 'node scripts/project-history/record-history.mjs' to record project history before pushing.\n`,
		);
		process.exitCode = 1;
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	runPrePush();
}
