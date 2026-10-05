import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
	applyConfidenceThreshold,
	buildSafetyRequest,
	CONFIDENCE_THRESHOLD,
	DEFAULT_DECISION_MODEL,
	decideToolSafety,
	LAYA_DECISION_MODEL,
	TOOL_SAFETY_CRITERIA,
} from "../src/lib/decision-model/client.js";
import {
	appendShadowRecord,
	createShadowLogRecord,
	defaultShadowLogPath,
	sessionIdFromTranscriptPath,
} from "../src/lib/decision-model/log.js";
import { runShadowPayload } from "../src/lib/decision-model/shadow-cli.js";

const validBody = {
	model: LAYA_DECISION_MODEL,
	answers: {
		safety: {
			type: "choice",
			choice: "approve",
			confidence: 0.91,
			probabilities: { approve: 0.8, deny: 0.1, prompt: 0.1 },
		},
	},
	usage: { input_tokens: 32, output_tokens: 0 },
};

test("buildSafetyRequest formulates a systemone choice question", () => {
	const request = buildSafetyRequest({
		model: LAYA_DECISION_MODEL,
		state: "git status",
	});

	assert.deepEqual(request, {
		model: LAYA_DECISION_MODEL,
		state: "git status",
		questions: {
			safety: { type: "choice", criteria: TOOL_SAFETY_CRITERIA },
		},
	});
	assert.equal(
		buildSafetyRequest({ state: "x" }).model,
		DEFAULT_DECISION_MODEL,
	);
});

test("decideToolSafety parses a high-confidence approval", async () => {
	const decision = await decideToolSafety(
		{ model: LAYA_DECISION_MODEL, state: "git status" },
		{ fetch: jsonFetch(validBody) },
	);

	assert.equal(decision.rawChoice, "approve");
	assert.equal(decision.decision, "approve");
	assert.equal(decision.confidence, 0.91);
	assert.equal(decision.inputTokens, 32);
	assert.equal(decision.outputTokens, 0);
	assert.equal(decision.promptTokens, 32);
	assert.equal(decision.error, null);
});

test("applyConfidenceThreshold maps low or missing confidence to prompt", () => {
	assert.equal(applyConfidenceThreshold("deny", CONFIDENCE_THRESHOLD), "deny");
	assert.equal(
		applyConfidenceThreshold("approve", CONFIDENCE_THRESHOLD - 0.01),
		"prompt",
	);
	assert.equal(applyConfidenceThreshold("deny", null), "prompt");
	assert.equal(applyConfidenceThreshold("prompt", 0.99), "prompt");
});

test("decideToolSafety maps a low-confidence denial to prompt", async () => {
	const decision = await decideToolSafety(
		{ state: "rm -rf /" },
		{
			fetch: jsonFetch({
				answers: { safety: { choice: "deny", confidence: 0.34 } },
				usage: { input_tokens: 10, output_tokens: 0 },
			}),
		},
	);

	assert.equal(decision.rawChoice, "deny");
	assert.equal(decision.decision, "prompt");
});

test("decideToolSafety returns prompt when the request times out", async () => {
	const decision = await decideToolSafety(
		{ state: "git status" },
		{
			timeoutMs: 5,
			fetch: (_input, init) =>
				new Promise((_resolve, reject) => {
					const signal = init?.signal;
					if (signal) {
						signal.addEventListener("abort", () => {
							reject(signal.reason ?? new Error("timeout"));
						});
					}
				}),
		},
	);

	assert.equal(decision.decision, "prompt");
	assert.equal(decision.rawChoice, null);
	assert.ok(decision.error);
});

test("decideToolSafety returns prompt when the server is offline", async () => {
	const decision = await decideToolSafety(
		{ state: "git status" },
		{
			fetch: () => Promise.reject(new TypeError("fetch failed")),
		},
	);

	assert.equal(decision.decision, "prompt");
	assert.equal(decision.error, "fetch failed");
});

