#!/usr/bin/env node

import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function formatDateTimeSlug(date = new Date()) {
	return date.toISOString().replace(/[:.]/g, "-");
}

export function resolveShadowLogPath(sessionId, baseDir) {
	if (
		process.env.SHADOW_LOG_PATH &&
		process.env.SHADOW_LOG_PATH.trim().length > 0
	) {
		return process.env.SHADOW_LOG_PATH.trim();
	}

	const dir = baseDir || path.join(os.homedir(), ".decisions");
	const sessionsDir = path.join(dir, ".sessions");

	try {
		mkdirSync(sessionsDir, { recursive: true });

		if (sessionId && String(sessionId).trim().length > 0) {
			const safeSessionId = String(sessionId)
				.trim()
				.replace(/[^a-zA-Z0-9_-]/g, "_");
			const sessionFile = path.join(sessionsDir, `${safeSessionId}.txt`);

			if (existsSync(sessionFile)) {
				const existing = readFileSync(sessionFile, "utf8").trim();
				if (existing.length > 0) {
					return existing;
				}
			}

			const timestamp = formatDateTimeSlug();
			const newRunPath = path.join(dir, `${timestamp}_shadow.jsonl`);
			try {
				writeFileSync(sessionFile, `${newRunPath}\n`, {
					encoding: "utf8",
					flag: "wx",
				});
				return newRunPath;
			} catch (writeErr) {
				if (writeErr && writeErr.code === "EEXIST") {
					const existing = readFileSync(sessionFile, "utf8").trim();
					if (existing.length > 0) {
						return existing;
					}
				}
			}
			return newRunPath;
		}

		const latestPointerFile = path.join(sessionsDir, "latest_session.txt");
		if (existsSync(latestPointerFile)) {
			const candidatePath = readFileSync(latestPointerFile, "utf8").trim();
			if (candidatePath.length > 0 && existsSync(candidatePath)) {
				return candidatePath;
			}
		}

		const timestamp = formatDateTimeSlug();
		const newRunPath = path.join(dir, `${timestamp}_shadow.jsonl`);
		try {
			writeFileSync(latestPointerFile, `${newRunPath}\n`, "utf8");
		} catch {
			// ignore fail-safe
		}
		return newRunPath;
	} catch {
		const timestamp = formatDateTimeSlug();
		return path.join(dir, `${timestamp}_shadow.jsonl`);
	}
}

export function recordToolExecution(data, customLogPath) {
	if (!data || typeof data !== "object") {
		return;
	}

	const toolUseId = data.tool_use_id;
	if (!toolUseId || typeof toolUseId !== "string") {
		return;
	}

	const sessionId =
		typeof data.session_id === "string" ? data.session_id : undefined;
	const logPath = customLogPath || resolveShadowLogPath(sessionId);

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
