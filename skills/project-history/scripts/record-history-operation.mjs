// @ts-check

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
	findRepositoryRoot,
	runGit,
	validateHistory,
} from "./check-project-history.mjs";
/** @typedef {import("./check-project-history.mjs").BranchRecord} BranchRecord */
/** @typedef {import("./check-project-history.mjs").CommitRecord} CommitRecord */
import {
	buildUpdatedBranchRecords,
	writeHistoryState,
} from "./record-history-helpers.mjs";
import { readRecordState } from "./record-history-input.mjs";

const historyPath = "PROJECT_HISTORY.md";

/**
 * @param {string} root
 * @param {{ subject?: string, decision?: string, decisions?: string[], domain?: string, noCommit?: boolean, amend?: boolean }} [options]
 * @returns {{ commitHash?: string, committedAt: string, subject: string }}
 */
export function recordHistory(root = findRepositoryRoot(), options = {}) {
	const providedDecisions = Array.isArray(options.decisions)
		? options.decisions
		: options.decision
			? [options.decision]
			: [];

	for (const decision of providedDecisions) {
		if (typeof decision !== "string" || !decision.trim()) {
			throw new Error("Decision must contain non-whitespace text.");
		}
	}

	if (options.amend) {
		if (process.env.PROJECT_HISTORY_AMENDING === "1") {
			return { committedAt: "", subject: "" };
		}
		let gitDir = "";
		try {
			gitDir = runGit(["rev-parse", "--git-dir"], { cwd: root }).trim();
		} catch {
			return { committedAt: "", subject: "" };
		}
		const resolvedGitDir = resolve(root, gitDir);
		if (
			existsSync(resolve(resolvedGitDir, "rebase-merge")) ||
			existsSync(resolve(resolvedGitDir, "rebase-apply")) ||
			existsSync(resolve(resolvedGitDir, "MERGE_HEAD")) ||
			existsSync(resolve(resolvedGitDir, "CHERRY_PICK_HEAD")) ||
			existsSync(resolve(resolvedGitDir, "REVERT_HEAD")) ||
			existsSync(resolve(resolvedGitDir, "BISECT_LOG"))
		) {
			return { committedAt: "", subject: "" };
		}
		try {
			const parents = runGit(["rev-list", "--parents", "-n", "1", "HEAD"], {
				cwd: root,
			})
				.trim()
				.split(/\s+/);
			if (parents.length > 2) {
				return { committedAt: "", subject: "" };
			}
		} catch {
			// HEAD might not exist yet
		}
	}

	const {
		sourcePath,
		mainBranch,
		threshold,
		hasUnrecordedNote,
		oldBranchRecords,
		logDoc,
		existingEntries,
		unrecordedEntries,
	} = readRecordState(root);

	if (
		options.amend &&
		unrecordedEntries.length === 0 &&
		providedDecisions.length === 0
	) {
		return { committedAt: "", subject: "" };
	}

	unrecordedEntries.sort((a, b) => b.committedAt.localeCompare(a.committedAt));

	if (options.amend) {
		const headSubject = runGit(["log", "-1", "--format=%s", "HEAD"], {
			cwd: root,
		}).trim();
		const headSeconds = runGit(["log", "-1", "--format=%ct", "HEAD"], {
			cwd: root,
		}).trim();
		const headCommittedAt = new Date(Number(headSeconds) * 1000)
			.toISOString()
			.replace(/\.000Z$/, "Z");

		for (const d of providedDecisions) {
			if (headSubject && d.toLowerCase().includes(headSubject.toLowerCase())) {
				throw new Error(`Decision must not contain the git message: "${d}"`);
			}
		}

		if (providedDecisions.length > 0) {
			if (unrecordedEntries.length > 0) {
				unrecordedEntries[0].decisions = providedDecisions;
			} else if (existingEntries.length > 0) {
				existingEntries[0].decisions = providedDecisions;
			}
		}

		const updatedEntries = [...unrecordedEntries, ...existingEntries].sort(
			(a, b) => b.committedAt.localeCompare(a.committedAt),
		);
		const maxLogCommittedAt = updatedEntries[0].committedAt;

		const updatedBranchRecords = buildUpdatedBranchRecords(
			root,
			oldBranchRecords,
			mainBranch,
			headCommittedAt,
			headSubject,
		);

		const formattedEntries = updatedEntries.map((e) => {
			const decisions = Array.isArray(e.decisions)
				? e.decisions
				: typeof e.decision === "string"
					? [e.decision]
					: [];
			return {
				committedAt: e.committedAt,
				subject: e.subject,
				decisions,
			};
		});

		const filesToStage = writeHistoryState(
			root,
			logDoc.domainPaths,
			options.domain,
			unrecordedEntries,
			sourcePath,
			maxLogCommittedAt,
			mainBranch,
			threshold,
			updatedBranchRecords,
			hasUnrecordedNote,
			formattedEntries,
			historyPath,
		);

		for (const file of filesToStage) {
			runGit(["add", file], { cwd: root });
		}

		runGit(["commit", "--amend", "--no-edit"], {
			cwd: root,
			env: {
				...process.env,
				PROJECT_HISTORY_AMENDING: "1",
				GIT_COMMITTER_DATE: headCommittedAt,
			},
		});

		const commitHash = runGit(["rev-parse", "HEAD"], { cwd: root }).trim();
		validateHistory(root, { treeRef: "HEAD" });
		return { commitHash, committedAt: headCommittedAt, subject: headSubject };
	}

	const isInitialSetup = existingEntries.length === 0;
	const plannedSubject =
		options.subject ||
		(isInitialSetup
			? "chore: set up project history, branch inventory, and pre-push guard"
			: "chore: update project history");

	for (const d of providedDecisions) {
		if (
			plannedSubject &&
			d.toLowerCase().includes(plannedSubject.toLowerCase())
		) {
			throw new Error(`Decision must not contain the git message: "${d}"`);
		}
	}

	let maxCommittedAt = "";
	for (const entry of [...existingEntries, ...unrecordedEntries]) {
		if (!maxCommittedAt || entry.committedAt > maxCommittedAt) {
			maxCommittedAt = entry.committedAt;
		}
	}

	const maxSec = maxCommittedAt
		? Math.floor(Date.parse(maxCommittedAt) / 1000)
		: 0;
	let sec = Math.floor(Date.now() / 1000);
	if (sec <= maxSec) {
		sec = maxSec + 1;
	}
	const now = new Date(sec * 1000).toISOString().replace(".000Z", "Z");

	/** @type {CommitRecord} */
	const prospectiveCommit = {
		committedAt: now,
		subject: plannedSubject,
		decisions: providedDecisions,
	};

	const updatedEntries = [
		prospectiveCommit,
		...unrecordedEntries,
		...existingEntries,
	].sort((a, b) => b.committedAt.localeCompare(a.committedAt));

	const updatedBranchRecords = buildUpdatedBranchRecords(
		root,
		oldBranchRecords,
		mainBranch,
		now,
		plannedSubject,
	);

	const formattedEntries = updatedEntries.map((e) => {
		const decisions = Array.isArray(e.decisions)
			? e.decisions
			: typeof e.decision === "string"
				? [e.decision]
				: [];
		return {
			committedAt: e.committedAt,
			subject: e.subject,
			decisions,
		};
	});

	const filesToStage = writeHistoryState(
		root,
		logDoc.domainPaths,
		options.domain,
		[prospectiveCommit, ...unrecordedEntries],
		sourcePath,
		now,
		mainBranch,
		threshold,
		updatedBranchRecords,
		hasUnrecordedNote,
		formattedEntries,
		historyPath,
	);

	if (options.noCommit) {
		for (const file of filesToStage) {
			runGit(["add", file], { cwd: root });
		}
		return { committedAt: now, subject: plannedSubject };
	}

	for (const file of filesToStage) {
		runGit(["add", file], { cwd: root });
	}

	runGit(["commit", "-m", plannedSubject], {
		cwd: root,
		env: {
			...process.env,
			GIT_COMMITTER_DATE: now,
		},
	});

	const commitHash = runGit(["rev-parse", "HEAD"], { cwd: root }).trim();

	validateHistory(root, { treeRef: "HEAD" });

	return { commitHash, committedAt: now, subject: plannedSubject };
}
