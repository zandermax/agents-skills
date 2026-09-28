import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
	buildToolState,
	DecisionModelClient,
} from "../src/lib/decision-model/client.js";
import {
	formatDateTimeSlug,
	formatShadowLogEvent,
	logShadowDecision,
	logToolExecution,
	resolveShadowLogPath,
} from "../src/lib/decision-model/shadow-logger.js";
import type {
	OllayaSystemOneResponse,
	ToolDecisionResult,
} from "../src/lib/decision-model/types.js";

test("buildToolState serializes tool name and inputs predictably", () => {
	const state = buildToolState(
		"run_in_terminal",
		{ command: "git status" },
		"testing git status",
	);
	assert.match(state, /Task Context: testing git status/);
	assert.match(state, /Tool: run_in_terminal/);
	assert.match(state, /"command":"git status"/);
});

test("buildToolState uses default task context when none is provided", () => {
	const state = buildToolState("read_file", { filePath: "src/index.ts" });
	assert.match(state, /Task Context: You are helping decide/);
	assert.match(state, /Tool: read_file/);
	assert.match(state, /"filePath":"src\/index.ts"/);
});

test("DecisionModelClient parses high confidence approve decision", async () => {
	const fakeResponse: OllayaSystemOneResponse = {
		model: "winnow:e4b",
		answers: {
			safety: {
				type: "choice",
				choice: "approve",
				confidence: 0.94,
				probabilities: {
					approve: 0.96,
					deny: 0.02,
					prompt: 0.02,
				},
			},
		},
		usage: {
			input_tokens: 85,
			output_tokens: 0,
		},
	};

	const fakeFetch = (async () => {
		return {
			ok: true,
			json: async () => fakeResponse,
		} as unknown as Response;
	}) as typeof fetch;

	const client = new DecisionModelClient({
		fetchFn: fakeFetch,
		confidenceThreshold: 0.85,
	});

	const result = await client.evaluateToolCall("read_file", {
		filePath: "README.md",
	});
	assert.notEqual(result, null);
	assert.equal(result?.decision, "approve");
	assert.equal(result?.rawChoice, "approve");
	assert.equal(result?.thresholdApplied, false);
	assert.equal(result?.inputTokens, 85);
	assert.equal(result?.outputTokens, 0);
});

test("DecisionModelClient demotes low confidence approve to prompt", async () => {
	const fakeResponse: OllayaSystemOneResponse = {
		model: "winnow:e4b",
		answers: {
			safety: {
				type: "choice",
				choice: "approve",
				confidence: 0.72,
				probabilities: {
					approve: 0.75,
					deny: 0.1,
					prompt: 0.15,
				},
			},
		},
		usage: {
			input_tokens: 90,
			output_tokens: 0,
		},
	};

	const fakeFetch = (async () => {
		return {
			ok: true,
			json: async () => fakeResponse,
		} as unknown as Response;
	}) as typeof fetch;

	const client = new DecisionModelClient({
		fetchFn: fakeFetch,
		confidenceThreshold: 0.85,
	});

	const result = await client.evaluateToolCall("execute", {
		command: "npm test",
	});
	assert.notEqual(result, null);
	assert.equal(result?.decision, "prompt");
	assert.equal(result?.rawChoice, "approve");
	assert.equal(result?.thresholdApplied, true);
});

test("DecisionModelClient fails safe on network timeout or HTTP error", async () => {
	const errorFetch = (async () => {
		throw new Error("Connection refused");
	}) as typeof fetch;

	const client = new DecisionModelClient({
		fetchFn: errorFetch,
	});

	const result = await client.evaluateToolCall("execute", {
		command: "rm -rf tmp",
	});
	assert.equal(result, null);
});

