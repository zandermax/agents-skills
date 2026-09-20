#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const STRICTLY_READ_ONLY_SUBCOMMANDS = new Set([
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

const MUTATING_GITHUB_TOOLS = new Set([
	"github-pull-request_create_pull_request",
	"mcp_github_mcp_se_create_branch",
	"mcp_github_mcp_se_create_or_update_file",
	"mcp_github_mcp_se_create_repository",
	"mcp_github_mcp_se_delete_file",
	"mcp_github_mcp_se_push_files",
]);

const GIT_GLOBAL_OPTIONS_WITH_ARG = new Set([
	"-C",
	"-c",
	"--config-env",
	"--exec-path",
	"--git-dir",
	"--namespace",
	"--super-prefix",
	"--work-tree",
]);

const GIT_GLOBAL_BOOLEAN_OPTIONS = new Set([
	"--bare",
	"--glob-pathspecs",
	"--help",
	"-h",
	"--html-path",
	"--icase-pathspecs",
	"--info-path",
	"--literal-pathspecs",
	"--man-path",
	"--no-lazy-fetch",
	"--no-optional-locks",
	"--no-pager",
	"--no-replace-objects",
	"--noglob-pathspecs",
	"-p",
	"--paginate",
	"-v",
	"--version",
]);

const COMMAND_WRAPPERS = new Set([
	"builtin",
	"command",
	"doas",
	"exec",
	"nohup",
	"sudo",
	"time",
]);

const SHELL_INTERPRETERS = new Set(["bash", "fish", "sh", "zsh"]);

export function splitShellStatements(cmdLine) {
	const statements = [];
	let current = "";
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let escaped = false;

	for (let i = 0; i < cmdLine.length; i++) {
		const char = cmdLine[i];

		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === "\\" && !inSingleQuote) {
			escaped = true;
			current += char;
			continue;
		}

		if (char === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote;
			current += char;
			continue;
		}

		if (char === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote;
			current += char;
			continue;
		}

		if (!inSingleQuote && !inDoubleQuote) {
			if (char === "\n" || char === ";") {
				if (current.trim()) {
					statements.push(current.trim());
				}
				current = "";
				continue;
			}
			if (char === "&" || char === "|") {
				if (cmdLine[i + 1] === char) {
					if (current.trim()) {
						statements.push(current.trim());
					}
					current = "";
					i++;
					continue;
				}
				if (current.trim()) {
					statements.push(current.trim());
				}
				current = "";
				continue;
			}
		}

		current += char;
	}

	if (current.trim()) {
		statements.push(current.trim());
	}

	return statements;
}

export function tokenizeStatement(statement) {
	const tokens = [];
	let current = "";
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let escaped = false;

	for (let i = 0; i < statement.length; i++) {
		const char = statement[i];

		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === "\\" && !inSingleQuote) {
			escaped = true;
			continue;
		}

		if (char === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote;
			continue;
		}

		if (char === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote;
			continue;
		}

		if (!inSingleQuote && !inDoubleQuote && /\s/.test(char)) {
			if (current.length > 0) {
				tokens.push(current);
				current = "";
			}
			continue;
		}

		current += char;
	}

	if (current.length > 0) {
		tokens.push(current);
	}

	return tokens;
}

