// @ts-check

/** @typedef {import("./history-git.mjs").BranchRecord} BranchRecord */
/** @typedef {import("./history-git.mjs").CommitRecord} CommitRecord */
/** @typedef {import("./history-git.mjs").GitBranchTip} GitBranchTip */
import { parseTimestamp } from "./history-document-parse.mjs";
import { runGit } from "./history-git.mjs";

/**
 * @param {CommitRecord[]} records
 * @param {string} filename
 * @returns {void}
 */
export function validateRecordDatesAndOrder(records, filename) {
	let previous = Infinity;
	for (let index = 0; index < records.length; index += 1) {
		const record = records[index];
		if (typeof record.subject !== "string" || !record.subject.trim()) {
			throw new Error(`${filename} entry subject must be a nonempty string`);
		}
		if (/[\r\n]/.test(record.subject)) {
			throw new Error(`${filename} entry subject must be a single-line string`);
		}
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
		} else {
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
 * @returns {string[]} Snapshot drift advisories, not validation failures.
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
		if (!/^refs\/remotes\/[^/]+\/.+/.test(record.ref)) {
			throw new Error(
				`${filename} branch ref must be a remote-tracking ref: ${record.ref}`,
			);
		}
		runGit(["check-ref-format", record.ref]);
		const baseName = record.ref.replace(/^refs\/remotes\/[^/]+\//, "");
		if (stripUnpushedMarker(record.branchName) !== baseName) {
			throw new Error(
				`${filename} branch ${record.ref} branchName must match its ref`,
			);
		}
		if (recorded.has(record.ref))
			throw new Error(`${filename} has duplicate branch ref ${record.ref}`);
		parseTimestamp(
			record.committedAt,
			`${filename} branch ${record.ref} committedAt`,
		);
		if (typeof record.subject !== "string" || !record.subject.trim()) {
			throw new Error(
				`${filename} branch ${record.ref} subject must be a nonempty string`,
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
		if (
			record.planningDoc !== "(none)" &&
			(record.planningDoc.includes("\\") ||
				!record.planningDoc.endsWith(".md") ||
				record.planningDoc
					.split("/")
					.some((part) => !part || part === "." || part === "..") ||
				[...record.planningDoc].some(
					(character) =>
						character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
				))
		) {
			throw new Error(
				`${filename} branch ${record.ref} planningDoc must be a safe repository-relative Markdown path`,
			);
		}
		recorded.set(record.ref, record);
	}
	const advisories = [];
	for (const [ref, actual] of actualBranches) {
		const snapshot = recorded.get(ref);
		if (!snapshot) {
			advisories.push(`branch snapshot drift: added ${ref}`);
			continue;
		}
		if (
			snapshot.subject !== actual.subject ||
			snapshot.committedAt !== actual.committedAt
		) {
			advisories.push(
				`branch snapshot drift: changed ${ref} tip subject or committed_at`,
			);
		}
	}
	for (const ref of recorded.keys()) {
		if (!actualBranches.has(ref))
			advisories.push(`branch snapshot drift: removed ${ref}`);
	}
	return advisories;
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
