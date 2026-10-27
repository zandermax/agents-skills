// @ts-check

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	parseLogDocument,
	readActualBranches,
	runGit,
} from "./check-project-history.mjs";
import {
	formatDomainDocument,
	formatHistoryDocument,
} from "./history-document-format.mjs";
import { readDocument } from "./history-document-io.mjs";

/**
 * @typedef {import('./check-project-history.mjs').BranchRecord} BranchRecord
 * @typedef {import('./check-project-history.mjs').CommitRecord} CommitRecord
 */

/**
 * @param {string[]} argv
 * @returns {{ subject?: string, decisions: string[], domain?: string, noCommit: boolean, amend: boolean }}
 */
export function parseArgs(argv) {
	let subject;
	/** @type {string[]} */
	const decisions = [];
	let domain;
	let noCommit = false;
	let amend = false;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--subject" || arg === "-m") {
			subject = argv[++i];
		} else if (arg === "--decision" || arg === "-d") {
			const val = argv[++i];
			if (val) decisions.push(val);
		} else if (arg === "--domain") {
			domain = argv[++i];
		} else if (arg === "--no-commit") {
			noCommit = true;
		} else if (arg === "--amend") {
			amend = true;
		}
	}

	return { subject, decisions, domain, noCommit, amend };
}

/**
 * @param {string} root
 * @returns {Array<{ committedAt: string, subject: string }>}
 */
export function readReachableGitCommits(root) {
	const output = runGit(
		["log", "--format=%ct%x00%s", "--branches", "--remotes"],
		{
			cwd: root,
		},
	);
	const commits = [];
	for (const line of output.split("\n")) {
		if (!line) continue;
		const sep = line.indexOf("\0");
		if (sep < 0) continue;
		const seconds = Number(line.slice(0, sep));
		if (!Number.isSafeInteger(seconds)) continue;
		const committedAt = new Date(seconds * 1000)
			.toISOString()
			.replace(/\.000Z$/, "Z");
		const subject = line.slice(sep + 1);
		commits.push({ committedAt, subject });
	}
	return commits;
}

/**
 * @param {string} root
 * @param {BranchRecord[]} oldBranchRecords
 * @param {string} _mainBranch
 * @param {string} _committedAt
 * @param {string} _subject
 * @returns {BranchRecord[]}
 */
export function buildUpdatedBranchRecords(
	root,
	oldBranchRecords,
	_mainBranch,
	_committedAt,
	_subject,
) {
	const actualBranches = readActualBranches(root);
	const branchMap = new Map(
		oldBranchRecords.map((record) => [record.ref, record]),
	);
	/** @type {BranchRecord[]} */
	const updatedBranchRecords = [];
	for (const [ref, tip] of actualBranches) {
		const existing = branchMap.get(ref);
		const status = existing?.status ?? "no related plan";
		const planningDoc = existing?.planningDoc ?? "(none)";
		updatedBranchRecords.push({
			branchName: tip.branchName,
			committedAt: tip.committedAt,
			subject: tip.subject,
			status,
			planningDoc,
			ref,
		});
	}
	return updatedBranchRecords;
}

/**
 * @param {string} root
 * @param {string[] | null} domainPaths
 * @param {string | undefined} requestedDomain
 * @param {CommitRecord[]} entriesToAdd
 * @param {string} sourcePath
 * @param {string} updatedAt
 * @param {string} mainBranch
 * @param {number} threshold
 * @param {BranchRecord[]} updatedBranchRecords
 * @param {boolean} hasUnrecordedNote
 * @param {CommitRecord[]} allFormattedEntries
 * @param {string} historyPath
 * @returns {string[]}
 */
export function writeHistoryState(
	root,
	domainPaths,
	requestedDomain,
	entriesToAdd,
	sourcePath,
	updatedAt,
	mainBranch,
	threshold,
	updatedBranchRecords,
	hasUnrecordedNote,
	allFormattedEntries,
	historyPath,
) {
	const filesToStage = [historyPath];

	if (domainPaths && domainPaths.length > 0) {
		parseLogDocument(`domains: ${JSON.stringify(domainPaths)}`, historyPath);
		const targetDomainRel = requestedDomain
			? (domainPaths.find((p) =>
					p.toLowerCase().includes(requestedDomain.toLowerCase()),
				) ?? domainPaths[0])
			: domainPaths[0];
		const targetDomainPath = resolve(root, targetDomainRel);
		const targetDomainText = existsSync(targetDomainPath)
			? readDocument(root, null, targetDomainRel)
			: "log: []\n";
		const targetDomainDoc = parseLogDocument(targetDomainText, targetDomainRel);
		if (!targetDomainDoc.entries)
			throw new Error(`${targetDomainRel} must contain inline log entries`);
		const targetExisting = targetDomainDoc.entries;
		const mergedEntries = [...entriesToAdd, ...targetExisting].sort((a, b) =>
			b.committedAt.localeCompare(a.committedAt),
		);
		const domainContent = formatDomainDocument(mergedEntries);
		if (domainContent !== targetDomainText)
			writeFileSync(targetDomainPath, domainContent);
		filesToStage.push(targetDomainRel);
	}

	const content = formatHistoryDocument({
		updatedAt,
		mainBranch,
		threshold,
		branches: updatedBranchRecords,
		entries: allFormattedEntries,
		domainPaths,
		hasUnrecordedNote,
	});
	if (!existsSync(sourcePath) || readFileSync(sourcePath, "utf8") !== content) {
		writeFileSync(sourcePath, content);
	}
	return filesToStage;
}
