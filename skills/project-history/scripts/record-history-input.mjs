// @ts-check

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
/** @typedef {import("./check-project-history.mjs").BranchRecord} BranchRecord */
/** @typedef {import("./check-project-history.mjs").CommitRecord} CommitRecord */
import {
	parseLogDocument,
	parseRecords,
	parseThreshold,
	readMainBranch,
	sectionBounds,
} from "./check-project-history.mjs";
import { readReachableGitCommits } from "./record-history-helpers.mjs";

const historyPath = "PROJECT_HISTORY.md";

/**
 * @param {string} root
 * @returns {{
 *   sourcePath: string,
 *   source: string,
 *   mainBranch: string,
 *   threshold: number,
 *   hasUnrecordedNote: boolean,
 *   oldBranchRecords: BranchRecord[],
 *   logDoc: ReturnType<typeof parseLogDocument>,
 *   existingEntries: CommitRecord[],
 *   unrecordedEntries: CommitRecord[]
 * }}
 */
export function readRecordState(root) {
	const sourcePath = resolve(root, historyPath);
	let source;
	try {
		source = readFileSync(sourcePath, "utf8");
	} catch {
		throw new Error(
			`${historyPath} not found in ${root}. Please initialize ${historyPath} before recording history.`,
		);
	}

	const { status } = sectionBounds(source, historyPath);
	const mainBranch = readMainBranch(status, historyPath);
	const threshold = parseThreshold(status, historyPath);
	const hasUnrecordedNote =
		/commits prior to [^\n]* do not have recorded/i.test(source);

	/** @type {BranchRecord[]} */
	const oldBranchRecords = parseRecords(status, historyPath, [
		"branchName",
		"committedAt",
		"subject",
		"status",
		"planningDoc",
		"ref",
	]);

	const logDoc = parseLogDocument(source, historyPath);
	/** @type {CommitRecord[]} */
	const existingEntries = [];
	if (logDoc.domainPaths) {
		for (const domainPath of logDoc.domainPaths) {
			const fullDomainPath = resolve(root, domainPath);
			if (existsSync(fullDomainPath)) {
				const domainText = readFileSync(fullDomainPath, "utf8");
				const domainDoc = parseLogDocument(domainText, domainPath);
				if (domainDoc.entries) {
					existingEntries.push(...domainDoc.entries);
				}
			}
		}
	} else if (logDoc.entries) {
		existingEntries.push(...logDoc.entries);
	}

	let oldestRecordedCommittedAt = "";
	if (hasUnrecordedNote && existingEntries.length > 0) {
		oldestRecordedCommittedAt = existingEntries.reduce(
			(oldest, entry) =>
				entry.committedAt < oldest ? entry.committedAt : oldest,
			existingEntries[0].committedAt,
		);
	}

	const reachableCommits = readReachableGitCommits(root);
	const recordedCounts = new Map();
	for (const entry of existingEntries) {
		const key = JSON.stringify([entry.committedAt, entry.subject]);
		recordedCounts.set(key, (recordedCounts.get(key) ?? 0) + 1);
	}

	/** @type {CommitRecord[]} */
	const unrecordedEntries = [];
	for (const commit of reachableCommits) {
		if (
			hasUnrecordedNote &&
			oldestRecordedCommittedAt &&
			commit.committedAt < oldestRecordedCommittedAt
		) {
			continue;
		}
		const key = JSON.stringify([commit.committedAt, commit.subject]);
		const remaining = recordedCounts.get(key) ?? 0;
		if (remaining > 0) {
			recordedCounts.set(key, remaining - 1);
		} else {
			unrecordedEntries.push({
				committedAt: commit.committedAt,
				subject: commit.subject,
				decisions: [],
			});
		}
	}
	return {
		sourcePath,
		source,
		mainBranch,
		threshold,
		hasUnrecordedNote,
		oldBranchRecords,
		logDoc,
		existingEntries,
		unrecordedEntries,
	};
}
