// @ts-check

import { parse } from "./yaml.mjs";

/** @param {string} text @param {string} filename */
export function parseYamlMapping(text, filename) {
	let data;
	try {
		data = parse(text);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`${filename} is malformed YAML: ${message}`);
	}
	if (!data || typeof data !== "object" || Array.isArray(data)) {
		throw new Error(`${filename} must be a YAML mapping`);
	}
	return data;
}

/** @param {Record<string, unknown>} status @param {string} filename */
export function parseThreshold(status, filename) {
	const threshold = status.branch_warning_threshold;
	if (
		typeof threshold !== "number" ||
		!Number.isSafeInteger(threshold) ||
		threshold < 0
	) {
		throw new Error(
			`${filename} branch_warning_threshold must be a nonnegative integer`,
		);
	}
	return threshold;
}

/** @param {Record<string, unknown>} status @param {string} filename */
export function readMainBranch(status, filename) {
	const mainBranch = status.main_branch;
	if (typeof mainBranch !== "string" || !mainBranch.trim()) {
		throw new Error(`${filename} main_branch must be a nonempty string`);
	}
	return mainBranch;
}

/** @param {Record<string, unknown>} status @param {string} filename */
export function readTimestamp(status, filename) {
	const timestamp = status.updated_at;
	parseTimestamp(timestamp, `${filename} updated_at`);
	return /** @type {string} */ (timestamp);
}

/**
 * @param {unknown} value
 * @param {string} context
 * @returns {number}
 */
export function parseTimestamp(value, context) {
	if (
		typeof value !== "string" ||
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
	) {
		throw new Error(
			`${context} must be a canonical UTC date with second precision`,
		);
	}
	const milliseconds = Date.parse(value);
	if (!Number.isFinite(milliseconds))
		throw new Error(`${context} has an invalid date`);
	if (new Date(milliseconds).toISOString().replace(/\.000Z$/, "Z") !== value) {
		throw new Error(`${context} has an impossible or noncanonical date`);
	}
	return milliseconds;
}

const serializedFields = {
	branchName: "branch_name",
	committedAt: "committed_at",
	planningDoc: "planning_doc",
};

/**
 * Convert the serialized snake_case schema to the runtime's existing record model.
 * @template {Record<string, any>} T
 * @param {unknown} records
 * @param {string} filename
 * @param {string[]} requiredFields
 * @returns {T[]}
 */
export function parseRecords(records, filename, requiredFields) {
	if (!Array.isArray(records))
		throw new Error(`${filename} records must be an array`);
	return records.map((record, index) => {
		if (!record || typeof record !== "object" || Array.isArray(record)) {
			throw new Error(`${filename} record ${index + 1} must be an object`);
		}
		const result = {};
		for (const field of requiredFields) {
			const key = serializedFields[field] ?? field;
			if (typeof record[key] !== "string") {
				throw new Error(
					`${filename} record ${index + 1} field ${key} must be a string`,
				);
			}
			result[field] = record[key];
		}
		if ("decisions" in record) result.decisions = record.decisions;
		return /** @type {T} */ (result);
	});
}
