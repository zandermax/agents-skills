// @ts-check

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	findRepositoryRoot,
	runGit,
	syncHistory,
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

		// Check if HEAD has unrecorded commits or stale history; if so, sync and amend
		try {
			validateHistory(root, { treeRef: "HEAD" });
		} catch {
			const { modified, filesToStage } = syncHistory(root);
			if (modified) {
				try {
					runGit(["add", ...filesToStage], { cwd: root });
					const headSec = runGit(["log", "-1", "--format=%ct", "HEAD"], {
						cwd: root,
					}).trim();
					const headDate = new Date(Number(headSec) * 1000)
						.toISOString()
						.replace(/\.000Z$/, "Z");
					runGit(["commit", "--amend", "--no-edit"], {
						cwd: root,
						env: {
							...process.env,
							PROJECT_HISTORY_AMENDING: "1",
							GIT_COMMITTER_DATE: headDate,
						},
					});
				} catch {}
			}
		}

		let validation;
		try {
			validation = validateHistory(root, { treeRef: "HEAD" });
		} catch {
			validation = validateHistory(root);
		}
		const { mainBranch, branchRecords } = validation;

		const isPushingToMain = updates.some(
			(update) =>
				!update.deletion &&
				(update.localRef === `refs/heads/${mainBranch}` ||
					update.remoteRef === `refs/heads/${mainBranch}` ||
					update.remoteRef === mainBranch),
		);

		if (isPushingToMain) {
			/** @type {string[]} */
			const otherBranchesWithUnpushed = [""];
			otherBranchesWithUnpushed.pop();

			for (const record of branchRecords) {
				const baseName = record.ref.replace(
					/^refs\/(?:remotes\/[^/]+\/|heads\/)/,
					"",
				);
				if (
					baseName !== mainBranch &&
					record.status !== "removal candidate" &&
					record.branchName.endsWith(" [unpushed changes]")
				) {
					const beingPushed = updates.some(
						(u) =>
							!u.deletion &&
							(u.localRef === `refs/heads/${baseName}` ||
								u.remoteRef === `refs/heads/${baseName}` ||
								u.remoteRef === baseName),
					);
					if (!beingPushed && !otherBranchesWithUnpushed.includes(baseName)) {
						otherBranchesWithUnpushed.push(baseName);
					}
				}
			}

			try {
				const localOutput = runGit(
					["for-each-ref", "--format=%(refname)", "refs/heads"],
					{
						cwd: root,
					},
				);
				for (const localRef of localOutput.split("\n")) {
					if (!localRef?.startsWith("refs/heads/")) continue;
					const name = localRef.slice("refs/heads/".length);
					if (name === mainBranch) continue;
					const record = branchRecords.find(
						(r) =>
							r.ref === localRef ||
							r.ref === `refs/remotes/origin/${name}` ||
							r.ref.endsWith(`/${name}`),
					);
					if (record && record.status === "removal candidate") continue;

					const isMerged =
						spawnSync(
							"git",
							[
								"merge-base",
								"--is-ancestor",
								localRef,
								`refs/heads/${mainBranch}`,
							],
							{ cwd: root },
						).status === 0;
					if (isMerged) continue;

					const beingPushed = updates.some(
						(u) =>
							!u.deletion &&
							(u.localRef === localRef ||
								u.remoteRef === localRef ||
								u.remoteRef === name),
					);
					if (beingPushed) continue;
					let hasUnpushed = false;
					try {
						const remoteMatch = runGit(
							["for-each-ref", "--format=%(refname)", `refs/remotes/*/${name}`],
							{ cwd: root },
						).trim();
						if (!remoteMatch) {
							hasUnpushed = true;
						} else {
							const diff = runGit(["rev-list", `${remoteMatch}..${localRef}`], {
								cwd: root,
							}).trim();
							if (diff.length > 0) hasUnpushed = true;
						}
					} catch {
						hasUnpushed = true;
					}
					if (hasUnpushed && !otherBranchesWithUnpushed.includes(name)) {
						otherBranchesWithUnpushed.push(name);
					}
				}
			} catch {}

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
				(record) => record.status === "removal candidate",
			);
			if (removalCandidates.length > 0) {
				process.stderr.write(
					`Note: the following branch(es) are removal candidates and can be deleted:\n`,
				);
				for (const candidate of removalCandidates) {
					process.stderr.write(`  - ${candidate.ref}\n`);
				}
				process.stderr.write(
					"\nRun the following command(s) to delete them:\n\n",
				);
				for (const candidate of removalCandidates) {
					if (candidate.ref.startsWith("refs/heads/")) {
						const name = candidate.ref.slice("refs/heads/".length);
						process.stderr.write(`git branch -d ${name}\n`);
					} else if (candidate.ref.startsWith("refs/remotes/")) {
						const withoutPrefix = candidate.ref.slice("refs/remotes/".length);
						const slash = withoutPrefix.indexOf("/");
						if (slash > 0) {
							const remote = withoutPrefix.slice(0, slash);
							const name = withoutPrefix.slice(slash + 1);
							process.stderr.write(`git push ${remote} --delete ${name}\n`);
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
