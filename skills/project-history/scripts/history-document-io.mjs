// @ts-check

import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { runGit } from "./history-git.mjs";

/** @typedef {import("./history-git.mjs").TreeEntry} TreeEntry */

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
export function readDocument(root, treeRef, filePath) {
	try {
		return treeRef === null
			? readWorkingFile(root, filePath)
			: readCommittedFile(root, treeRef, filePath);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`${filePath}: ${message}`);
	}
}
