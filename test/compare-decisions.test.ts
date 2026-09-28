import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	calculatePercentile,
	calculateWilsonScoreInterval,
	evaluateModelRecords,
	generateExperimentSummaryReport,
	reconcileUserOutcomes,
} from "../src/lib/decision-model/comparison.js";
import type {
	ShadowLogEvent,
	ShadowLogRecord,
} from "../src/lib/decision-model/types.js";

const FIXTURE_PATH = path.join(
	process.cwd(),
	"test",
	"fixtures",
	"shadow-decisions-sample.jsonl",
);

function loadSampleRecords(): ShadowLogRecord[] {
	const raw = readFileSync(FIXTURE_PATH, "utf8");
	return raw
		.split("\n")
		.filter((line) => line.trim().length > 0)
		.map((line) => JSON.parse(line) as ShadowLogRecord);
}

function loadSampleEvents(): ShadowLogEvent[] {
	return reconcileUserOutcomes(loadSampleRecords());
}

test("calculateWilsonScoreInterval handles boundary cases and calculates intervals", () => {
	const zero = calculateWilsonScoreInterval(0, 0);
	assert.equal(zero.point, 0);
	assert.equal(zero.lower, 0);
	assert.equal(zero.upper, 0);

	const perfect = calculateWilsonScoreInterval(10, 10);
	assert.equal(perfect.point, 1);
	assert.ok(perfect.lower > 0.65);
	assert.equal(perfect.upper, 1);

	const zeroSuccess = calculateWilsonScoreInterval(0, 20);
	assert.equal(zeroSuccess.point, 0);
	assert.equal(zeroSuccess.lower, 0);
	assert.ok(zeroSuccess.upper < 0.2);

	const half = calculateWilsonScoreInterval(50, 100);
	assert.equal(half.point, 0.5);
	assert.ok(half.lower > 0.39 && half.lower < 0.42);
	assert.ok(half.upper > 0.58 && half.upper < 0.61);
});

test("calculatePercentile calculates p50 and p90 on sorted arrays", () => {
	const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
	assert.equal(calculatePercentile(values, 50), 55);
	assert.equal(calculatePercentile(values, 90), 91);
});

test("evaluateModelRecords produces stratified metrics for winnow:e4b", () => {
	const events = loadSampleEvents();
	const report = evaluateModelRecords("winnow:e4b", events);

	assert.equal(report.modelName, "winnow:e4b");
	assert.equal(report.totalRecords, 13);
	assert.equal(report.timeoutCount, 1);
	assert.equal(report.errorCount, 0);
	assert.equal(report.validEvaluationCount, 13);

	// Confusion matrix
	const cm = report.confusionMatrix;
	assert.equal(cm.falseApprovalCount, 1); // exactly 1 false approval (git tag v1.0)
	assert.ok(cm.precision > 0);
	assert.ok(cm.recall > 0);

	// Calibration & sweep
	assert.ok(report.brierScore >= 0 && report.brierScore <= 1);
	assert.equal(report.reliabilityBins.length, 10);
	assert.equal(report.thresholdSweep.length, 7);

	// Latency
	assert.equal(report.latency.count, 13);
	assert.ok(report.latency.p50Ms > 0);
	assert.equal(report.latency.p99Ms, undefined); // under 100 records

	// User choice evaluation
	assert.equal(report.userChoiceEvaluation.totalUserPrompts, 6);
	assert.equal(report.userChoiceEvaluation.userApprovedCount, 3);
	assert.equal(report.userChoiceEvaluation.userDeniedCount, 3);
	assert.equal(report.userChoiceEvaluation.safePromptEliminationCount, 1);
	assert.equal(report.userChoiceEvaluation.humanFalseApprovalCount, 0);

	// Token comparison
	assert.ok(report.tokenComparison.netTokensSaved > 0);
	assert.ok(report.tokenComparison.tokenSavingsPercentage > 60);
});

test("reconcileUserOutcomes correlates PostToolUse executions to userOutcome approved", () => {
	const records = loadSampleRecords();
	const events = reconcileUserOutcomes(records);
	assert.equal(events.length, 16);

	const call07 = events.find((e) => e.toolUseId === "call_07");
	assert.equal(call07?.userOutcome, "approved");

	const call08 = events.find((e) => e.toolUseId === "call_08");
	assert.equal(call08?.userOutcome, "rejected");
});

test("generateExperimentSummaryReport stratifies without pooling models", () => {
	const events = loadSampleEvents();
	const report = generateExperimentSummaryReport("sample-fixture", events);

	assert.equal(report.totalRecordsProcessed, 16);
	assert.ok("winnow:e4b" in report.modelBreakdown);
	assert.ok("laya:en" in report.modelBreakdown);

	const winnowReport = report.modelBreakdown["winnow:e4b"];
	const layaReport = report.modelBreakdown["laya:en"];

	assert.equal(winnowReport?.totalRecords, 13);
	assert.equal(layaReport?.totalRecords, 3);
	// Confirm separate metrics
	assert.notEqual(
		winnowReport?.tokenComparison.totalOllayaInputTokens,
		layaReport?.tokenComparison.totalOllayaInputTokens,
	);
});
