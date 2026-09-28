#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
	checkGitHubMutationPolicy,
	checkGitPolicy,
} from "./pre-tool-safety-git.js";
import {
	checkToolInputPaths,
	checkWorkspacePolicy,
} from "./pre-tool-safety-workspace.js";

async function dispatchShadowEvaluation(toolName, toolInput, decisionResult) {
	try {
		const { DecisionModelClient } =
			await import("../../src/lib/decision-model/client.js");
		const { logShadowDecision } =
			await import("../../src/lib/decision-model/shadow-logger.js");

		const client = new DecisionModelClient({ timeoutMs: 2500 });
		const shadowResult = await client.evaluateToolCall(toolName, toolInput);
		if (shadowResult) {
			await logShadowDecision({
				toolName,
				toolInput,
				result: shadowResult,
				actualPermissionDecision: decisionResult.decision,
			});
		}
	} catch {
		// Non-blocking fail-safe: never throw or alter hook decision
	}
}

export function evaluateToolUse(toolName, toolInput) {
	if (!toolName || !toolInput) {
		return { decision: "allow" };
	}

	const githubReason = checkGitHubMutationPolicy(toolName);
	if (githubReason) {
		return { decision: "ask", reason: githubReason };
	}

	const pathViolation = checkToolInputPaths(toolInput, toolName);
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
		const workspaceViolation = checkWorkspacePolicy(command);
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

export function runCli() {
	let data;
	try {
		data = JSON.parse(readFileSync(0, "utf-8"));
	} catch {
		outputResult({ decision: "allow" });
		return;
	}

	const result = evaluateToolUse(data.tool_name, data.tool_input);
	outputResult(result);

	if (data.tool_name && data.tool_input) {
		// Non-blocking background shadow evaluation
		dispatchShadowEvaluation(data.tool_name, data.tool_input, result).catch(
			() => {},
		);
	}
}

const isMainModule =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
	runCli();
}
