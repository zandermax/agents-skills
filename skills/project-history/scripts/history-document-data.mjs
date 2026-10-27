// @ts-check

import {
	parseRecords,
	parseThreshold,
	parseYamlMapping,
	readMainBranch,
	readTimestamp,
} from "./history-document-parse.mjs";
import { parseLogDocument } from "./history-domain-log.mjs";
import {
	validateBranchRecords,
	validateRecordDatesAndOrder,
} from "./history-entry-validation.mjs";

/** @typedef {import("./history-git.mjs").BranchRecord} BranchRecord */

/** @param {string} text @param {string} filename */
export function parseHistoryData(text, filename) {
	const data = parseYamlMapping(text, filename);
	const keys = Object.keys(data);
	if (
		!data.status ||
		typeof data.status !== "object" ||
		Array.isArray(data.status)
	) {
		throw new Error(`${filename} must contain a status mapping`);
	}
	for (const key of ["log", "domains"]) {
		if (keys.includes(key) && keys.indexOf("status") > keys.indexOf(key)) {
			throw new Error(`${filename} must contain status before ${key}`);
		}
	}
	const updatedAt = readTimestamp(data.status, filename);
	const mainBranch = readMainBranch(data.status, filename);
	const threshold = parseThreshold(data.status, filename);
	/** @type {BranchRecord[]} */
	const branchRecords = parseRecords(data.status.branches, filename, [
		"branchName",
		"committedAt",
		"subject",
		"status",
		"planningDoc",
		"ref",
	]);
	validateBranchRecords(
		branchRecords,
		new Map(branchRecords.map((record) => [record.ref, record])),
		filename,
	);
	const index = parseLogDocument(text, filename);
	if (index.entries) validateRecordDatesAndOrder(index.entries, filename);
	return {
		updatedAt,
		mainBranch,
		threshold,
		branchRecords,
		domainPaths: index.domainPaths,
		logEntries: index.entries,
	};
}
