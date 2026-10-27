// @ts-check

import { parseHistoryData } from "./history-document-data.mjs";
import { readDocument } from "./history-document-io.mjs";
import { findRepositoryRoot } from "./history-git.mjs";
import {
	buildUpdatedBranchRecords,
	writeHistoryState,
} from "./record-history-helpers.mjs";
import { readRecordState } from "./record-history-input.mjs";

const historyPath = "PROJECT_HISTORY.yaml";

/**
 * Synchronize unrecorded commits and branch inventory into the YAML ledger.
 * @param {string} root
 * @returns {{ addedCount: number, modified: boolean, filesToStage: string[] }}
 */
export function syncHistory(root = findRepositoryRoot()) {
	const state = readRecordState(root);
	const {
		mainBranch,
		threshold,
		oldBranchRecords,
		existingEntries,
		unrecordedEntries,
		logDoc,
	} = state;
	const paths = [historyPath, ...(logDoc.domainPaths ?? [])];
	const before = new Map(
		paths.map((path) => [path, readDocument(root, null, path)]),
	);
	const entries = [...unrecordedEntries, ...existingEntries].sort((a, b) =>
		b.committedAt.localeCompare(a.committedAt),
	);
	const updatedAt =
		entries[0]?.committedAt ??
		parseHistoryData(state.source, historyPath).updatedAt;
	const branches = buildUpdatedBranchRecords(
		root,
		oldBranchRecords,
		mainBranch,
		"",
		"",
	);
	const filesToStage = writeHistoryState(
		root,
		logDoc.domainPaths,
		undefined,
		unrecordedEntries,
		state.sourcePath,
		updatedAt,
		mainBranch,
		threshold,
		branches,
		state.hasUnrecordedNote,
		entries,
		historyPath,
	);
	const modified = filesToStage.some(
		(path) => before.get(path) !== readDocument(root, null, path),
	);
	return { addedCount: unrecordedEntries.length, modified, filesToStage };
}
