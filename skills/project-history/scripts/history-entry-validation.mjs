// @ts-check

/** @typedef {import("./history-git.mjs").BranchRecord} BranchRecord */
/** @typedef {import("./history-git.mjs").CommitRecord} CommitRecord */
/** @typedef {import("./history-git.mjs").GitBranchTip} GitBranchTip */
import { parseTimestamp } from "./history-document-parse.mjs";

/**
 * @param {CommitRecord[]} records
 * @param {string} filename
 * @returns {void}
 */
export function validateRecordDatesAndOrder(records, filename) {
	let previous = Infinity;
	for (let index = 0; index < records.length; index += 1) {
		const record = records[index];
		const timestamp = parseTimestamp(
			record.committedAt,
			`${filename} entry ${record.subject} committedAt`,
		);

		/** @type {string[]} */
		let decisionsList = [];
		if (Array.isArray(record.decisions)) {
			decisionsList = record.decisions;
		} else if (typeof record.decision === "string") {
			decisionsList = [record.decision];
		} else if (
			record.decisions !== undefined ||
			record.decision !== undefined
		) {
			throw new Error(
				`${filename} entry ${record.subject} decisions must be an array of strings`,
			);
		}

		for (const decision of decisionsList) {
			if (typeof decision !== "string" || !decision.trim()) {
				throw new Error(
					`${filename} entry ${record.subject} decisions must contain non-whitespace text strings`,
				);
			}
			if (
				record.subject &&
				decision.toLowerCase().includes(record.subject.toLowerCase())
			) {
				throw new Error(
					`${filename} entry ${record.subject} decision must not contain the git message`,
				);
			}
		}

		if (timestamp > previous) {
			throw new Error(
				`${filename} Log must be newest first; ${record.subject} is out of order`,
			);
		}
		previous = timestamp;
	}
}

/** @type {Set<string>} */
const VALID_BRANCH_STATUSES = new Set([
	"removal candidate",
	"in active development",
	"ready to merge",
	"no related plan",
]);

function stripUnpushedMarker(name) {
	return name.replace(/\s+\[unpushed changes\]$/, "");
}

/**
 * @param {BranchRecord[]} records
 * @param {Map<string, GitBranchTip>} actualBranches
 * @param {string} filename
 * @returns {void}
 */
export function validateBranchRecords(records, actualBranches, filename) {
	/** @type {Map<string, BranchRecord>} */
	const recorded = new Map();
	for (const record of records) {
		if (typeof record.ref !== "string" || !record.ref) {
			throw new Error(
				`${filename} branch record field ref must be a nonempty string`,
			);
		}
		if (typeof record.branchName !== "string" || !record.branchName.trim()) {
			throw new Error(
				`${filename} branch ${record.ref} branchName must be a nonempty string`,
			);
		}
		if (recorded.has(record.ref))
			throw new Error(`${filename} has duplicate branch ref ${record.ref}`);
		parseTimestamp(
			record.committedAt,
			`${filename} branch ${record.ref} committedAt`,
		);
		if (typeof record.subject !== "string") {
			throw new Error(
				`${filename} branch ${record.ref} subject must be a string`,
			);
		}
		if (!VALID_BRANCH_STATUSES.has(record.status)) {
			throw new Error(
				`${filename} branch ${record.ref} status must be one of: ${[...VALID_BRANCH_STATUSES].map((s) => `'${s}'`).join(", ")}`,
			);
		}
		if (typeof record.planningDoc !== "string" || !record.planningDoc.trim()) {
			throw new Error(
				`${filename} branch ${record.ref} planningDoc must be a nonempty string`,
			);
		}
		recorded.set(record.ref, record);
	}
	for (const [ref, actual] of actualBranches) {
		const snapshot = recorded.get(ref);
		if (!snapshot)
			throw new Error(`${filename} branch inventory is missing ${ref}`);
		if (
			stripUnpushedMarker(snapshot.branchName) !==
			stripUnpushedMarker(actual.branchName)
		) {
			throw new Error(
				`${filename} ${ref} branchName does not match actual state ('${snapshot.branchName}' vs '${actual.branchName}')`,
			);
		}
		if (snapshot.subject !== actual.subject) {
			throw new Error(
				`${filename} ${ref} subject does not match its current tip`,
			);
		}
		if (snapshot.committedAt !== actual.committedAt) {
			throw new Error(
				`${filename} ${ref} committedAt does not match its current tip`,
			);
		}
	}
	for (const ref of recorded.keys()) {
		if (!actualBranches.has(ref))
			throw new Error(`${filename} branch inventory contains extra ref ${ref}`);
	}
}

/**
 * @param {CommitRecord[]} entries
 * @param {Map<string, number>} reachableCounts
 * @param {string} filename
 * @param {boolean} [allowUnrecordedPriorCommits]
 * @returns {void}
 */
export function validateReachableEntries(
	entries,
	reachableCounts,
	filename,
	allowUnrecordedPriorCommits = false,
) {
	if (entries.length === 0) return;
	const oldestCommittedAt = entries.reduce(
		(oldest, entry) =>
			entry.committedAt < oldest ? entry.committedAt : oldest,
		entries[0].committedAt,
	);
	const recordedCounts = new Map();
	for (const entry of entries) {
		const key = JSON.stringify([entry.committedAt, entry.subject]);
		recordedCounts.set(key, (recordedCounts.get(key) ?? 0) + 1);
	}
	for (const [key, count] of reachableCounts) {
		const [committedAt, subject] = JSON.parse(key);
		if (allowUnrecordedPriorCommits && committedAt < oldestCommittedAt)
			continue;
		const actual = recordedCounts.get(key) ?? 0;
		if (actual < count) {
			throw new Error(
				`${filename} Log is missing reachable commit ${subject} at ${committedAt} (${count - actual} missing)`,
			);
		}
		if (actual > count) {
			throw new Error(
				`${filename} Log has surplus copies of reachable commit ${subject} at ${committedAt}`,
			);
		}
	}
}
