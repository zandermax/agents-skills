// @ts-check

import { parseHistoryData } from "./history-document-data.mjs";
import { readDocument } from "./history-document-io.mjs";
import { parseThreshold, parseYamlMapping } from "./history-document-parse.mjs";
import { parseLogDocument } from "./history-domain-log.mjs";
import {
	validateBranchRecords,
	validateReachableEntries,
	validateRecordDatesAndOrder,
} from "./history-entry-validation.mjs";
/** @typedef {import("./history-git.mjs").BranchRecord} BranchRecord */
/** @typedef {import("./history-git.mjs").CommitRecord} CommitRecord */
/** @typedef {import("./history-git.mjs").StartupWarningCallback} StartupWarningCallback */
/** @typedef {import("./history-git.mjs").ValidationResult} ValidationResult */
import {
	ensureHead,
	readActualBranches,
	readReachableCommits,
} from "./history-git.mjs";

const historyPath = "PROJECT_HISTORY.yaml";

/**
 * @param {string} text
 * @returns {number | null}
 */
function peekStartupThreshold(text) {
	try {
		return parseThreshold(
			parseYamlMapping(text, historyPath).status,
			historyPath,
		);
	} catch {
		return null;
	}
}

/**
 * @param {string} root
 * @param {{ treeRef?: string | null, onStartupWarning?: StartupWarningCallback | null }} [options]
 * @returns {ValidationResult}
 */
export function validateHistory(
	root,
	{ treeRef = null, onStartupWarning = null } = {},
) {
	ensureHead(root);
	const actualBranches = readActualBranches(root);
	const source = readDocument(root, treeRef, historyPath);
	const thresholdForWarning = onStartupWarning
		? peekStartupThreshold(source)
		: null;
	if (
		thresholdForWarning !== null &&
		actualBranches.size > thresholdForWarning
	) {
		onStartupWarning?.(actualBranches.size, thresholdForWarning);
	}

	const { updatedAt, mainBranch, threshold, branchRecords } = parseHistoryData(
		source,
		historyPath,
	);
	const advisories = validateBranchRecords(
		branchRecords,
		actualBranches,
		historyPath,
	);

	const index = parseLogDocument(source, historyPath);
	/** @type {CommitRecord[]} */
	const allEntries = [];
	if (index.domainPaths) {
		for (const path of index.domainPaths) {
			const domainText = readDocument(root, treeRef, path);
			const result = parseLogDocument(domainText, path);
			if (result.domainPaths || !result.entries) {
				throw new Error(
					`${path} must contain inline log entries, not another Domains list`,
				);
			}
			validateRecordDatesAndOrder(result.entries, path);
			allEntries.push(...result.entries);
		}
	} else if (index.entries) {
		validateRecordDatesAndOrder(index.entries, historyPath);
		allEntries.push(...index.entries);
	}
	if (allEntries.length === 0)
		throw new Error(
			`${historyPath} Log must contain at least one decision entry`,
		);

	const newest = allEntries.reduce(
		(latest, entry) =>
			entry.committedAt > latest ? entry.committedAt : latest,
		allEntries[0].committedAt,
	);
	if (updatedAt !== newest) {
		throw new Error(
			`${historyPath} updated_at must equal the newest log timestamp (${newest})`,
		);
	}
	const allowUnrecordedPriorCommits =
		/commits prior to [^\n]* do not have recorded/i.test(source);
	validateReachableEntries(
		allEntries,
		readReachableCommits(root),
		historyPath,
		allowUnrecordedPriorCommits,
	);
	return {
		branchCount: actualBranches.size,
		threshold,
		mainBranch,
		branchRecords,
		advisories,
	};
}
