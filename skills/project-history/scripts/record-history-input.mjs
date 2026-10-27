// @ts-check

import { resolve } from "node:path";
import { parseHistoryData } from "./history-document-data.mjs";
import { readDocument } from "./history-document-io.mjs";
/** @typedef {import("./check-project-history.mjs").BranchRecord} BranchRecord */
/** @typedef {import("./check-project-history.mjs").CommitRecord} CommitRecord */
import { parseLogDocument } from "./history-domain-log.mjs";
import { readReachableGitCommits } from "./record-history-helpers.mjs";

const historyPath = "PROJECT_HISTORY.yaml";

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
		source = readDocument(root, null, historyPath);
	} catch (error) {
		throw new Error(
			`Cannot read ${historyPath} in ${root}: ${error instanceof Error ? error.message : String(error)}. Initialize it before recording history.`,
		);
	}

	const {
		mainBranch,
		threshold,
		branchRecords: oldBranchRecords,
	} = parseHistoryData(source, historyPath);
	const hasUnrecordedNote =
		/commits prior to [^\n]* do not have recorded/i.test(source);

	const logDoc = parseLogDocument(source, historyPath);
	/** @type {CommitRecord[]} */
	const existingEntries = [];
	if (logDoc.domainPaths) {
		for (const domainPath of logDoc.domainPaths) {
			const domainText = readDocument(root, null, domainPath);
			const domainDoc = parseLogDocument(domainText, domainPath);
			if (!domainDoc.entries)
				throw new Error(`${domainPath} must contain inline log entries`);
			existingEntries.push(...domainDoc.entries);
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
