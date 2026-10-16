// @ts-check

import { spawnSync } from "node:child_process";
import {
	existsSync,
	readFileSync,
	realpathSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * @typedef {Object} GitBranchTip
 * @property {string} ref
 * @property {string} branchName
 * @property {string} committedAt
 * @property {string} subject
 */

/**
 * @typedef {Object} BranchRecord
 * @property {string} branchName
 * @property {string} committedAt
 * @property {string} subject
 * @property {'removal candidate' | 'in active development' | 'ready to merge' | 'no related plan'} status
 * @property {string} planningDoc
 * @property {string} ref
 */

/**
 * @typedef {Object} CommitRecord
 * @property {string} committedAt
 * @property {string} subject
 * @property {string[]} [decisions]
 * @property {string} [decision]
 */

/**
 * @typedef {Object} TreeEntry
 * @property {string} mode
 * @property {string} type
 * @property {string} objectId
 */

/**
 * @typedef {Object} ValidationResult
 * @property {number} branchCount
 * @property {number} threshold
 * @property {string} mainBranch
 * @property {BranchRecord[]} branchRecords
 */

/**
 * @callback StartupWarningCallback
 * @param {number} count
 * @param {number} threshold
 * @returns {void}
 */

const historyPath = "PROJECT_HISTORY.md";
const refFormat = "%(refname)%00%(symref)%00%(committerdate:unix)%00%(subject)";
const maxBuffer = 16 * 1024 * 1024;

/**
 * @param {string[]} args
 * @param {{ cwd?: string, input?: string, encoding?: BufferEncoding, env?: NodeJS.ProcessEnv }} [options]
 * @returns {string}
 */
export function runGit(
	args,
	{ cwd = process.cwd(), input, encoding = "utf8", env = process.env } = {},
) {
	const result = spawnSync("git", args, {
		cwd,
		input,
		encoding,
		maxBuffer,
		env,
	});
	if (result.error) {
		throw new Error(
			`Could not run git ${args.join(" ")}: ${result.error.message}`,
		);
	}
	if (result.status !== 0) {
		const detail = String(result.stderr ?? "").trim();
		throw new Error(
			`git ${args.join(" ")} failed${detail ? `: ${detail}` : ` with exit code ${result.status}`}`,
		);
	}
	return /** @type {string} */ (result.stdout);
}

/**
 * @param {string} [cwd]
 * @returns {string}
 */
export function findRepositoryRoot(cwd = process.cwd()) {
	const output = runGit(["rev-parse", "--show-toplevel"], { cwd });
	const root = output.replace(/\r?\n$/, "");
	if (!root)
		throw new Error(`Git returned an empty repository root from ${cwd}`);
	return root;
}

/**
 * @param {string} root
 * @returns {void}
 */
function ensureHead(root) {
	try {
		runGit(["rev-parse", "--verify", "HEAD^{commit}"], { cwd: root });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`A committed HEAD is required: ${message}`);
	}
}

/**
 * @param {string | number} value
 * @param {string} context
 * @returns {string}
 */
function isoFromUnixSeconds(value, context) {
	const seconds = Number(value);
	if (!Number.isSafeInteger(seconds)) {
		throw new Error(`${context} has an invalid Git committer timestamp`);
	}
	const date = new Date(seconds * 1000);
	if (!Number.isFinite(date.getTime())) {
		throw new Error(`${context} has an invalid Git committer timestamp`);
	}
	return date.toISOString().replace(/\.000Z$/, "Z");
}

/**
 * @param {string} root
 * @returns {Map<string, GitBranchTip>}
 */
