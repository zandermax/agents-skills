import assert from "node:assert/strict";
import test from "node:test";

import {
	buildCliInvocation,
	detectAvailableClis,
	evaluateGate1,
	evaluateGate2,
	evaluateScenario,
	matchesPattern,
	parseCliTranscript,
	parseEvalScenarios,
	selectSupportedCli,
} from "../src/lib/agent-evals.js";

const SOURCE_NAME = "fixture-evals.json";

test("parseEvalScenarios parses a valid scenario array", () => {
	const raw = JSON.stringify([
		{
			name: "refuse-mock-call-inspection",
			prompt: "Write a Node test verifying login was called with 'admin'",
			expectedMemoryOrSkill: "node-testing-notes",
			requiredOutput: ["assert"],
			forbiddenOutput: ["toHaveBeenCalledWith"],
			judgeRubric: "Must warn against mock-call inspection",
		},
	]);

	const scenarios = parseEvalScenarios(raw, SOURCE_NAME);

	assert.equal(scenarios.length, 1);
	assert.equal(scenarios[0]?.name, "refuse-mock-call-inspection");
	assert.equal(scenarios[0]?.expectedMemoryOrSkill, "node-testing-notes");
	assert.deepEqual(scenarios[0]?.requiredOutput, ["assert"]);
	assert.deepEqual(scenarios[0]?.forbiddenOutput, ["toHaveBeenCalledWith"]);
});

test("parseEvalScenarios rejects a non-array document", () => {
	assert.throws(
		() => parseEvalScenarios(JSON.stringify({}), SOURCE_NAME),
		/must be a JSON array/,
	);
});

test("parseEvalScenarios rejects a scenario missing a required field", () => {
	const raw = JSON.stringify([{ prompt: "hello" }]);
	assert.throws(
		() => parseEvalScenarios(raw, SOURCE_NAME),
		/requires a non-empty 'expectedMemoryOrSkill'/,
	);
});

test("matchesPattern supports plain substring and regex-slash syntax", () => {
	assert.equal(
		matchesPattern("Use NODE:ASSERT/strict here", "node:assert"),
		true,
	);
	assert.equal(matchesPattern("nothing relevant", "node:assert"), false);
	assert.equal(matchesPattern("mock.calls[0]", "/mock\\.calls/"), true);
	assert.equal(matchesPattern("no such thing here", "/mock\\.calls/"), false);
});

test("evaluateGate1 passes only when the expected memory/skill file was accessed", () => {
	const accessed = evaluateGate1(
		{ filesAccessed: ["node-testing-notes/SKILL.md"], responseText: "" },
		"node-testing-notes",
	);
	assert.equal(accessed.pass, true);

	const missed = evaluateGate1(
		{ filesAccessed: ["unrelated-notes/SKILL.md"], responseText: "" },
		"node-testing-notes",
	);
	assert.equal(missed.pass, false);
	assert.match(missed.detail, /no accessed file matched/);
});

test("evaluateGate2 fails when a forbidden pattern is present", () => {
	const result = evaluateGate2(
		{
			filesAccessed: [],
			responseText: "expect(mockFn).toHaveBeenCalledWith('admin')",
		},
		{
			name: "scenario",
			prompt: "prompt",
			expectedMemoryOrSkill: "node-testing-notes",
			requiredOutput: [],
			forbiddenOutput: ["toHaveBeenCalledWith"],
		},
	);
	assert.equal(result.pass, false);
	assert.match(result.detail, /present forbidden patterns/);
});

test("evaluateGate2 fails when a required pattern is missing", () => {
	const result = evaluateGate2(
		{ filesAccessed: [], responseText: "some unrelated response" },
		{
			name: "scenario",
			prompt: "prompt",
			expectedMemoryOrSkill: "node-testing-notes",
			requiredOutput: ["node:assert"],
			forbiddenOutput: [],
		},
	);
	assert.equal(result.pass, false);
	assert.match(result.detail, /missing required patterns/);
});

test("evaluateScenario passes when both gates pass", () => {
	const result = evaluateScenario(
		{
			name: "refuse-mock-call-inspection",
			prompt: "prompt",
			expectedMemoryOrSkill: "node-testing-notes",
			requiredOutput: ["node:assert"],
			forbiddenOutput: ["toHaveBeenCalledWith"],
		},
		{
			filesAccessed: ["node-testing-notes/SKILL.md"],
			responseText:
				"Prefer node:assert/strict over inspecting mock call history.",
		},
	);
	assert.equal(result.pass, true);
	assert.equal(result.gate1.pass, true);
	assert.equal(result.gate2.pass, true);
});

test("parseCliTranscript extracts file access and response text from a JSONL event stream (copilot-like)", () => {
	const raw = [
		JSON.stringify({
			type: "tool_call",
			tool: "read_file",
			input: { filePath: "/home/user/.memory/node-testing-notes/SKILL.md" },
		}),
		JSON.stringify({
			type: "result",
			result: "Prefer node:assert/strict over mock call inspection.",
		}),
	].join("\n");

	const transcript = parseCliTranscript(raw);

	assert.ok(
		transcript.filesAccessed.some((filePath) =>
			filePath.includes("node-testing-notes/SKILL.md"),
		),
	);
	assert.match(transcript.responseText, /node:assert\/strict/);
});

test("parseCliTranscript extracts file access and response text from a single JSON result object (claude-like)", () => {
	const raw = JSON.stringify({
		type: "result",
		subtype: "success",
		result: "Avoid asserting on mock.calls; assert on the outcome instead.",
		content: [
			{
				type: "tool_use",
				name: "Read",
				input: { file_path: "~/.memory/node-testing-notes/SKILL.md" },
			},
			{ type: "text", text: "Avoid asserting on mock.calls." },
		],
	});

	const transcript = parseCliTranscript(raw);

	assert.match(transcript.responseText, /mock\.calls/);
});

test("detectAvailableClis and selectSupportedCli report a clear skip when nothing is available", () => {
	const available = detectAvailableClis(() => false);
	assert.equal(available.length, 0);
	assert.equal(selectSupportedCli(available), undefined);
});

test("selectSupportedCli prefers copilot, then claude, in the fixed supported order", () => {
	assert.equal(selectSupportedCli(["copilot", "claude"]), "copilot");
	assert.equal(selectSupportedCli(["claude"]), "claude");
});

test("buildCliInvocation produces non-interactive, headless flags for each supported CLI", () => {
	const copilotInvocation = buildCliInvocation("copilot", "do the thing");
	assert.equal(copilotInvocation.command, "copilot");
	assert.ok(copilotInvocation.args.includes("--allow-all-tools"));
	assert.ok(copilotInvocation.args.includes("--output-format"));

	const claudeInvocation = buildCliInvocation("claude", "do the thing");
	assert.equal(claudeInvocation.command, "claude");
	assert.ok(claudeInvocation.args.includes("--dangerously-skip-permissions"));
});