function evaluateBranchCommand(tokens) {
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

function evaluateTagCommand(tokens) {
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

function evaluateStashCommand(tokens) {
	if (tokens.length === 0) {
		return "git stash (defaults to push/create)";
	}

	const sub = tokens[0];
	if (sub === "list" || sub === "show") {
		return null;
	}

	return `git stash ${sub}`;
}

function evaluateRemoteCommand(tokens) {
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

function evaluateConfigCommand(tokens) {
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

function evaluateSubmoduleCommand(tokens) {
	if (tokens.length === 0) {
		return null;
	}

	const sub = tokens[0];
	if (sub === "status" || sub === "summary") {
		return null;
	}

	return `git submodule ${sub}`;
}

function evaluateSymbolicRefCommand(tokens) {
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

export function checkGitCommandTokens(tokens) {
	let idx = 0;

	while (idx < tokens.length) {
		const token = tokens[idx];

		if (token === "--") {
			idx++;
			break;
		}

		if (GIT_GLOBAL_BOOLEAN_OPTIONS.has(token)) {
			idx++;
			continue;
		}

		if (GIT_GLOBAL_OPTIONS_WITH_ARG.has(token)) {
			idx += 2;
			continue;
		}

		let isPrefixedArg = false;
		for (const opt of GIT_GLOBAL_OPTIONS_WITH_ARG) {
			if (
				token.startsWith(`${opt}=`) ||
				(opt === "-C" && token.startsWith("-C") && token.length > 2)
			) {
				isPrefixedArg = true;
				break;
			}
		}

		if (isPrefixedArg) {
			idx++;
			continue;
		}

		if (token.startsWith("-")) {
			idx++;
			continue;
		}

		break;
	}

	if (idx >= tokens.length) {
		return null;
	}

	const subcommand = tokens[idx];
	const subTokens = tokens.slice(idx + 1);

	if (STRICTLY_READ_ONLY_SUBCOMMANDS.has(subcommand)) {
		return null;
	}

	if (subcommand === "branch") {
		return evaluateBranchCommand(subTokens);
	}

	if (subcommand === "tag") {
		return evaluateTagCommand(subTokens);
	}

	if (subcommand === "stash") {
		return evaluateStashCommand(subTokens);
	}

	if (subcommand === "remote") {
		return evaluateRemoteCommand(subTokens);
	}

	if (subcommand === "config") {
		return evaluateConfigCommand(subTokens);
	}

	if (subcommand === "submodule") {
		return evaluateSubmoduleCommand(subTokens);
	}

	if (subcommand === "symbolic-ref") {
		return evaluateSymbolicRefCommand(subTokens);
	}

	return `git ${subcommand}`;
}

export function checkCommandForNonReadGit(fullCommand) {
	const statements = splitShellStatements(fullCommand);

	for (const stmt of statements) {
		const rawTokens = tokenizeStatement(stmt);
		if (rawTokens.length === 0) {
			continue;
		}

		let i = 0;
		while (i < rawTokens.length) {
			const tok = rawTokens[i];
			if (tok === "(" || tok === "{" || /^[A-Za-z_][A-Za-z0-9_]*=/.test(tok)) {
				i++;
				continue;
			}
			if (COMMAND_WRAPPERS.has(tok)) {
				i++;
				continue;
			}
			break;
		}

		if (i >= rawTokens.length) {
			continue;
		}

		const executable = rawTokens[i];

		if (SHELL_INTERPRETERS.has(executable)) {
			const cIndex = rawTokens.indexOf("-c", i + 1);
			if (cIndex !== -1 && cIndex + 1 < rawTokens.length) {
				const nestedViolation = checkCommandForNonReadGit(
					rawTokens[cIndex + 1],
				);
				if (nestedViolation) {
					return nestedViolation;
				}
			}
			continue;
		}

		const isGit =
			executable === "git" ||
			executable.endsWith("/git") ||
			executable === "git.exe" ||
			executable.endsWith("/git.exe");

		if (isGit) {
			const gitTokens = rawTokens.slice(i + 1);
			const violation = checkGitCommandTokens(gitTokens);
			if (violation) {
				return `Non-read git operation detected: '${violation}' in statement '${stmt}'`;
			}
		}
	}

	return null;
}

export function evaluateToolUse(toolName, toolInput) {
	if (!toolName || !toolInput) {
		return { decision: "allow" };
	}

	if (MUTATING_GITHUB_TOOLS.has(toolName)) {
		return {
			decision: "ask",
			reason: `Mutating Git/GitHub tool '${toolName}' requires user confirmation.`,
		};
	}

	const commandsToCheck = [];
	if (typeof toolInput === "string") {
		commandsToCheck.push(toolInput);
	} else if (typeof toolInput === "object" && toolInput !== null) {
		if (typeof toolInput.command === "string") {
			commandsToCheck.push(toolInput.command);
		}
		if (typeof toolInput.cmd === "string") {
			commandsToCheck.push(toolInput.cmd);
		}
		if (typeof toolInput.script === "string") {
			commandsToCheck.push(toolInput.script);
		}
	}

	for (const cmd of commandsToCheck) {
		const violation = checkCommandForNonReadGit(cmd);
		if (violation) {
			return {
				decision: "ask",
				reason: `Non-read git operation requires user confirmation: ${violation}`,
			};
		}
	}

	return { decision: "allow" };
}

function outputResult(result) {
	const output = {
		hookSpecificOutput: {
			hookEventName: "PreToolUse",
			permissionDecision: result.decision,
		},
	};

	if (result.decision !== "allow" && result.reason) {
		output.hookSpecificOutput.permissionDecisionReason = result.reason;
	}

	process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

function runCli() {
	let rawInput = "";
	try {
		rawInput = readFileSync(0, "utf-8");
	} catch {
		outputResult({ decision: "allow" });
		process.exit(0);
	}

	if (!rawInput.trim()) {
		outputResult({ decision: "allow" });
		process.exit(0);
	}

	let data;
	try {
		data = JSON.parse(rawInput);
	} catch {
		outputResult({ decision: "allow" });
		process.exit(0);
	}

	const { tool_name, tool_input } = data;
	const result = evaluateToolUse(tool_name, tool_input);
	outputResult(result);
	process.exit(0);
}

const isMainModule =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
	runCli();
}
