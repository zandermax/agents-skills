#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
	generateExperimentSummaryReport,
	type ModelEvaluationReport,
} from "../src/lib/decision-model/comparison.js";
import { DEFAULT_SHADOW_LOG_PATH } from "../src/lib/decision-model/shadow-logger.js";
import type { ShadowLogEvent } from "../src/lib/decision-model/types.js";

function parseArgs(): { fixturePath: string } {
	const args = process.argv.slice(2);
	let fixturePath = DEFAULT_SHADOW_LOG_PATH;

	for (let i = 0; i < args.length; i++) {
		const nextArg = args[i + 1];
		if (args[i] === "--fixture" && nextArg) {
			fixturePath = path.resolve(process.cwd(), nextArg);
			i++;
		}
	}

	return { fixturePath };
}

function formatPercent(val: number): string {
	return `${(val * 100).toFixed(1)}%`;
}

function renderModelSummary(report: ModelEvaluationReport): void {
	console.log(`\n======================================================`);
	console.log(` Model: ${report.modelName}`);
	console.log(`======================================================`);
	console.log(
		` Total decisions:    ${report.totalRecords} (Valid: ${report.validEvaluationCount}, Timeouts: ${report.timeoutCount}, Errors: ${report.errorCount})`,
	);

	const conc = report.concordanceRate;
	console.log(
		` Concordance Rate:   ${formatPercent(conc.point)} [95% CI: ${formatPercent(conc.lower)} - ${formatPercent(conc.upper)}]`,
	);

	const cm = report.confusionMatrix;
	console.log(
		` False Approvals:    ${cm.falseApprovalCount} (${formatPercent(cm.falseApprovalRate.point)}) [95% CI: ${formatPercent(cm.falseApprovalRate.lower)} - ${formatPercent(cm.falseApprovalRate.upper)}]`,
	);
	console.log(
		` Precision (deny):   ${formatPercent(cm.precision)} | Recall: ${formatPercent(cm.recall)} | Specificity: ${formatPercent(cm.specificity)}`,
	);
	console.log(` Brier Score:        ${report.brierScore.toFixed(4)}`);

	console.log(`\n Latency:`);
	console.log(
		`   p50: ${report.latency.p50Ms.toFixed(1)}ms | p90: ${report.latency.p90Ms.toFixed(1)}ms${report.latency.p99Ms !== undefined ? ` | p99: ${report.latency.p99Ms.toFixed(1)}ms` : " | p99: N/A (< 100 samples)"}`,
	);
	console.log(
		`   min: ${report.latency.minMs}ms | max: ${report.latency.maxMs}ms | mean: ${report.latency.meanMs.toFixed(1)}ms`,
	);

	console.log(`\n Token Comparison vs Hypothetical LLM Judge:`);
	const tc = report.tokenComparison;
	console.log(`   Ollaya Input Tokens:     ${tc.totalOllayaInputTokens}`);
	console.log(
		`   Ollaya Output Tokens:    ${tc.totalOllayaOutputTokens} (0 gen tokens)`,
	);
	console.log(
		`   Hypothetical LLM Tokens: ${tc.hypotheticalLlmBaselineTokens}`,
	);
	console.log(
		`   Net Tokens Saved:        ${tc.netTokensSaved} (${formatPercent(tc.tokenSavingsPercentage / 100)} reduction)`,
	);

	console.log(`\n Risk-Coverage Sweep:`);
	console.log(`   Threshold | Coverage | Error Rate | False Approval Rate`);
	for (const pt of report.thresholdSweep) {
		console.log(
			`   ${pt.threshold.toFixed(2).padEnd(9)} | ${formatPercent(pt.coverage).padEnd(8)} | ${formatPercent(pt.errorRate).padEnd(10)} | ${formatPercent(pt.falseApprovalRate)}`,
		);
	}
}

async function main(): Promise<void> {
	const { fixturePath } = parseArgs();

	if (!existsSync(fixturePath)) {
		console.error(`Log file not found: ${fixturePath}`);
		console.log(
			`Run some tool calls to generate shadow logs, or pass --fixture <path>.`,
		);
		process.exit(1);
	}

	const raw = readFileSync(fixturePath, "utf8");
	const events: ShadowLogEvent[] = raw
		.split("\n")
		.filter((line) => line.trim().length > 0)
		.map((line) => JSON.parse(line) as ShadowLogEvent);

	if (events.length === 0) {
		console.log(`No records found in ${fixturePath}.`);
		return;
	}

	const report = generateExperimentSummaryReport(fixturePath, events);

	console.log(`\n=== Decision Model Shadow Evaluation Report ===`);
	console.log(` Source:   ${fixturePath}`);
	console.log(` Records:  ${report.totalRecordsProcessed}`);
	console.log(` Models:   ${Object.keys(report.modelBreakdown).join(", ")}`);

	for (const modelReport of Object.values(report.modelBreakdown)) {
		renderModelSummary(modelReport);
	}

	// Persist report artifact
	const reportsDir = path.join(
		process.cwd(),
		"results",
		"tool-decisions",
		"reports",
	);
	mkdirSync(reportsDir, { recursive: true });
	const timestampSlug = new Date().toISOString().replace(/[:.]/g, "-");
	const reportPath = path.join(reportsDir, `report-${timestampSlug}.json`);
	writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

	console.log(`\n======================================================`);
	console.log(
		` Full JSON report written to: ${path.relative(process.cwd(), reportPath)}`,
	);
	console.log(`======================================================\n`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
