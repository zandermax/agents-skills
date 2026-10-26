// @ts-check

/** @typedef {import("./history-git.mjs").CommitRecord} CommitRecord */
import {
	findSectionHeadings,
	parseRecords,
} from "./history-document-parse.mjs";

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
