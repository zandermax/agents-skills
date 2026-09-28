#!/usr/bin/env node

import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import { DecisionModelClient } from "../src/lib/decision-model/client.js";
import {
	generateExperimentSummaryReport,
	type ModelEvaluationReport,
} from "../src/lib/decision-model/comparison.js";
import {
	DEFAULT_SHADOW_LOG_ARCHIVE_DIR,
	DEFAULT_SHADOW_LOG_DIR,
	DEFAULT_SHADOW_LOG_SESSIONS_DIR,
	formatDateTimeSlug,
} from "../src/lib/decision-model/shadow-logger.js";
import type {
	ShadowLogEvent,
	ShadowLogRecord,
} from "../src/lib/decision-model/types.js";

interface CliOptions {
	readonly fixturePath?: string | undefined;
	readonly reset: boolean;
	readonly rescore: boolean;
}

export function getActiveDecisionFiles(dir = DEFAULT_SHADOW_LOG_DIR): string[] {
	if (!existsSync(dir)) {
		return [];
	}
	return readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))
		.map((entry) => path.join(dir, entry.name))
		.sort();
}

export function archiveDecisionFiles(
	files: readonly string[],
	archiveBaseDir: string,
	operationTimestamp = formatDateTimeSlug(),
): { readonly archiveDir: string; readonly archivedFiles: readonly string[] } {
	const archiveDir = path.join(archiveBaseDir, operationTimestamp);
	mkdirSync(archiveDir, { recursive: true });

	const archivedFiles: string[] = [];
	for (const file of files) {
		const dest = path.join(archiveDir, path.basename(file));
		renameSync(file, dest);
		archivedFiles.push(dest);
	}

	return { archiveDir, archivedFiles };
}

