/** Workspace-root discovery and tool/command path boundary checks. */

import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	expandPath,
	isApprovedExternalReadPath,
	isTemporaryPath,
	isWithin,
	resolvedPath,
} from "./deny-non-read-git-paths.js";
import {
	isReadOnlyExternalCommand,
	splitShellStatements,
	tokenizeStatement,
} from "./deny-non-read-git-shell.js";

const PATH_FIELDS = new Set([
	"path",
	"filePath",
	"file_path",
	"directory",
	"dirPath",
	"dir_path",
	"cwd",
	"workspaceFolder",
]);

export const READ_ONLY_PATH_TOOLS = new Set([
	"read_file",
	"read",
	"readFile",
	"list_dir",
	"listDir",
	"view_image",
	"read_notebook_cell_output",
	"copilot_getNotebookSummary",
]);

function fileUriToPath(value) {
	if (typeof value !== "string" || !value.startsWith("file:")) {
		return null;
	}
	try {
		return fileURLToPath(value);
	} catch {
		return null;
	}
}

function rootsFromWorkspaceFile(workspaceFile) {
	let document;
	try {
		document = JSON.parse(readFileSync(workspaceFile, "utf8"));
	} catch {
		return [];
	}
	if (!Array.isArray(document.folders)) {
		return [];
	}

	const base = dirname(workspaceFile);
	const roots = [];
	for (const folder of document.folders) {
		if (!folder || typeof folder !== "object") {
			continue;
		}
		if (typeof folder.path === "string" && folder.path.length > 0) {
			roots.push(resolve(base, folder.path));
		} else if (typeof folder.uri === "string") {
			const folderPath = fileUriToPath(folder.uri);
			if (folderPath) {
				roots.push(folderPath);
			}
		}
	}
	return roots;
}

function rootsFromTranscript(transcriptPath) {
	if (typeof transcriptPath !== "string" || transcriptPath.length === 0) {
		return [];
	}

	const parts = transcriptPath.split(/[/\\]/);
	const index = parts.lastIndexOf("workspaceStorage");
	if (index < 0 || !parts[index + 1]) {
		return [];
	}
	const separator =
		transcriptPath.includes("\\") && !transcriptPath.includes("/") ? "\\" : "/";
	const storageRoot = parts.slice(0, index + 2).join(separator);

	let pointer;
	try {
		pointer = JSON.parse(
			readFileSync(resolve(storageRoot, "workspace.json"), "utf8"),
		);
	} catch {
		return [];
	}

	if (typeof pointer.folder === "string") {
		return [fileUriToPath(pointer.folder) ?? pointer.folder];
	}
	if (typeof pointer.workspace !== "string") {
		return [];
	}
	const workspaceFile = fileUriToPath(pointer.workspace);
	return workspaceFile ? rootsFromWorkspaceFile(workspaceFile) : [];
}

export function resolveWorkspaceRoots(context = {}) {
	const candidates = [process.cwd()];
	if (typeof context.cwd === "string") {
		candidates.push(context.cwd);
	}
	if (Array.isArray(context.workspaceRoots)) {
		candidates.push(...context.workspaceRoots);
	}
	candidates.push(...rootsFromTranscript(context.transcriptPath));

	const roots = [];
	const seen = new Set();
	for (const candidate of candidates) {
		if (typeof candidate !== "string" || candidate.length === 0) {
			continue;
		}
		const lexical = resolve(expandPath(candidate));
		let canonical = lexical;
		try {
			canonical = realpathSync.native(lexical);
		} catch {
			// A missing root still has to be comparable for tests and new folders.
		}
		if (seen.has(canonical)) {
			continue;
		}
		seen.add(canonical);
		roots.push({ lexical, canonical });
	}
	return roots;
}

export function isExternalPath(value, context = {}) {
	if (typeof value !== "string" || value.length === 0) {
		return false;
	}

	if (isTemporaryPath(value)) {
		return false;
	}

	const roots = context.roots ?? resolveWorkspaceRoots(context);
	const resolved = resolvedPath(expandPath(value));
	if (resolved.status === "broken") {
		return true;
	}

	return !roots.some(
		(root) =>
			isWithin(root.canonical, resolved.path) ||
			isWithin(root.lexical, resolved.path),
	);
}

export function externalPathReason(pathValue) {
	return `External path access requires user confirmation: '${pathValue}' is outside the active workspace.`;
}

export function checkToolInputPaths(toolInput, toolName = "", context = {}) {
	if (!toolInput || typeof toolInput !== "object" || Array.isArray(toolInput)) {
		return null;
	}

	for (const [key, value] of Object.entries(toolInput)) {
		if (
			PATH_FIELDS.has(key) &&
			typeof value === "string" &&
			isExternalPath(value, context) &&
			!(READ_ONLY_PATH_TOOLS.has(toolName) && isApprovedExternalReadPath(value))
		) {
			return externalPathReason(value);
		}
	}

	return null;
}

export function checkCommandPaths(command, context = {}) {
	for (const statement of splitShellStatements(command)) {
		const tokens = tokenizeStatement(statement);
		if (tokens.length <= 1) {
			continue;
		}

		for (const token of tokens.slice(1)) {
			if (
				token.startsWith("-") ||
				token.includes("=") ||
				token.startsWith("@")
			) {
				continue;
			}
			if (
				isExternalPath(token, context) &&
				!(
					isReadOnlyExternalCommand(statement) &&
					isApprovedExternalReadPath(token)
				)
			) {
				return externalPathReason(token);
			}
		}
	}

	return null;
}
