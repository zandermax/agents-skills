// @ts-check

import { spawnSync } from "node:child_process";

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
 * @property {string[]} advisories
 */

/**
 * @callback StartupWarningCallback
 * @param {number} count
 * @param {number} threshold
 * @returns {void}
 */

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
export function ensureHead(root) {
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

	for (const { ref, seconds, subject } of rawRemote) {
		branches.set(ref, {
			ref,
			branchName: ref.replace(/^refs\/remotes\/[^/]+\//, ""),
			committedAt: isoFromUnixSeconds(seconds, `Branch ${ref}`),
			subject,
		});
	}
	return branches;
}

/**
 * @param {string} root
 * @returns {Map<string, number>}
 */
export function readReachableCommits(root) {
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