export function readActualBranches(root) {
	const remoteOutput = runGit(
		["for-each-ref", `--format=${refFormat}`, "refs/remotes"],
		{
			cwd: root,
		},
	);
	const rawRemote = [];
	for (const line of remoteOutput.split("\n")) {
		if (!line) continue;
		const fields = line.split("\0");
		if (fields.length !== 4) {
			throw new Error(`Git returned malformed branch metadata: ${line}`);
		}
		const [ref, symbolicTarget, seconds, subject] = fields;
		if (symbolicTarget) continue;
		if (!ref.startsWith("refs/remotes/")) continue;
		if (!seconds) throw new Error(`Branch ${ref} does not point to a commit`);
		rawRemote.push({ ref, seconds, subject });
	}

	/** @type {Map<string, GitBranchTip>} */
	const branches = new Map();

	if (rawRemote.length > 0) {
		for (const { ref, seconds, subject } of rawRemote) {
			const baseName = ref.replace(/^refs\/remotes\/[^/]+\//, "");
			const localRef = `refs/heads/${baseName}`;
			let hasUnpushed = false;
			try {
				const unpushedList = runGit(["rev-list", `${ref}..${localRef}`], {
					cwd: root,
				}).trim();
				if (unpushedList.length > 0) {
					hasUnpushed = true;
				}
			} catch {
				hasUnpushed = false;
			}
			const branchName = hasUnpushed
				? `${baseName} [unpushed changes]`
				: baseName;
			branches.set(ref, {
				ref,
				branchName,
				committedAt: isoFromUnixSeconds(seconds, `Branch ${ref}`),
				subject,
			});
		}
	} else {
		const headOutput = runGit(
			["for-each-ref", `--format=${refFormat}`, "refs/heads"],
			{
				cwd: root,
			},
		);
		for (const line of headOutput.split("\n")) {
			if (!line) continue;
			const fields = line.split("\0");
			if (fields.length !== 4) {
				throw new Error(`Git returned malformed branch metadata: ${line}`);
			}
			const [ref, symbolicTarget, seconds, subject] = fields;
			if (symbolicTarget) continue;
			if (!ref.startsWith("refs/heads/")) continue;
			if (!seconds) throw new Error(`Branch ${ref} does not point to a commit`);
			const baseName = ref.replace(/^refs\/heads\//, "");
			branches.set(ref, {
				ref,
				branchName: baseName,
				committedAt: isoFromUnixSeconds(seconds, `Branch ${ref}`),
				subject,
			});
		}
	}

	if (branches.size === 0)
		throw new Error("No local or remote-tracking branches were found");
	return branches;
}

/**
 * @param {string} root
 * @returns {Map<string, number>}
 */
function readReachableCommits(root) {
	const output = runGit(
		["log", "--format=%ct%x00%s", "--branches", "--remotes"],
		{ cwd: root },
	);
	/** @type {Map<string, number>} */
	const counts = new Map();
	for (const line of output.split("\n")) {
		if (!line) continue;
		const separator = line.indexOf("\0");
		if (separator < 0)
			throw new Error(`Git returned malformed commit metadata: ${line}`);
		const committedAt = isoFromUnixSeconds(
			line.slice(0, separator),
			"Reachable commit",
		);
		const subject = line.slice(separator + 1);
		const key = JSON.stringify([committedAt, subject]);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return counts;
}

/**
 * @param {string} parent
 * @param {string} candidate
 * @returns {boolean}
 */
function isWithin(parent, candidate) {
	const path = relative(parent, candidate);
	return (
		path === "" ||
		(path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path))
	);
}

/**
 * @param {string} root
 * @param {string} filePath
 * @returns {string}
 */
function readWorkingFile(root, filePath) {
	const rootReal = realpathSync(root);
	const requested = resolve(rootReal, filePath);
	const realFile = realpathSync(requested);
	if (!isWithin(rootReal, realFile)) {
		throw new Error(`${filePath} resolves outside the repository`);
	}
	if (!statSync(realFile).isFile())
		throw new Error(`${filePath} is not a regular file`);
	return readFileSync(realFile, "utf8");
}

/**
 * @param {string} root
 * @param {string} treeRef
 * @param {string} filePath
 * @returns {TreeEntry}
 */
function readTreeEntry(root, treeRef, filePath) {
	const output = runGit(
		[
			"--literal-pathspecs",
			"ls-tree",
			"-z",
			"--full-tree",
			treeRef,
			"--",
			filePath,
		],
		{ cwd: root },
	);
	const entries = output.split("\0").filter(Boolean);
	const entry = entries.find(
		(row) => row.slice(row.indexOf("\t") + 1) === filePath,
	);
	if (!entry)
		throw new Error(`${filePath} is missing from committed ${treeRef}`);
	const separator = entry.indexOf("\t");
	if (separator < 0)
		throw new Error(`Git returned malformed tree metadata for ${filePath}`);
	const [mode, type, objectId] = entry.slice(0, separator).split(" ");
	return { mode, type, objectId };
}

/**
 * @param {string} path
 * @returns {boolean}
 */
function isRepoRelativePath(path) {
	return (
		path !== "" &&
		path !== "." &&
		path !== ".." &&
		!path.startsWith("../") &&
		!path.startsWith("/")
	);
}

/**
 * @param {string} root
 * @param {string} treeRef
 * @param {string} filePath
 * @returns {string}
 */
function readCommittedFile(root, treeRef, filePath) {
	let currentPath = filePath;
	for (let depth = 0; depth < 40; depth += 1) {
		const entry = readTreeEntry(root, treeRef, currentPath);
		if (entry.type !== "blob")
			throw new Error(`${currentPath} in ${treeRef} is not a file`);
		const content = runGit(["cat-file", "blob", entry.objectId], { cwd: root });
		if (entry.mode !== "120000") return content;
		if (content.includes("\0"))
			throw new Error(`${currentPath} has an invalid symlink target`);
		const target = content;
		if (isAbsolute(target) || target.includes("\\")) {
			throw new Error(`${currentPath} symlink escapes the repository`);
		}
		const nextPath = resolvePosix(currentPath, target);
		if (!isRepoRelativePath(nextPath)) {
			throw new Error(`${currentPath} symlink escapes the repository`);
		}
		currentPath = nextPath;
	}
	throw new Error(`${filePath} contains a symlink loop in ${treeRef}`);
}

/**
 * @param {string} fromPath
 * @param {string} target
 * @returns {string}
 */
function resolvePosix(fromPath, target) {
	const parts =
		`${fromPath.slice(0, fromPath.lastIndexOf("/") + 1)}${target}`.split("/");
	/** @type {string[]} */
	const result = [];
	for (const part of parts) {
		if (!part || part === ".") continue;
		if (part === "..") {
			if (result.length === 0) return "..";
			result.pop();
		} else {
			result.push(part);
		}
	}
	return result.join("/");
}

/**
 * @param {string} root
 * @param {string | null} treeRef
 * @param {string} filePath
 * @returns {string}
 */
function readDocument(root, treeRef, filePath) {
	try {
		return treeRef === null
			? readWorkingFile(root, filePath)
			: readCommittedFile(root, treeRef, filePath);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`${filePath}: ${message}`);
	}
}

/**
 * @param {string} text
 * @param {string} heading
 * @returns {RegExpMatchArray[]}
 */
function findSectionHeadings(text, heading) {
	const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return [...text.matchAll(new RegExp(`^## ${escaped}[ \\t]*$`, "gm"))];
}

/**
 * @param {string} text
 * @param {string} filename
 * @returns {{ status: string, log: string }}
 */
export function sectionBounds(text, filename) {
	const status = findSectionHeadings(text, "Git status");
	const logs = findSectionHeadings(text, "Log");
	if (
		status.length !== 1 ||
		logs.length !== 1 ||
		status[0].index === undefined ||
		logs[0].index === undefined ||
		status[0].index >= logs[0].index
	) {
		throw new Error(
			`${filename} must contain one '## Git status' section before one '## Log' section`,
		);
	}
	const statusStart = status[0].index + status[0][0].length;
	const logStart = logs[0].index + logs[0][0].length;
	return {
		status: text.slice(statusStart, logs[0].index),
		log: text.slice(logStart),
	};
}

/**
 * @param {string} statusSection
 * @param {string} filename
 * @returns {number}
 */
export function parseThreshold(statusSection, filename) {
	const matches = [
		...statusSection.matchAll(/^Branch warning threshold:[ \t]*(.*?)[ \t]*$/gm),
	];
	if (matches.length !== 1) {
		throw new Error(
			`${filename} must contain one Branch warning threshold field`,
		);
	}
	const raw = matches[0][1];
	if (!/^\d+$/.test(raw)) {
		throw new Error(
			`${filename} Branch warning threshold must be a nonnegative integer`,
		);
	}
	const threshold = Number(raw);
	if (!Number.isSafeInteger(threshold)) {
		throw new Error(
			`${filename} Branch warning threshold must be a nonnegative integer`,
		);
	}
	return threshold;
}

/**
 * @param {string} statusSection
 * @param {string} filename
 * @returns {string}
 */
export function readMainBranch(statusSection, filename) {
	const matches = [
		...statusSection.matchAll(/^Main branch:[ \t]*(.*?)[ \t]*$/gm),
	];
	if (matches.length !== 1) {
		throw new Error(`${filename} must contain one Main branch field`);
	}
	const mainBranch = matches[0][1].trim();
	if (!mainBranch) {
		throw new Error(`${filename} Main branch field must be a nonempty string`);
	}
	return mainBranch;
}

/**
 * @param {string} statusSection
 * @param {string} filename
 * @returns {string}
 */
export function readTimestamp(statusSection, filename) {
	const matches = [
		...statusSection.matchAll(/^Updated at:[ \t]*(.*?)[ \t]*$/gm),
	];
	if (matches.length !== 1)
		throw new Error(`${filename} must contain one Updated at field`);
	return matches[0][1];
}

/**
 * @param {unknown} value
 * @param {string} context
 * @returns {number}
 */
function parseTimestamp(value, context) {
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
	try {
		if (
			new Date(milliseconds).toISOString().replace(/\.000Z$/, "Z") !== value
		) {
			throw new Error(`${context} has an impossible or noncanonical date`);
		}
	} catch {
		throw new Error(`${context} has an impossible or noncanonical date`);
	}
	return milliseconds;
}

/**
 * @param {string} section
 * @param {string} filename
 * @returns {string}
 */
export function locateJsonBlock(section, filename) {
	const lines = section.split(/\r?\n/);
	const openings = [];
	for (let index = 0; index < lines.length; index += 1) {
		if (/^```(?:jsonl?)[ \t]*$/.test(lines[index])) openings.push(index);
	}
	if (openings.length !== 1) {
		throw new Error(
			`${filename} must contain exactly one fenced json or jsonl block`,
		);
	}
	const start = openings[0];
	let end = -1;
	for (let index = start + 1; index < lines.length; index += 1) {
		if (/^```[ \t]*$/.test(lines[index])) {
			end = index;
			break;
		}
	}
	if (end < 0) throw new Error(`${filename} has an unterminated JSON block`);
	return lines.slice(start + 1, end).join("\n");
}

/**
 * @template {Record<string, any>} T
 * @param {string} section
 * @param {string} filename
 * @param {string[]} requiredFields
 * @returns {T[]}
 */
export function parseRecords(section, filename, requiredFields) {
	const blockText = locateJsonBlock(section, filename);
	const trimmed = blockText.trim();
	if (!trimmed) return [];

	/** @type {unknown[]} */
	let records;

	if (trimmed.startsWith("[")) {
		try {
			records = JSON.parse(trimmed);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`${filename} JSON block is malformed: ${message}`);
		}
		if (!Array.isArray(records)) {
			throw new Error(
				`${filename} JSON block must contain an array of objects`,
			);
		}
	} else {
		records = [];
		let pos = 0;
		while (pos < trimmed.length) {
			while (pos < trimmed.length && /\s/.test(trimmed[pos])) pos++;
			if (pos >= trimmed.length) break;
			if (trimmed[pos] !== "{") {
				throw new Error(`${filename} JSON record must be an object`);
			}
			let depth = 0;
			let inString = false;
			let isEscaped = false;
			const start = pos;
			while (pos < trimmed.length) {
				const ch = trimmed[pos];
				if (isEscaped) {
					isEscaped = false;
				} else if (ch === "\\") {
					if (inString) isEscaped = true;
				} else if (ch === '"') {
					inString = !inString;
				} else if (!inString) {
					if (ch === "{") depth++;
					else if (ch === "}") {
						depth--;
						if (depth === 0) {
							pos++;
							break;
						}
					}
				}
				pos++;
			}
			if (depth !== 0) {
				throw new Error(`${filename} JSON block has an unterminated object`);
			}
			const objText = trimmed.slice(start, pos);
			try {
				records.push(JSON.parse(objText));
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(`${filename} JSON record is malformed: ${message}`);
			}
		}
	}

	return records.map((record, index) => {
		const recordNumber = index + 1;
		if (!record || typeof record !== "object" || Array.isArray(record)) {
			throw new Error(
				`${filename} JSON record ${recordNumber} must be an object`,
			);
		}
		const obj = /** @type {Record<string, unknown>} */ (record);
		for (const field of requiredFields) {
			if (typeof obj[field] !== "string") {
				throw new Error(
					`${filename} JSON record ${recordNumber} field ${field} must be a string`,
				);
			}
		}
		return /** @type {T} */ (obj);
	});
}

