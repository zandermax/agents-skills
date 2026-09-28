#!/usr/bin/env node

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function recordToolExecution(data, customLogPath) {
	if (!data || typeof data !== "object") {
		return;
	}

	const toolUseId = data.tool_use_id;
	if (!toolUseId || typeof toolUseId !== "string") {
		return;
	}

	const logPath =
		customLogPath ||
		process.env.SHADOW_LOG_PATH ||
		path.join(process.cwd(), "results", "tool-decisions", "shadow.jsonl");

	const event = {
		type: "tool_execution",
		timestamp: new Date().toISOString(),
		toolUseId,
		toolName: typeof data.tool_name === "string" ? data.tool_name : undefined,
		sessionId:
			typeof data.session_id === "string" ? data.session_id : undefined,
		status: "executed",
	};

	try {
		mkdirSync(path.dirname(logPath), { recursive: true });
		appendFileSync(logPath, `${JSON.stringify(event)}\n`, "utf8");
	} catch {
		// Non-blocking fail-safe: never throw or break hook pipeline
	}
}

export function runCli() {
	try {
		const raw = readFileSync(0, "utf-8");
		if (raw && raw.trim().length > 0) {
			const data = JSON.parse(raw);
			recordToolExecution(data);
		}
	} catch {
		// Non-blocking fail-safe
	}

	const output = {
		hookSpecificOutput: {
			hookEventName: "PostToolUse",
		},
	};
	process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

const isMainModule =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
	runCli();
}
