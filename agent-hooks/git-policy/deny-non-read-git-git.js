/** Git command parsing and read-only policy enforcement. */

import {
	evaluateBranchCommand,
	evaluateConfigCommand,
	evaluateReflogCommand,
	evaluateRemoteCommand,
	evaluateStashCommand,
	evaluateSubmoduleCommand,
	evaluateSymbolicRefCommand,
	evaluateTagCommand,
	STRICTLY_READ_ONLY_SUBCOMMANDS,
} from "./deny-non-read-git-git-subcommands.js";
import {
	SHELL_INTERPRETERS,
	splitShellStatements,
	tokenizeStatement,
} from "./deny-non-read-git-shell.js";

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

	if (subcommand === "reflog") {
		return evaluateReflogCommand(subTokens);
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
