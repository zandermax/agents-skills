// @ts-check

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	findRepositoryRoot,
	parseLogDocument,
	parseRecords,
	parseThreshold,
	readActualBranches,
	readMainBranch,
	runGit,
	sectionBounds,
	validateHistory,
} from "./check-project-history.mjs";

/**
 * @typedef {import('./check-project-history.mjs').BranchRecord} BranchRecord
 * @typedef {import('./check-project-history.mjs').CommitRecord} CommitRecord
 * @typedef {import('./check-project-history.mjs').GitBranchTip} GitBranchTip
 */

const historyPath = "PROJECT_HISTORY.md";

/**
 * @param {string[]} argv
 * @returns {{ subject?: string, decisions: string[], domain?: string, noCommit: boolean, amend: boolean }}
 */
function parseArgs(argv) {
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
function readReachableGitCommits(root) {
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
 * @returns {string[]}
 */
function writeHistoryState(
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
) {
	const filesToStage = [historyPath];
	let logSection = "";

	if (domainPaths && domainPaths.length > 0) {
		const targetDomainRel = requestedDomain
			? (domainPaths.find((p) =>
					p.toLowerCase().includes(requestedDomain.toLowerCase()),
				) ?? domainPaths[0])
			: domainPaths[0];
		const targetDomainPath = resolve(root, targetDomainRel);
		const targetDomainText = existsSync(targetDomainPath)
			? readFileSync(targetDomainPath, "utf8")
			: `# ${targetDomainRel}\n\n## Log\n\n\`\`\`json\n[]\n\`\`\`\n`;
		const targetDomainDoc = parseLogDocument(targetDomainText, targetDomainRel);
		const targetExisting = targetDomainDoc.entries ?? [];
		const mergedEntries = [...entriesToAdd, ...targetExisting].sort((a, b) =>
			b.committedAt.localeCompare(a.committedAt),
		);
		const formattedDomainEntries = mergedEntries.map((e) => ({
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
		writeFileSync(targetDomainPath, domainContent);
		filesToStage.push(targetDomainRel);

		const domainLines = domainPaths.map((p) => `- [${p}](${p})`).join("\n");
		logSection = ["Domains:", domainLines, ""].join("\n");
	} else {
		logSection = [
			...(hasUnrecordedNote
				? [
						"Note: Commits prior to this point do not have recorded historical context.",
						"",
					]
				: []),
			"```json",
			JSON.stringify(allFormattedEntries, null, 2),
			"```",
			"",
		].join("\n");
	}

	const content = [
		"# Project history",
		"",
		"## Git status",
		"",
		`Updated at: ${updatedAt}`,
		`Main branch: ${mainBranch}`,
		`Branch warning threshold: ${threshold}`,
		"",
		"```json",
		JSON.stringify(updatedBranchRecords, null, 2),
		"```",
		"",
		"## Log",
		"",
		logSection,
	].join("\n");

	writeFileSync(sourcePath, content);
	return filesToStage;
}

/**
 * @param {string} root
 * @param {{ subject?: string, decision?: string, decisions?: string[], domain?: string, noCommit?: boolean, amend?: boolean }} [options]
 * @returns {{ commitHash?: string, committedAt: string, subject: string }}
 */
export function recordHistory(root = findRepositoryRoot(), options = {}) {
	const providedDecisions = Array.isArray(options.decisions)
		? options.decisions
		: options.decision
			? [options.decision]
			: [];

	for (const decision of providedDecisions) {
		if (typeof decision !== "string" || !decision.trim()) {
			throw new Error("Decision must contain non-whitespace text.");
		}
	}

	if (options.amend) {
		if (process.env.PROJECT_HISTORY_AMENDING === "1") {
			return { committedAt: "", subject: "" };
		}
		let gitDir = "";
		try {
			gitDir = runGit(["rev-parse", "--git-dir"], { cwd: root }).trim();
		} catch {
			return { committedAt: "", subject: "" };
		}
		const resolvedGitDir = resolve(root, gitDir);
		if (
			existsSync(resolve(resolvedGitDir, "rebase-merge")) ||
			existsSync(resolve(resolvedGitDir, "rebase-apply")) ||
			existsSync(resolve(resolvedGitDir, "MERGE_HEAD")) ||
			existsSync(resolve(resolvedGitDir, "CHERRY_PICK_HEAD")) ||
			existsSync(resolve(resolvedGitDir, "REVERT_HEAD")) ||
			existsSync(resolve(resolvedGitDir, "BISECT_LOG"))
		) {
			return { committedAt: "", subject: "" };
		}
		try {
			const parents = runGit(["rev-list", "--parents", "-n", "1", "HEAD"], {
				cwd: root,
			})
				.trim()
				.split(/\s+/);
			if (parents.length > 2) {
				return { committedAt: "", subject: "" };
			}
		} catch {
			// HEAD might not exist yet
		}
	}

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

	if (
		options.amend &&
		unrecordedEntries.length === 0 &&
		providedDecisions.length === 0
	) {
		return { committedAt: "", subject: "" };
	}

	unrecordedEntries.sort((a, b) => b.committedAt.localeCompare(a.committedAt));

	if (options.amend) {
		const headSubject = runGit(["log", "-1", "--format=%s", "HEAD"], {
			cwd: root,
		}).trim();
		const headSeconds = runGit(["log", "-1", "--format=%ct", "HEAD"], {
			cwd: root,
		}).trim();
		const headCommittedAt = new Date(Number(headSeconds) * 1000)
			.toISOString()
			.replace(/\.000Z$/, "Z");

		for (const d of providedDecisions) {
			if (headSubject && d.toLowerCase().includes(headSubject.toLowerCase())) {
				throw new Error(`Decision must not contain the git message: "${d}"`);
			}
		}

		if (providedDecisions.length > 0) {
			if (unrecordedEntries.length > 0) {
				unrecordedEntries[0].decisions = providedDecisions;
			} else if (existingEntries.length > 0) {
				existingEntries[0].decisions = providedDecisions;
			}
		}

		const updatedEntries = [...unrecordedEntries, ...existingEntries].sort(
			(a, b) => b.committedAt.localeCompare(a.committedAt),
		);
		const maxLogCommittedAt = updatedEntries[0].committedAt;

		const actualBranches = readActualBranches(root);
		let currentBranchName = "";
		try {
			const headRef = runGit(["symbolic-ref", "--short", "HEAD"], {
				cwd: root,
			}).trim();
			currentBranchName = headRef;
		} catch {
			currentBranchName = mainBranch;
		}

		const branchMap = new Map(oldBranchRecords.map((r) => [r.ref, r]));

		/** @type {BranchRecord[]} */
		const updatedBranchRecords = [];
		for (const [ref, tip] of actualBranches) {
			const existing = branchMap.get(ref);
			const statusValue = existing?.status ?? "no related plan";
			const planningDocValue = existing?.planningDoc ?? "(none)";

			let branchName = tip.branchName;
			let committedAt = tip.committedAt;
			let subject = tip.subject;

			if (ref.startsWith("refs/remotes/")) {
				const base = ref.replace(/^refs\/remotes\/[^/]+\//, "");
				if (
					base === currentBranchName &&
					!branchName.endsWith(" [unpushed changes]")
				) {
					branchName = `${base} [unpushed changes]`;
				}
			} else if (ref === `refs/heads/${currentBranchName}`) {
				committedAt = headCommittedAt;
				subject = headSubject;
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

		const formattedEntries = updatedEntries.map((e) => {
			const decisions = Array.isArray(e.decisions)
				? e.decisions
				: typeof e.decision === "string"
					? [e.decision]
					: [];
			return {
				committedAt: e.committedAt,
				subject: e.subject,
				decisions,
			};
		});

		const filesToStage = writeHistoryState(
			root,
			logDoc.domainPaths,
			options.domain,
			unrecordedEntries,
			sourcePath,
			maxLogCommittedAt,
			mainBranch,
			threshold,
			updatedBranchRecords,
			hasUnrecordedNote,
			formattedEntries,
		);

		for (const file of filesToStage) {
			runGit(["add", file], { cwd: root });
		}

		runGit(["commit", "--amend", "--no-edit"], {
			cwd: root,
			env: {
				...process.env,
				PROJECT_HISTORY_AMENDING: "1",
				GIT_COMMITTER_DATE: headCommittedAt,
			},
		});

		const commitHash = runGit(["rev-parse", "HEAD"], { cwd: root }).trim();
		validateHistory(root, { treeRef: "HEAD" });
		return { commitHash, committedAt: headCommittedAt, subject: headSubject };
	}

	const isInitialSetup = existingEntries.length === 0;
	const plannedSubject =
		options.subject ||
		(isInitialSetup
			? "chore: set up project history, branch inventory, and pre-push guard"
			: "chore: update project history");

	for (const d of providedDecisions) {
		if (
			plannedSubject &&
			d.toLowerCase().includes(plannedSubject.toLowerCase())
		) {
			throw new Error(`Decision must not contain the git message: "${d}"`);
		}
	}

	let maxCommittedAt = "";
	for (const entry of [...existingEntries, ...unrecordedEntries]) {
		if (!maxCommittedAt || entry.committedAt > maxCommittedAt) {
			maxCommittedAt = entry.committedAt;
		}
	}

	const maxSec = maxCommittedAt
		? Math.floor(Date.parse(maxCommittedAt) / 1000)
		: 0;
	let sec = Math.floor(Date.now() / 1000);
	if (sec <= maxSec) {
		sec = maxSec + 1;
	}
	const now = new Date(sec * 1000).toISOString().replace(".000Z", "Z");

	/** @type {CommitRecord} */
	const prospectiveCommit = {
		committedAt: now,
		subject: plannedSubject,
		decisions: providedDecisions,
	};

	const updatedEntries = [
		prospectiveCommit,
		...unrecordedEntries,
		...existingEntries,
	].sort((a, b) => b.committedAt.localeCompare(a.committedAt));

	const actualBranches = readActualBranches(root);
	let currentBranchName = "";
	try {
		const headRef = runGit(["symbolic-ref", "--short", "HEAD"], {
			cwd: root,
		}).trim();
		currentBranchName = headRef;
	} catch {
		currentBranchName = mainBranch;
	}

	const branchMap = new Map(oldBranchRecords.map((r) => [r.ref, r]));

	/** @type {BranchRecord[]} */
	const updatedBranchRecords = [];
	for (const [ref, tip] of actualBranches) {
		const existing = branchMap.get(ref);
		const statusValue = existing?.status ?? "no related plan";
		const planningDocValue = existing?.planningDoc ?? "(none)";

		let branchName = tip.branchName;
		let committedAt = tip.committedAt;
		let subject = tip.subject;

		if (ref.startsWith("refs/remotes/")) {
			const base = ref.replace(/^refs\/remotes\/[^/]+\//, "");
			if (
				base === currentBranchName &&
				!branchName.endsWith(" [unpushed changes]")
			) {
				branchName = `${base} [unpushed changes]`;
			}
		} else if (ref === `refs/heads/${currentBranchName}`) {
			committedAt = now;
			subject = plannedSubject;
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

	const formattedEntries = updatedEntries.map((e) => {
		const decisions = Array.isArray(e.decisions)
			? e.decisions
			: typeof e.decision === "string"
				? [e.decision]
				: [];
		return {
			committedAt: e.committedAt,
			subject: e.subject,
			decisions,
		};
	});

	const filesToStage = writeHistoryState(
		root,
		logDoc.domainPaths,
		options.domain,
		[prospectiveCommit, ...unrecordedEntries],
		sourcePath,
		now,
		mainBranch,
		threshold,
		updatedBranchRecords,
		hasUnrecordedNote,
		formattedEntries,
	);

	if (options.noCommit) {
		for (const file of filesToStage) {
			runGit(["add", file], { cwd: root });
		}
		return { committedAt: now, subject: plannedSubject };
	}

	for (const file of filesToStage) {
		runGit(["add", file], { cwd: root });
	}

	runGit(["commit", "-m", plannedSubject], {
		cwd: root,
		env: {
			...process.env,
			GIT_COMMITTER_DATE: now,
		},
	});

	const commitHash = runGit(["rev-parse", "HEAD"], { cwd: root }).trim();

	validateHistory(root, { treeRef: "HEAD" });

	return { commitHash, committedAt: now, subject: plannedSubject };
}

function runCLI() {
	const args = parseArgs(process.argv.slice(2));
	try {
		const root = findRepositoryRoot();
		const result = recordHistory(root, args);
		if (result.commitHash) {
			process.stdout.write(
				`${args.amend ? "Amended" : "Recorded"} project history in commit ${result.commitHash.slice(0, 7)}: "${result.subject}" (${result.committedAt})\n`,
			);
		} else if (result.subject) {
			process.stdout.write(
				`Updated ${historyPath} with prospective commit "${result.subject}" (${result.committedAt})\n`,
			);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		process.stderr.write(`Failed to record project history: ${message}\n`);
		process.exitCode = 1;
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	runCLI();
}