test("decideToolSafety returns prompt for an error body", async () => {
	const decision = await decideToolSafety(
		{ state: "git status" },
		{
			fetch: jsonFetch(
				{ error: "model not found", code: "MODEL_NOT_FOUND" },
				404,
			),
		},
	);

	assert.equal(decision.decision, "prompt");
	assert.equal(decision.error, "model not found");
});

test("appendShadowRecord writes one JSON line under an injected directory", async () => {
	const directory = await mkdtemp(join(tmpdir(), "decision-model-"));
	const logPath = join(directory, "shadow.jsonl");
	const record = createShadowLogRecord(
		{
			model: DEFAULT_DECISION_MODEL,
			rawChoice: "approve",
			decision: "approve",
			confidence: 0.9,
			inputTokens: 4,
			outputTokens: 0,
			promptTokens: 4,
			error: null,
		},
		{
			cwd: "/tmp/workspace",
			timestamp: "2026-10-02T00:00:00.000Z",
			baselineTokens: 12,
		},
	);

	assert.equal(await appendShadowRecord(record, logPath), true);

	const written = JSON.parse(await readFile(logPath, "utf8"));
	assert.equal(written.cwd, "/tmp/workspace");
	assert.equal(written.baselineTokens, 12);
	assert.equal(written.promptTokens, 4);
	assert.equal(
		sessionIdFromTranscriptPath("/tmp/sessions/abc-123.jsonl"),
		"abc-123",
	);
	assert.equal(
		defaultShadowLogPath(
			"abc-123",
			new Date("2026-10-02T00:00:00.000Z"),
		).endsWith("/.decisions/sessions/abc-123.jsonl"),
		true,
	);
	assert.equal(
		defaultShadowLogPath(null, new Date("2026-10-02T00:00:00.000Z")).endsWith(
			"/.decisions/sessions/unknown-2026-10-02.jsonl",
		),
		true,
	);
});

test("appendShadowRecord does not throw when the log path cannot be created", async () => {
	const directory = await mkdtemp(join(tmpdir(), "decision-model-"));
	const blockingFile = join(directory, "not-a-directory");
	await writeFile(blockingFile, "x");

	const written = await appendShadowRecord(
		createShadowLogRecord({
			model: DEFAULT_DECISION_MODEL,
			rawChoice: null,
			decision: "prompt",
			confidence: null,
			inputTokens: null,
			outputTokens: null,
			promptTokens: null,
			error: "offline",
		}),
		join(blockingFile, "shadow.jsonl"),
	);

	assert.equal(written, false);
});

test("runShadowPayload appends hook ground truth and shadow latency", async () => {
	const directory = await mkdtemp(join(tmpdir(), "decision-model-"));
	const logPath = join(directory, "shadow.jsonl");

	const written = await runShadowPayload(
		{
			toolName: "run_in_terminal",
			toolInput: { command: "git status" },
			hookDecision: "allow",
			hookReason: null,
			hookLatencyMs: 2,
			cwd: "/tmp/workspace",
			userResolution: "deferred",
		},
		{
			logPath,
			now: (() => {
				let calls = 0;
				return () => (calls++ === 0 ? 100 : 107);
			})(),
			fetch: jsonFetch({
				answers: { safety: { choice: "approve", confidence: 0.91 } },
				usage: { input_tokens: 8, output_tokens: 0 },
			}),
		},
	);

	assert.equal(written, true);
	const record = JSON.parse(await readFile(logPath, "utf8"));
	assert.equal(record.toolName, "run_in_terminal");
	assert.equal(record.hookDecision, "allow");
	assert.equal(record.userResolution, "deferred");
	assert.equal(record.hookLatencyMs, 2);
	assert.equal(record.shadowLatencyMs, 7);
	assert.equal(record.decision, "approve");
	assert.equal(record.cwd, "/tmp/workspace");
});

function jsonFetch(body: unknown, status = 200): typeof fetch {
	return () =>
		Promise.resolve(
			new Response(JSON.stringify(body), {
				status,
				headers: { "content-type": "application/json" },
			}),
		);
}
