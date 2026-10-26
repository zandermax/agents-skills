/** Path normalization and approved external-read policy helpers. */

import { lstatSync, realpathSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

export function expandPath(value) {
	return value === "~"
		? resolve(process.env.HOME ?? "")
		: value.startsWith("~/")
			? resolve(process.env.HOME ?? "", value.slice(2))
			: value.startsWith("$HOME/") || value.startsWith(`\${HOME}/`)
				? resolve(process.env.HOME ?? "", value.replace(/^\$\{?HOME\}?\//, ""))
				: resolve(value);
}

export function canonicalPath(value) {
	const expandedValue = expandPath(value);
	try {
		return realpathSync.native(expandedValue);
	} catch {
		const parent = resolve(expandedValue, "..");
		if (parent === expandedValue) {
			return expandedValue;
		}
		return resolve(canonicalPath(parent), relative(parent, expandedValue));
	}
}

export function isWithin(root, candidate, requireDescendant = false) {
	const relativePath = relative(root, candidate);
	return (
		(!requireDescendant && relativePath === "") ||
		(relativePath !== "" &&
			relativePath !== ".." &&
			!relativePath.startsWith(`..${sep}`) &&
			!relativePath.startsWith(sep))
	);
}

export function isTemporaryPath(value) {
	if (typeof value !== "string" || value.length === 0) {
		return false;
	}

	const expanded = expandPath(value);
	const resolved = resolvedPath(expanded);
	if (resolved.status === "broken") {
		return false;
	}

	const temporaryRoot = canonicalPath(resolve(sep, "tmp"));
	const lexicalTmp = resolve(sep, "tmp");
	return (
		isWithin(temporaryRoot, resolved.path) ||
		isWithin(lexicalTmp, resolved.path)
	);
}

export function isApprovedExternalReadPath(value) {
	if (isTemporaryPath(value)) {
		return true;
	}

	const expanded = expandPath(value);
	const candidate = canonicalPath(expanded);

	if (
		candidate.startsWith(`${sep}memories${sep}`) ||
		candidate === `${sep}memories` ||
		expanded.startsWith(`${sep}memories${sep}`) ||
		expanded === `${sep}memories`
	) {
		return false;
	}

	const home = resolve(process.env.HOME ?? "");
	const approvedRoots = [
		resolve(home, ".memory"),
		resolve(home, ".agents"),
		resolve(home, ".copilot"),
		resolve(home, ".claude"),
		resolve(home, ".vscode", "extensions"),
		resolve(home, ".vscode-insiders", "extensions"),
		"/Applications/Visual Studio Code.app",
		"/Applications/Visual Studio Code - Insiders.app",
	];

	if (
		approvedRoots.some((root) => {
			const canonicalRoot = canonicalPath(root);
			return (
				isWithin(canonicalRoot, candidate) ||
				isWithin(canonicalRoot, expanded) ||
				isWithin(root, candidate) ||
				isWithin(root, expanded)
			);
		})
	) {
		return true;
	}

	const configRoots = [
		resolve(home, "Library", "Application Support"),
		resolve(home, ".config"),
	];
	for (const baseRoot of configRoots) {
		for (const codeVariant of ["Code", "Code - Insiders"]) {
			const appRoots = [
				resolve(baseRoot, codeVariant, "copilot-terminal-output"),
				resolve(baseRoot, codeVariant, "logs"),
				resolve(baseRoot, codeVariant, "User", "workspaceStorage"),
				resolve(baseRoot, codeVariant, "User", "prompts"),
				resolve(baseRoot, codeVariant, "User", "globalStorage"),
			];
			for (const storageRoot of appRoots) {
				const canonicalStorageRoot = canonicalPath(storageRoot);
				if (
					isWithin(canonicalStorageRoot, candidate) ||
					isWithin(canonicalStorageRoot, expanded) ||
					isWithin(storageRoot, candidate) ||
					isWithin(storageRoot, expanded)
				) {
					return true;
				}
			}
		}
	}

	return false;
}

export function resolvedPath(expanded) {
	try {
		lstatSync(expanded);
	} catch (error) {
		if (error?.code !== "ENOENT") {
			return { status: "broken" };
		}
		return resolveMissingPath(expanded);
	}

	try {
		return { status: "resolved", path: realpathSync.native(expanded) };
	} catch {
		return { status: "broken" };
	}
}

function resolveMissingPath(expanded) {
	const parent = resolve(expanded, "..");
	if (parent === expanded) {
		return { status: "lexical", path: expanded };
	}

	const parentResolved = resolvedPath(parent);
	if (parentResolved.status === "broken") {
		return parentResolved;
	}

	return {
		status: "resolved",
		path: resolve(parentResolved.path, relative(parent, expanded)),
	};
}