/**
 * @param {string} logSection
 * @param {string} filename
 * @returns {string[]}
 */
function parseDomainLinks(logSection, filename) {
	const markers = [...logSection.matchAll(/^Domains:[ \t]*$/gm)];
	if (markers.length !== 1 || markers[0].index === undefined) {
		throw new Error(`${filename} must contain one Domains list`);
	}
	const tail = logSection.slice(markers[0].index + markers[0][0].length);
	const paths = [];
	for (const line of tail.split(/\r?\n/)) {
		if (!line.trim()) continue;
		const match = /^\s*-\s+\[([^\]]+)\]\(([^)]+)\)\s*$/.exec(line);
		if (!match)
			throw new Error(
				`${filename} has a malformed domain link: ${line.trim()}`,
			);
		paths.push(match[2]);
	}
	if (paths.length === 0)
		throw new Error(`${filename} Domains list must not be empty`);
	const seen = new Set();
	for (const path of paths) {
		if (
			typeof path !== "string" ||
			path.startsWith("/") ||
			path.includes("\\") ||
			path.split("").some((character) => {
				const code = character.charCodeAt(0);
				return code < 32 || code === 127;
			}) ||
			!path.startsWith("docs/project-history/") ||
			!path.endsWith(".md")
		) {
			throw new Error(`${filename} has an invalid domain path: ${path}`);
		}
		const components = path.split("/");
		if (components.some((part) => !part || part === "." || part === "..")) {
			throw new Error(
				`${filename} has a traversal or noncanonical domain path: ${path}`,
			);
		}
		if (seen.has(path))
			throw new Error(`${filename} has duplicate domain path ${path}`);
		seen.add(path);
	}
	return paths;
}