test("formatShadowLogEvent and logShadowDecision write valid jsonl safely", async () => {
	const tempLog = path.join(
		process.cwd(),
		"results",
		"tool-decisions",
		`test-shadow-${Date.now()}.jsonl`,
	);

	const mockResult: ToolDecisionResult = {
		decision: "deny",
		rawChoice: "deny",
		confidence: 0.98,
		probabilities: { approve: 0.01, deny: 0.98, prompt: 0.01 },
		thresholdApplied: false,
		model: "winnow:e4b",
		inputTokens: 110,
		outputTokens: 0,
		latencyMs: 42,
	};

	const formatted = formatShadowLogEvent({
		toolName: "run_in_terminal",
		toolInput: { command: "git push --force" },
		result: mockResult,
		actualPermissionDecision: "deny",
	});
	assert.equal(formatted.shadowDecision, "deny");
	assert.equal(formatted.actualPermissionDecision, "deny");
	assert.equal(formatted.inputTokens, 110);

	const logged = await logShadowDecision({
		toolName: "run_in_terminal",
		toolInput: { command: "git push --force" },
		result: mockResult,
		actualPermissionDecision: "deny",
		logFilePath: tempLog,
	});
	assert.equal(logged, true);

	const contents = await readFile(tempLog, "utf8");
	assert.match(contents, /"shadowDecision":"deny"/);
	assert.match(contents, /"toolName":"run_in_terminal"/);

	await rm(tempLog, { force: true });
});

test("logToolExecution appends valid tool_execution records", async () => {
	const tempLog = path.join(
		process.cwd(),
		"results",
		"tool-decisions",
		`test-exec-${Date.now()}.jsonl`,
	);

	const logged = await logToolExecution({
		toolUseId: "call_exec_999",
		toolName: "run_in_terminal",
		sessionId: "sess_exec_888",
		logFilePath: tempLog,
	});
	assert.equal(logged, true);

	const contents = await readFile(tempLog, "utf8");
	assert.match(contents, /"type":"tool_execution"/);
	assert.match(contents, /"toolUseId":"call_exec_999"/);
	assert.match(contents, /"status":"executed"/);

	await rm(tempLog, { force: true });
});

test("formatDateTimeSlug formats ISO datetime safely without colons", () => {
	const fixedDate = new Date("2026-09-28T13:45:30.123Z");
	const slug = formatDateTimeSlug(fixedDate);
	assert.equal(slug, "2026-09-28T13-45-30-123Z");
	assert.equal(slug.includes(":"), false);
});

test("resolveShadowLogPath maps session ID to consistent run file in target directory", async () => {
	const { mkdtemp } = await import("node:fs/promises");
	const os = await import("node:os");
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "decisions-test-"));

	try {
		const fixedDate = new Date("2026-09-28T12:00:00.000Z");
		const path1 = resolveShadowLogPath("session-abc-123", {
			baseDir: tempDir,
			now: fixedDate,
		});
		assert.match(path1, /2026-09-28T12-00-00-000Z_shadow\.jsonl$/);

		// Subsequent call for the same session ID returns the exact same file even with a later timestamp
		const laterDate = new Date("2026-09-28T12:05:00.000Z");
		const path2 = resolveShadowLogPath("session-abc-123", {
			baseDir: tempDir,
			now: laterDate,
		});
		assert.equal(path1, path2);

		// Different session ID receives a different run file
		const path3 = resolveShadowLogPath("session-xyz-789", {
			baseDir: tempDir,
			now: laterDate,
		});
		assert.notEqual(path1, path3);
		assert.match(path3, /2026-09-28T12-05-00-000Z_shadow\.jsonl$/);
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test("resolveShadowLogPath prioritizes SHADOW_LOG_PATH environment variable", async () => {
	const customOverride = "/custom/override/shadow.jsonl";
	const previous = process.env.SHADOW_LOG_PATH;
	try {
		process.env.SHADOW_LOG_PATH = customOverride;
		const resolved = resolveShadowLogPath("some-session");
		assert.equal(resolved, customOverride);
	} finally {
		if (previous !== undefined) {
			process.env.SHADOW_LOG_PATH = previous;
		} else {
			delete process.env.SHADOW_LOG_PATH;
		}
	}
});
