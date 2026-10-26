/** Git subcommand policy rules and their read-only exception list. */

export const STRICTLY_READ_ONLY_SUBCOMMANDS = new Set([
	"annotate",
	"archive",
	"blame",
	"cat-file",
	"check-attr",
	"check-ignore",
	"check-mailmap",
	"check-ref-format",
	"count-objects",
	"describe",
	"diff",
	"diff-files",
	"diff-index",
	"diff-tree",
	"for-each-ref",
	"fsck",
	"get-tar-commit-id",
	"grep",
	"help",
	"log",
	"ls-files",
	"ls-remote",
	"ls-tree",
	"merge-base",
	"name-rev",
	"rev-list",
	"rev-parse",
	"shortlog",
	"show",
	"show-branch",
	"show-ref",
	"status",
	"var",
	"verify-commit",
	"verify-pack",
	"verify-tag",
	"version",
]);

export function evaluateBranchCommand(tokens) {
	const mutatingFlags = new Set([
		"-c",
		"-C",
		"--copy",
		"-d",
		"-D",
		"--delete",
		"--edit-description",
		"-m",
		"-M",
		"--move",
		"--set-upstream-to",
		"-u",
		"--unset-upstream",
	]);

	let hasExplicitListing = false;
	const positionalArgs = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (mutatingFlags.has(token)) {
			return `git branch with mutation flag '${token}'`;
		}
		if (
			token === "-l" ||
			token === "--list" ||
			token === "-a" ||
			token === "--all" ||
			token === "-r" ||
			token === "--remotes" ||
			token === "--show-current"
		) {
			hasExplicitListing = true;
			continue;
		}
		if (token.startsWith("-")) {
			continue;
		}
		positionalArgs.push(token);
	}

	// git branch <branchname> creates a branch unless explicitly listing
	if (positionalArgs.length > 0 && !hasExplicitListing) {
		return `git branch creation for '${positionalArgs[0]}'`;
	}

	return null;
}

export function evaluateTagCommand(tokens) {
	const mutatingFlags = new Set([
		"-a",
		"-d",
		"--delete",
		"-f",
		"--force",
		"-s",
		"-u",
	]);

	let hasExplicitListing = false;
	const positionalArgs = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (mutatingFlags.has(token)) {
			return `git tag with mutation flag '${token}'`;
		}
		if (
			token === "-l" ||
			token === "--list" ||
			token === "-n" ||
			token === "-v" ||
			token === "--verify"
		) {
			hasExplicitListing = true;
			continue;
		}
		if (token.startsWith("-")) {
			continue;
		}
		positionalArgs.push(token);
	}

	if (positionalArgs.length > 0 && !hasExplicitListing) {
		return `git tag creation for '${positionalArgs[0]}'`;
	}

	return null;
}

export function evaluateStashCommand(tokens) {
	if (tokens.length === 0) {
		return "git stash (defaults to push/create)";
	}

	const sub = tokens[0];
	if (sub === "list" || sub === "show") {
		return null;
	}

	return `git stash ${sub}`;
}

export function evaluateRemoteCommand(tokens) {
	if (tokens.length === 0) {
		return null;
	}

	const sub = tokens[0];
	if (
		sub === "-v" ||
		sub === "--verbose" ||
		sub === "show" ||
		sub === "get-url"
	) {
		return null;
	}

	return `git remote ${sub}`;
}

export function evaluateConfigCommand(tokens) {
	let isReadOperation = false;
	for (const token of tokens) {
		if (
			token === "-l" ||
			token === "--list" ||
			token === "--get" ||
			token === "--get-all" ||
			token === "--get-regexp" ||
			token === "--get-urlmatch"
		) {
			isReadOperation = true;
			break;
		}
	}

	if (isReadOperation) {
		return null;
	}

	return "git config modification";
}

export function evaluateSubmoduleCommand(tokens) {
	if (tokens.length === 0) {
		return null;
	}

	const sub = tokens[0];
	if (sub === "status" || sub === "summary") {
		return null;
	}

	return `git submodule ${sub}`;
}

export function evaluateSymbolicRefCommand(tokens) {
	for (const token of tokens) {
		if (token === "-d" || token === "--delete") {
			return "git symbolic-ref deletion";
		}
	}

	const positional = tokens.filter((t) => !t.startsWith("-"));
	if (positional.length > 1) {
		return "git symbolic-ref update";
	}

	return null;
}

export function evaluateReflogCommand(tokens) {
	const nonFlag = tokens.find((t) => !t.startsWith("-"));
	if (nonFlag === "expire" || nonFlag === "delete" || nonFlag === "drop") {
		return `git reflog ${nonFlag}`;
	}

	return null;
}