/**
 * @param {string} text
 * @param {string} filename
 * @returns {{ entries: CommitRecord[] | null, domainPaths: string[] | null }}
 */
export function parseLogDocument(text, filename) {
	const logs = findSectionHeadings(text, "Log");
	if (logs.length !== 1 || logs[0].index === undefined) {
		throw new Error(`${filename} must contain one '## Log' section`);
	}
	const section = text.slice(logs[0].index + logs[0][0].length);
	const hasDomains = /^Domains:[ \t]*$/m.test(section);
	const hasJson = /^```(?:jsonl?)[ \t]*$/m.test(section);
	if (hasDomains && hasJson) {
		throw new Error(
			`${filename} cannot contain both inline log entries and domain links`,
		);
	}
	if (hasDomains)
		return { entries: null, domainPaths: parseDomainLinks(section, filename) };
	return {
		entries: /** @type {CommitRecord[]} */ (
			parseRecords(section, filename, ["committedAt", "subject"])
		),
		domainPaths: null,
	};
}

/**
 * @param {CommitRecord[]} records
 * @param {string} filename
 * @returns {void}
 */
function validateRecordDatesAndOrder(records, filename) {
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
function validateBranchRecords(records, actualBranches, filename) {
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
function validateReachableEntries(
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

/**
 * @param {string} text
 * @returns {number | null}
 */
function peekStartupThreshold(text) {
	const heading = /^## Git status[ \t]*$/m.exec(text);
	if (!heading) return null;
	const start = heading.index + heading[0].length;
	const next = /^## [^\n]*$/gm;
	next.lastIndex = start;
	const nextHeading = next.exec(text);
	const status = text.slice(
		start,
		nextHeading ? nextHeading.index : text.length,
	);
	try {
		return parseThreshold(status, historyPath);
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

	const { status } = sectionBounds(source, historyPath);
	const updatedAt = readTimestamp(status, historyPath);
	parseTimestamp(updatedAt, `${historyPath} Updated at`);
	const mainBranch = readMainBranch(status, historyPath);
	const threshold = parseThreshold(status, historyPath);
	/** @type {BranchRecord[]} */
	const branchRecords = parseRecords(status, historyPath, [
		"branchName",
		"committedAt",
		"subject",
		"status",
		"planningDoc",
		"ref",
	]);
	validateBranchRecords(branchRecords, actualBranches, historyPath);

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
			`${historyPath} Updated at must equal the newest log timestamp (${newest})`,
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
	};
}

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

/**
 * @returns {void}
 */
function runChecker() {
	const args = process.argv.slice(2);
	const startup = args.length === 1 && args[0] === "--startup";
	if (args.length > 0 && !startup) {
		process.stderr.write("Usage: node check-project-history.mjs [--startup]\n");
		process.exitCode = 1;
		return;
	}
	try {
		const root = findRepositoryRoot();
		const status = runGit(["status", "--short", "--branch"], { cwd: root });
		process.stdout.write(status);
		if (status && !status.endsWith("\n")) process.stdout.write("\n");
		validateHistory(root, {
			onStartupWarning: startup
				? (count, threshold) => {
						process.stderr.write(
							`Warning: actual branch count ${count} exceeds configured threshold ${threshold}.\n`,
						);
					}
				: null,
		});
		process.stdout.write("Project history validation passed.\n");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		process.stderr.write(`Project history validation failed: ${message}\n`);
		process.exitCode = 1;
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	runChecker();
}
