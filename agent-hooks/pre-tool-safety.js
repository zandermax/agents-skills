#!/usr/bin/env node
/**
 * Top-level coordinator for the agent PreToolUse safety hook.
 *
 * Reads tool call payloads from stdin and evaluates them across multiple safety domains:
 * 1. GitHub mutation policies (via pre-tool-safety-git.js) preventing unauthorized PR/branch/repo edits.
 * 2. File and argument path safety (via pre-tool-safety-workspace.js) enforcing workspace boundaries.
 * 3. Command execution safety, ensuring shell commands do not escape workspace roots or run mutating git commands.
 *
 * Emits hook decisions ("allow" or "ask" with explanation for user confirmation) and optionally
 * dispatches shadow evaluations.
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolveWorkspaceRoots } from "./deny-non-read-git.js";
import {
	checkGitHubMutationPolicy,
	checkGitPolicy,
} from "./pre-tool-safety-git.js";
import {
	checkToolInputPaths,
	checkWorkspacePolicy,
} from "./pre-tool-safety-workspace.js";

export function evaluateToolUse(toolName, toolInput, hookContext = {}) {
	if (!toolName || !toolInput) {
		return { decision: "allow" };
	}

	const context = {
		...hookContext,
		roots: resolveWorkspaceRoots(hookContext),
	};

	const githubReason = checkGitHubMutationPolicy(toolName);
	if (githubReason) {
		return { decision: "ask", reason: githubReason };
	}

	const pathViolation = checkToolInputPaths(toolInput, toolName, context);
	if (pathViolation) {
		return { decision: "ask", reason: pathViolation };
	}

	const commandsToCheck = [];
	if (typeof toolInput === "string") {
		commandsToCheck.push(toolInput);
	} else if (typeof toolInput === "object" && toolInput !== null) {
		for (const field of ["command", "cmd", "script"]) {
			if (typeof toolInput[field] === "string") {
				commandsToCheck.push(toolInput[field]);
			}
		}
	}

	for (const command of commandsToCheck) {
		const workspaceViolation = checkWorkspacePolicy(command, context);
		if (workspaceViolation) {
			return { decision: "ask", reason: workspaceViolation };
		}

		const gitViolation = checkGitPolicy(command);
		if (gitViolation) {
			return {
				decision: "ask",
				reason: `Non-read git operation requires user confirmation: ${gitViolation}`,
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

const shadowCliPath = fileURLToPath(
	new URL("../src/lib/decision-model/shadow-cli.ts", import.meta.url),
);

export function dispatchShadowEvaluation(payload, spawnImpl = spawn) {
	if (process.env.DECISION_SHADOW === "0") {
		return false;
	}

	try {
		const child = spawnImpl(
			process.execPath,
			["--import", "tsx", shadowCliPath],
			{
				detached: true,
				stdio: ["pipe", "ignore", "ignore"],
				env: process.env,
			},
		);
		child.stdin?.write(JSON.stringify(payload));
		child.stdin?.end();
		child.unref?.();
		return true;
	} catch {
		return false;
	}
}

export function runCli() {
	let data;
	try {
		data = JSON.parse(readFileSync(0, "utf-8"));
	} catch {
		outputResult({ decision: "allow" });
		return;
	}

	const started = Date.now();
	const result = evaluateToolUse(data.tool_name, data.tool_input, {
		cwd: typeof data.cwd === "string" ? data.cwd : undefined,
		transcriptPath:
			typeof data.transcript_path === "string"
				? data.transcript_path
				: undefined,
	});
	const hookLatencyMs = Date.now() - started;
	outputResult(result);
	dispatchShadowEvaluation({
		toolName: typeof data.tool_name === "string" ? data.tool_name : null,
		toolInput: data.tool_input ?? null,
		hookDecision: result.decision,
		hookReason: result.reason ?? null,
		hookLatencyMs,
		cwd: typeof data.cwd === "string" ? data.cwd : process.cwd(),
		transcriptPath:
			typeof data.transcript_path === "string" ? data.transcript_path : null,
		userResolution: "deferred",
	});
}

const isMainModule =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
	runCli();
}
