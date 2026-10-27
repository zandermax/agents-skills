// @ts-check

import { parseRecords, parseYamlMapping } from "./history-document-parse.mjs";

/** @typedef {import("./history-git.mjs").CommitRecord} CommitRecord */

/** @param {unknown} paths @param {string} filename @returns {string[]} */
function validateDomainPaths(paths, filename) {
	if (!Array.isArray(paths) || paths.length === 0) {
		throw new Error(`${filename} domains must be a nonempty array`);
	}
	const seen = new Set();
	for (const path of paths) {
		if (
			typeof path !== "string" ||
			path.includes("\\") ||
			!path.startsWith("docs/project-history/") ||
			!/\.(?:yaml|yml)$/.test(path) ||
			[...path].some(
				(character) =>
					character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
			)
		) {
			throw new Error(`${filename} has an invalid domain path: ${path}`);
		}
		if (
			path.split("/").some((part) => !part || part === "." || part === "..")
		) {
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
	const data = parseYamlMapping(text, filename);
	const hasDomains = Object.hasOwn(data, "domains");
	const hasLog = Object.hasOwn(data, "log");
	if (hasDomains && hasLog) {
		throw new Error(
			`${filename} cannot contain both inline log entries and domain links`,
		);
	}
	if (hasDomains) {
		return {
			entries: null,
			domainPaths: validateDomainPaths(data.domains, filename),
		};
	}
	if (!hasLog)
		throw new Error(`${filename} must contain one log or domains section`);
	return {
		entries: parseRecords(data.log, filename, ["committedAt", "subject"]),
		domainPaths: null,
	};
}
