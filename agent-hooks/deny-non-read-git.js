#!/usr/bin/env node
/**
 * Core safety policy engine for inspecting shell commands and file paths.
 *
 * Enforces two primary safety boundaries:
 * 1. Git command policy: Restricts `git` invocations strictly to read-only subcommands (e.g. status,
 *    diff, log) and flags any mutating operations, dangerous flags, or non-whitelisted git commands.
 * 2. Workspace boundary policy: Tokenizes shell pipelines and commands, resolves file and directory paths,
 *    and prevents unauthorized access or modification outside configured workspace roots (allowing approved
 *    exceptions such as approved skills/memory directories).
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
	checkCommandForNonReadGit,
	checkGitCommandTokens,
} from "./deny-non-read-git-git.js";
import {
	canonicalPath,
	expandPath,
	isApprovedExternalReadPath,
	isTemporaryPath,
	isWithin,
} from "./deny-non-read-git-paths.js";
import {
	splitShellStatements,
	tokenizeStatement,
} from "./deny-non-read-git-shell.js";
import {
	checkCommandPaths,
	checkToolInputPaths,
	externalPathReason,
	isExternalPath,
	READ_ONLY_PATH_TOOLS,
	resolveWorkspaceRoots,
} from "./deny-non-read-git-workspace.js";

export {
	canonicalPath,
	checkCommandForNonReadGit,
	checkCommandPaths,
	checkGitCommandTokens,
	checkToolInputPaths,
	expandPath,
	externalPathReason,
	isApprovedExternalReadPath,
	isExternalPath,
	isTemporaryPath,
	isWithin,
	READ_ONLY_PATH_TOOLS,
	resolveWorkspaceRoots,
	splitShellStatements,
	tokenizeStatement,
};

const MUTATING_GITHUB_TOOLS = new Set([
	"github-pull-request_create_pull_request",
	"mcp_github_mcp_se_create_branch",
	"mcp_github_mcp_se_create_or_update_file",
	"mcp_github_mcp_se_create_repository",
	"mcp_github_mcp_se_delete_file",
	"mcp_github_mcp_se_push_files",
]);

export function evaluateToolUse(toolName, toolInput, hookContext = {}) {
	if (!toolName || !toolInput) {
		return { decision: "allow" };
	}

	const context = {
		...hookContext,
		roots: resolveWorkspaceRoots(hookContext),
	};

	if (MUTATING_GITHUB_TOOLS.has(toolName)) {
		return {
			decision: "ask",
			reason: `Mutating Git/GitHub tool '${toolName}' requires user confirmation.`,
		};
	}

	const pathViolation = checkToolInputPaths(toolInput, toolName, context);
	if (pathViolation) {
		return { decision: "ask", reason: pathViolation };
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
		const externalPathViolation = checkCommandPaths(cmd, context);
		if (externalPathViolation) {
			return { decision: "ask", reason: externalPathViolation };
		}

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

export function runCli() {
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
	const result = evaluateToolUse(tool_name, tool_input, {
		cwd: typeof data.cwd === "string" ? data.cwd : undefined,
		transcriptPath:
			typeof data.transcript_path === "string"
				? data.transcript_path
				: undefined,
	});
	outputResult(result);
	process.exit(0);
}

const isMainModule =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
	runCli();
}
