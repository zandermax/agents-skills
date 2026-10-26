// @ts-check

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	parseRecords,
	parseThreshold,
	readMainBranch,
	readTimestamp,
	sectionBounds,
} from "./history-document-parse.mjs";
import { parseLogDocument } from "./history-domain-log.mjs";
/** @typedef {import("./history-git.mjs").BranchRecord} BranchRecord */
/** @typedef {import("./history-git.mjs").CommitRecord} CommitRecord */
import {
	findRepositoryRoot,
	readActualBranches,
	readReachableCommits,
	runGit,
} from "./history-git.mjs";

const historyPath = "PROJECT_HISTORY.md";

/**
 * Automatically synchronize unrecorded commits and branch inventory into PROJECT_HISTORY.md.
 * @param {string} root
 * @returns {{ addedCount: number, modified: boolean }}
 */
export function syncHistory(root = findRepositoryRoot()) {
	const sourcePath = resolve(root, historyPath);
	if (!existsSync(sourcePath)) return { addedCount: 0, modified: false };

	const source = readFileSync(sourcePath, "utf8");
	const { status } = sectionBounds(source, historyPath);
	const mainBranch = readMainBranch(status, historyPath);
	const threshold = parseThreshold(status, historyPath);
	const hasUnrecordedNote =
		/commits prior to [^\n]* do not have recorded/i.test(source);

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

	const reachableCommits = readReachableCommits(root);
	const recordedCounts = new Map();
	for (const entry of existingEntries) {
		const key = JSON.stringify([entry.committedAt, entry.subject]);
		recordedCounts.set(key, (recordedCounts.get(key) ?? 0) + 1);
	}

	/** @type {CommitRecord[]} */
	const unrecordedEntries = [];
	for (const [key, count] of reachableCommits) {
		const [committedAt, subject] = JSON.parse(key);
		if (
			hasUnrecordedNote &&
			oldestRecordedCommittedAt &&
			committedAt < oldestRecordedCommittedAt
		) {
			continue;
		}
		const recorded = recordedCounts.get(key) ?? 0;
		if (recorded < count) {
			for (let i = 0; i < count - recorded; i++) {
				unrecordedEntries.push({
					committedAt,
					subject,
					decisions: [],
				});
			}
		}
	}

	const oldBranchRecords = parseRecords(status, historyPath, [
		"branchName",
		"committedAt",
		"subject",
		"status",
		"planningDoc",
		"ref",
	]);

	const actualBranches = readActualBranches(root);
	const branchMap = new Map(oldBranchRecords.map((r) => [r.ref, r]));

	let currentBranchName = "";
	try {
		const headRef = runGit(["symbolic-ref", "--short", "HEAD"], {
			cwd: root,
		}).trim();
		currentBranchName = headRef;
	} catch {
		currentBranchName = mainBranch;
	}

	/** @type {BranchRecord[]} */
	const updatedBranchRecords = [];
	for (const [ref, tip] of actualBranches) {
		const existing = branchMap.get(ref);
		const statusValue = existing?.status ?? "no related plan";
		const planningDocValue = existing?.planningDoc ?? "(none)";

		let branchName = tip.branchName;
		const committedAt = tip.committedAt;
		const subject = tip.subject;

		if (ref.startsWith("refs/remotes/")) {
			const base = ref.replace(/^refs\/remotes\/[^/]+\//, "");
			if (
				base === currentBranchName &&
				!branchName.endsWith(" [unpushed changes]")
			) {
				branchName = `${base} [unpushed changes]`;
			}
		}

		updatedBranchRecords.push({
			branchName,
			committedAt,
			subject,
			status: statusValue,
			planningDoc: planningDocValue,
			ref,
		});
	}

	const updatedEntries = [...unrecordedEntries, ...existingEntries].sort(
		(a, b) => b.committedAt.localeCompare(a.committedAt),
	);

	const newestCommittedAt =
		updatedEntries.length > 0
			? updatedEntries[0].committedAt
			: readTimestamp(status, historyPath);

	const formattedEntries = updatedEntries.map((e) => ({
		committedAt: e.committedAt,
		subject: e.subject,
		decisions: Array.isArray(e.decisions)
			? e.decisions
			: typeof e.decision === "string"
				? [e.decision]
				: [],
	}));

	let content;
	let domainModified = false;

	if (logDoc.domainPaths && logDoc.domainPaths.length > 0) {
		const targetDomainRel = logDoc.domainPaths[0];
		const targetDomainPath = resolve(root, targetDomainRel);
		const targetDomainText = existsSync(targetDomainPath)
			? readFileSync(targetDomainPath, "utf8")
			: `# ${targetDomainRel}\n\n## Log\n\n\`\`\`json\n[]\n\`\`\`\n`;
		const targetDomainDoc = parseLogDocument(targetDomainText, targetDomainRel);
		const targetExisting = targetDomainDoc.entries ?? [];
		const mergedDomainEntries = [...unrecordedEntries, ...targetExisting].sort(
			(a, b) => b.committedAt.localeCompare(a.committedAt),
		);
		const formattedDomainEntries = mergedDomainEntries.map((e) => ({
			committedAt: e.committedAt,
			subject: e.subject,
			decisions: Array.isArray(e.decisions)
				? e.decisions
				: typeof e.decision === "string"
					? [e.decision]
					: [],
		}));

		const domainContent = [
			`# ${targetDomainRel}`,
			"",
			"## Log",
			"",
			"```json",
			JSON.stringify(formattedDomainEntries, null, 2),
			"```",
			"",
		].join("\n");
		if (domainContent !== targetDomainText) {
			writeFileSync(targetDomainPath, domainContent);
			domainModified = true;
		}

		const domainLines = logDoc.domainPaths
			.map((p) => `- [${p}](${p})`)
			.join("\n");
		content = [
			"# Project history",
			"",
			"## Git status",
			"",
			`Updated at: ${newestCommittedAt}`,
			`Main branch: ${mainBranch}`,
			`Branch warning threshold: ${threshold}`,
			"",
			"```json",
			JSON.stringify(updatedBranchRecords, null, 2),
			"```",
			"",
			"## Log",
			"",
			"Domains:",
			domainLines,
			"",
		].join("\n");
	} else {
		content = [
			"# Project history",
			"",
			"## Git status",
			"",
			`Updated at: ${newestCommittedAt}`,
			`Main branch: ${mainBranch}`,
			`Branch warning threshold: ${threshold}`,
			"",
			"```json",
			JSON.stringify(updatedBranchRecords, null, 2),
			"```",
			"",
			"## Log",
			"",
			...(hasUnrecordedNote
				? [
						"Note: Commits prior to this point do not have recorded historical context.",
						"",
					]
				: []),
			"```json",
			JSON.stringify(formattedEntries, null, 2),
			"```",
			"",
		].join("\n");
	}

	const modified = content !== source || domainModified;
	if (content !== source) {
		writeFileSync(sourcePath, content);
	}

	return { addedCount: unrecordedEntries.length, modified };
}