function parseArgs(): CliOptions {
	const args = process.argv.slice(2);
	let fixturePath: string | undefined;
	let reset = false;
	let rescore = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];
		if (arg === "--fixture" && nextArg) {
			fixturePath = path.resolve(process.cwd(), nextArg);
			i++;
		} else if (arg === "--reset") {
			reset = true;
		} else if (arg === "--rescore" || arg === "--replay") {
			rescore = true;
		}
	}

	return { fixturePath, reset, rescore };
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
		` Hook Concordance:   ${formatPercent(conc.point)} [95% CI: ${formatPercent(conc.lower)} - ${formatPercent(conc.upper)}]`,
	);

	const uc = report.userChoiceEvaluation;
	console.log(`\n User Choice Evaluation (Taking Decisions Out):`);
	console.log(`   Total Prompts Shown to User:  ${uc.totalUserPrompts}`);
	console.log(
		`   Human User Approved:          ${uc.userApprovedCount} (${uc.totalUserPrompts > 0 ? formatPercent(uc.userApprovedCount / uc.totalUserPrompts) : "0.0%"})`,
	);
	console.log(
		`   Human User Denied:            ${uc.userDeniedCount} (${uc.totalUserPrompts > 0 ? formatPercent(uc.userDeniedCount / uc.totalUserPrompts) : "0.0%"})`,
	);
	console.log(
		`   User Concordance Rate:        ${formatPercent(uc.userConcordanceRate.point)} [95% CI: ${formatPercent(uc.userConcordanceRate.lower)} - ${formatPercent(uc.userConcordanceRate.upper)}]`,
	);
	console.log(
		`   Safe Prompt Elimination Rate: ${formatPercent(uc.safePromptEliminationRate.point)} (${uc.safePromptEliminationCount} prompts could be bypassed)`,
	);
	console.log(
		`   Critical False Approvals:     ${uc.humanFalseApprovalCount} (${formatPercent(uc.humanFalseApprovalRate.point)}) [Laya approved when user denied]`,
	);

	const cm = report.confusionMatrix;
	console.log(`\n Hook Rule Confusion Matrix:`);
	console.log(
		`   Hook False Approvals: ${cm.falseApprovalCount} (${formatPercent(cm.falseApprovalRate.point)}) [95% CI: ${formatPercent(cm.falseApprovalRate.lower)} - ${formatPercent(cm.falseApprovalRate.upper)}]`,
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
	const { fixturePath, reset, rescore } = parseArgs();

	if (reset) {
		if (fixturePath) {
			if (existsSync(fixturePath)) {
				const baseDir = path.dirname(fixturePath);
				const archiveBaseDir = path.join(baseDir, "archive");
				const { archiveDir } = archiveDecisionFiles(
					[fixturePath],
					archiveBaseDir,
				);
				console.log(
					`\n✔ Reset complete: archived ${path.basename(fixturePath)} into ${archiveDir}`,
				);
			} else {
				console.log(
					`\nNo shadow log found at ${path.relative(process.cwd(), fixturePath)} to reset.`,
				);
			}
			process.exit(0);
		}

		const activeFiles = getActiveDecisionFiles(DEFAULT_SHADOW_LOG_DIR);
		if (activeFiles.length === 0) {
			console.log(
				`\nNo active decision logs found in ${DEFAULT_SHADOW_LOG_DIR} to archive.`,
			);
			process.exit(0);
		}

		const { archiveDir, archivedFiles } = archiveDecisionFiles(
			activeFiles,
			DEFAULT_SHADOW_LOG_ARCHIVE_DIR,
		);

		if (existsSync(DEFAULT_SHADOW_LOG_SESSIONS_DIR)) {
			rmSync(DEFAULT_SHADOW_LOG_SESSIONS_DIR, {
				recursive: true,
				force: true,
			});
		}

		console.log(
			`\n✔ Reset complete: archived ${archivedFiles.length} file(s) into:`,
		);
		console.log(`  ${archiveDir}`);
		for (const archived of archivedFiles) {
			console.log(`  - ${path.basename(archived)}`);
		}
		process.exit(0);
	}

	let targetFiles: string[] = [];
	if (fixturePath) {
		if (!existsSync(fixturePath)) {
			console.error(`Log file not found: ${fixturePath}`);
			console.log(
				`Run some tool calls to generate shadow logs, or pass --fixture <path>.`,
			);
			process.exit(1);
		}
		targetFiles = [fixturePath];
	} else {
		targetFiles = getActiveDecisionFiles(DEFAULT_SHADOW_LOG_DIR);
		if (targetFiles.length === 0) {
			console.error(
				`No decision log files found in: ${DEFAULT_SHADOW_LOG_DIR}`,
			);
			console.log(
				`Run some tool calls to generate shadow logs, or pass --fixture <path>.`,
			);
			process.exit(1);
		}
	}

	const records: ShadowLogRecord[] = [];
	for (const file of targetFiles) {
		const raw = readFileSync(file, "utf8");
		for (const line of raw.split("\n")) {
			const trimmed = line.trim();
			if (trimmed.length > 0) {
				try {
					records.push(JSON.parse(trimmed) as ShadowLogRecord);
				} catch {
					// Ignore malformed line
				}
			}
		}
	}

	if (records.length === 0) {
		console.log(`No records found in ${targetFiles.length} log file(s).`);
		return;
	}

	if (rescore) {
		const targetLabel =
			targetFiles.length === 1 && targetFiles[0]
				? path.relative(process.cwd(), targetFiles[0])
				: `${targetFiles.length} log files`;
		console.log(
			`\nRe-scoring records in ${targetLabel} against local model using current prompt...`,
		);
		const client = new DecisionModelClient();
		let updatedCount = 0;
		for (const record of records) {
			if (!("type" in record && record.type === "tool_execution")) {
				const event = record as ShadowLogEvent;
				let parsedInput: unknown = event.toolInputSnippet;
				try {
					parsedInput = JSON.parse(event.toolInputSnippet);
				} catch {
					// keep as string
				}
				const newResult = await client.evaluateToolCall(
					event.toolName,
					parsedInput,
				);
				if (newResult) {
					const target = record as {
						shadowDecision?: string;
						rawChoice?: string;
						confidence?: number;
						probabilities?: Record<string, number>;
						thresholdApplied?: boolean;
						model?: string;
						inputTokens?: number;
						latencyMs?: number;
					};
					target.shadowDecision = newResult.decision;
					target.rawChoice = newResult.rawChoice;
					target.confidence = newResult.confidence;
					target.probabilities = newResult.probabilities;
					target.thresholdApplied = newResult.thresholdApplied;
					target.model = newResult.model;
					target.inputTokens = newResult.inputTokens;
					target.latencyMs = newResult.latencyMs;
					updatedCount++;
				}
			}
		}
		console.log(`Re-scored ${updatedCount} decisions with updated prompt.`);
	}

	const sourceLabel =
		targetFiles.length === 1 && targetFiles[0]
			? targetFiles[0]
			: `${DEFAULT_SHADOW_LOG_DIR}/*.jsonl (${targetFiles.length} files: ${targetFiles.map((f) => path.basename(f)).join(", ")})`;

	const report = generateExperimentSummaryReport(sourceLabel, records);

	console.log(`\n=== Decision Model Shadow Evaluation Report ===`);
	console.log(` Source:   ${report.logSource}`);
	console.log(
		` Records:  ${report.totalRecordsProcessed} across ${targetFiles.length} log file(s)`,
	);
	console.log(` Models:   ${Object.keys(report.modelBreakdown).join(", ")}`);

	for (const modelReport of Object.values(report.modelBreakdown)) {
		renderModelSummary(modelReport);
	}

	// Persist report artifact
	const timestampSlug = formatDateTimeSlug();
	const reportContent = `${JSON.stringify(report, null, 2)}\n`;

	const userReportsDir = path.join(DEFAULT_SHADOW_LOG_DIR, "reports");
	mkdirSync(userReportsDir, { recursive: true });
	const userReportPath = path.join(
		userReportsDir,
		`report-${timestampSlug}.json`,
	);
	writeFileSync(userReportPath, reportContent, "utf8");

	if (existsSync(path.join(process.cwd(), "results", "tool-decisions"))) {
		const localReportsDir = path.join(
			process.cwd(),
			"results",
			"tool-decisions",
			"reports",
		);
		mkdirSync(localReportsDir, { recursive: true });
		writeFileSync(
			path.join(localReportsDir, `report-${timestampSlug}.json`),
			reportContent,
			"utf8",
		);
	}

	console.log(`\n======================================================`);
	console.log(` Full JSON report written to: ${userReportPath}`);
	console.log(`======================================================\n`);
}

const scriptArg = process.argv[1];
const isMainModule =
	typeof scriptArg === "string" &&
	(path.resolve(scriptArg) ===
		path.resolve(new URL(import.meta.url).pathname) ||
		scriptArg.endsWith("compare-decisions.ts"));

if (isMainModule) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
