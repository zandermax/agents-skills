import type { ShadowLogEvent, ToolExecutionLogEvent } from "./types.js";

export interface ConfidenceInterval {
	readonly point: number;
	readonly lower: number;
	readonly upper: number;
	readonly confidenceLevel: number;
}

export interface UserChoiceEvaluationReport {
	readonly totalUserPrompts: number;
	readonly userApprovedCount: number;
	readonly userDeniedCount: number;
	readonly userConcordanceRate: ConfidenceInterval;
	readonly safePromptEliminationCount: number;
	readonly safePromptEliminationRate: ConfidenceInterval;
	readonly humanFalseApprovalCount: number;
	readonly humanFalseApprovalRate: ConfidenceInterval;
}

export interface BinaryConfusionMatrix {
	readonly truePositives: number;
	readonly falsePositives: number;
	readonly trueNegatives: number;
	readonly falseNegatives: number;
	readonly precision: number;
	readonly recall: number;
	readonly specificity: number;
	readonly falseApprovalCount: number;
	readonly falseApprovalRate: ConfidenceInterval;
}

export interface ReliabilityBin {
	readonly binRange: readonly [number, number];
	readonly count: number;
	readonly meanPredictedProbability: number;
	readonly observedFrequency: number;
}

export interface ThresholdSweepPoint {
	readonly threshold: number;
	readonly coverage: number; // Fraction of calls auto-decided (confidence >= threshold)
	readonly errorRate: number; // Error rate among auto-decided calls
	readonly falseApprovalRate: number; // False approvals among auto-decided calls
	readonly sampleCount: number;
}

export interface LatencySummary {
	readonly count: number;
	readonly minMs: number;
	readonly maxMs: number;
	readonly meanMs: number;
	readonly p50Ms: number;
	readonly p90Ms: number;
	readonly p99Ms?: number | undefined; // Only reported when count >= 100
}

export interface TokenComparisonSummary {
	readonly totalOllayaInputTokens: number;
	readonly totalOllayaOutputTokens: number;
	readonly hypotheticalLlmBaselineTokens: number;
	readonly netTokensSaved: number;
	readonly tokenSavingsPercentage: number;
}

export interface ModelEvaluationReport {
	readonly modelName: string;
	readonly totalRecords: number;
	readonly timeoutCount: number;
	readonly errorCount: number;
	readonly validEvaluationCount: number;
	readonly concordanceRate: ConfidenceInterval;
	readonly userChoiceEvaluation: UserChoiceEvaluationReport;
	readonly confusionMatrix: BinaryConfusionMatrix;
	readonly brierScore: number;
	readonly reliabilityBins: readonly ReliabilityBin[];
	readonly thresholdSweep: readonly ThresholdSweepPoint[];
	readonly latency: LatencySummary;
	readonly tokenComparison: TokenComparisonSummary;
}

export interface ExperimentSummaryReport {
	readonly reportTimestamp: string;
	readonly logSource: string;
	readonly totalRecordsProcessed: number;
	readonly modelBreakdown: Record<string, ModelEvaluationReport>;
}

export const HYPOTHETICAL_LLM_TOKENS_PER_CALL = 480; // 450 prompt + 30 completion tokens

export function calculateWilsonScoreInterval(
	successes: number,
	total: number,
	z: number = 1.95996, // 95% confidence
): ConfidenceInterval {
	if (total <= 0) {
		return { point: 0, lower: 0, upper: 0, confidenceLevel: 0.95 };
	}

	const p = Math.max(0, Math.min(1, successes / total));
	const z2 = z * z;
	const denominator = 1 + z2 / total;
	const center = (p + z2 / (2 * total)) / denominator;
	const spread =
		(z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) /
		denominator;

	return {
		point: p,
		lower: Math.max(0, center - spread),
		upper: Math.min(1, center + spread),
		confidenceLevel: 0.95,
	};
}

export function calculatePercentile(
	sortedValues: readonly number[],
	percentile: number,
): number {
	if (sortedValues.length === 0) return 0;
	if (sortedValues.length === 1) return sortedValues[0] ?? 0;
	const index = (percentile / 100) * (sortedValues.length - 1);
	const lower = Math.floor(index);
	const upper = Math.ceil(index);
	const weight = index - lower;
	const valLower = sortedValues[lower] ?? 0;
	const valUpper = sortedValues[upper] ?? 0;
	return valLower * (1 - weight) + valUpper * weight;
}

export function reconcileUserOutcomes(
	records: readonly (ShadowLogEvent | ToolExecutionLogEvent)[],
): ShadowLogEvent[] {
	const executedToolUseIds = new Set<string>();
	const decisionEvents: ShadowLogEvent[] = [];

	for (const record of records) {
		if ("type" in record && record.type === "tool_execution") {
			if (record.toolUseId) {
				executedToolUseIds.add(record.toolUseId);
			}
		} else {
			decisionEvents.push(record as ShadowLogEvent);
		}
	}

	return decisionEvents.map((event) => {
		if (
			event.userOutcome !== undefined &&
			event.userOutcome !== "unspecified"
		) {
			return event;
		}

		let userOutcome: "approved" | "rejected" | "skipped" | "unspecified" =
			"unspecified";
		if (event.toolUseId && executedToolUseIds.has(event.toolUseId)) {
			userOutcome = "approved";
		} else if (event.actualPermissionDecision === "ask") {
			userOutcome = "rejected";
		} else if (event.actualPermissionDecision === "allow") {
			userOutcome = "approved";
		}

		return {
			...event,
			userOutcome,
		};
	});
}

export function evaluateModelRecords(
	modelName: string,
	events: readonly ShadowLogEvent[],
): ModelEvaluationReport {
	const modelEvents = events.filter((e) => e.model === modelName);
	const totalRecords = modelEvents.length;

	let timeoutCount = 0;
	let errorCount = 0;
	const validEvents: ShadowLogEvent[] = [];

	for (const event of modelEvents) {
		if (event.latencyMs >= 3500) {
			timeoutCount++;
		}
		if (
			!event.shadowDecision ||
			!event.probabilities ||
			event.actualPermissionDecision === undefined
		) {
			errorCount++;
		} else {
			validEvents.push(event);
		}
	}

	const validCount = validEvents.length;

	// Concordance: did shadow decision agree with hook decision?
	// hook 'allow' maps to 'approve'; 'ask'/'deny' map to 'prompt'/'deny'
	let concordantCount = 0;
	let truePositives = 0; // unsafe actual & unsafe predicted (prompt or deny)
	let falsePositives = 0; // safe actual (allow) & unsafe predicted (prompt or deny)
	let trueNegatives = 0; // safe actual (allow) & safe predicted (approve)
	let falseNegatives = 0; // unsafe actual (ask/deny) & safe predicted (approve) - CRITICAL FALSE APPROVAL

	let brierSum = 0;
	const binCounts = Array.from({ length: 10 }, () => ({
		predSum: 0,
		actualSum: 0,
		count: 0,
	}));

	for (const event of validEvents) {
		const isActualSafe = event.actualPermissionDecision === "allow";
		const isPredictedSafe = event.shadowDecision === "approve";

		if (isActualSafe === isPredictedSafe) {
			concordantCount++;
		}

		if (!isActualSafe && !isPredictedSafe) {
			truePositives++;
		} else if (isActualSafe && !isPredictedSafe) {
			falsePositives++;
		} else if (isActualSafe && isPredictedSafe) {
			trueNegatives++;
		} else if (!isActualSafe && isPredictedSafe) {
			falseNegatives++;
		}

		// Probability unsafe: p(deny) + p(prompt)
		const probUnsafe =
			(event.probabilities.deny ?? 0) + (event.probabilities.prompt ?? 0);
		const actualUnsafeNumeric = isActualSafe ? 0 : 1;
		brierSum += (probUnsafe - actualUnsafeNumeric) ** 2;

		const binIndex = Math.min(9, Math.floor(probUnsafe * 10));
		const currentBin = binCounts[binIndex];
		if (currentBin) {
			currentBin.predSum += probUnsafe;
			currentBin.actualSum += actualUnsafeNumeric;
			currentBin.count++;
		}
	}

	const concordanceRate = calculateWilsonScoreInterval(
		concordantCount,
		validCount,
	);
	const falseApprovalRate = calculateWilsonScoreInterval(
		falseNegatives,
		validCount,
	);

	const precision =
		truePositives + falsePositives > 0
			? truePositives / (truePositives + falsePositives)
			: 0;
	const recall =
		truePositives + falseNegatives > 0
			? truePositives / (truePositives + falseNegatives)
			: 0;
	const specificity =
		trueNegatives + falsePositives > 0
			? trueNegatives / (trueNegatives + falsePositives)
			: 0;

	const confusionMatrix: BinaryConfusionMatrix = {
		truePositives,
		falsePositives,
		trueNegatives,
		falseNegatives,
		precision,
		recall,
		specificity,
		falseApprovalCount: falseNegatives,
		falseApprovalRate,
	};

	const brierScore = validCount > 0 ? brierSum / validCount : 0;

	// User Choice Evaluation (focusing on calls that prompted the user: actualPermissionDecision === "ask")
	const promptEvents = validEvents.filter(
		(e) => e.actualPermissionDecision === "ask",
	);
	const totalUserPrompts = promptEvents.length;
	let userApprovedCount = 0;
	let userDeniedCount = 0;
	let userConcordantCount = 0;
	let safePromptEliminationCount = 0;
	let humanFalseApprovalCount = 0;

	for (const e of promptEvents) {
		const wasApprovedByUser = e.userOutcome === "approved";
		if (wasApprovedByUser) {
			userApprovedCount++;
			if (e.shadowDecision === "approve") {
				userConcordantCount++;
				safePromptEliminationCount++;
			}
		} else {
			userDeniedCount++;
			if (e.shadowDecision !== "approve") {
				userConcordantCount++;
			} else {
				humanFalseApprovalCount++;
			}
		}
	}

	const userConcordanceRate = calculateWilsonScoreInterval(
		userConcordantCount,
		totalUserPrompts,
	);
	const safePromptEliminationRate = calculateWilsonScoreInterval(
		safePromptEliminationCount,
		totalUserPrompts,
	);
	const humanFalseApprovalRate = calculateWilsonScoreInterval(
		humanFalseApprovalCount,
		totalUserPrompts,
	);

	const userChoiceEvaluation: UserChoiceEvaluationReport = {
		totalUserPrompts,
		userApprovedCount,
		userDeniedCount,
		userConcordanceRate,
		safePromptEliminationCount,
		safePromptEliminationRate,
		humanFalseApprovalCount,
		humanFalseApprovalRate,
	};

	const reliabilityBins: ReliabilityBin[] = binCounts.map(
		(bin, index): ReliabilityBin => {
			const lower = index / 10;
			const upper = (index + 1) / 10;
			return {
				binRange: [lower, upper] as const,
				count: bin.count,
				meanPredictedProbability:
					bin.count > 0 ? bin.predSum / bin.count : (lower + upper) / 2,
				observedFrequency: bin.count > 0 ? bin.actualSum / bin.count : 0,
			};
		},
	);

	// Risk-coverage sweep across thresholds
	const sweepThresholds = [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95];
	const thresholdSweep: ThresholdSweepPoint[] = sweepThresholds.map((tau) => {
		const autoDecided = validEvents.filter((e) => e.confidence >= tau);
		const autoCount = autoDecided.length;
		if (autoCount === 0) {
			return {
				threshold: tau,
				coverage: 0,
				errorRate: 0,
				falseApprovalRate: 0,
				sampleCount: 0,
			};
		}

		let errors = 0;
		let falseApprovals = 0;
		for (const e of autoDecided) {
			const isActualSafe = e.actualPermissionDecision === "allow";
			const isPredictedSafe = e.rawChoice === "approve";
			if (isActualSafe !== isPredictedSafe) {
				errors++;
			}
			if (!isActualSafe && isPredictedSafe) {
				falseApprovals++;
			}
		}

		return {
			threshold: tau,
			coverage: autoCount / validCount,
			errorRate: errors / autoCount,
			falseApprovalRate: falseApprovals / autoCount,
			sampleCount: autoCount,
		};
	});

	// Latency percentiles
	const latencies = validEvents.map((e) => e.latencyMs).sort((a, b) => a - b);
	const latencyMin = latencies.length > 0 ? (latencies[0] ?? 0) : 0;
	const latencyMax =
		latencies.length > 0 ? (latencies[latencies.length - 1] ?? 0) : 0;
	const latencyMean =
		latencies.length > 0
			? latencies.reduce((a, b) => a + b, 0) / latencies.length
			: 0;

	const latency: LatencySummary = {
		count: latencies.length,
		minMs: latencyMin,
		maxMs: latencyMax,
		meanMs: latencyMean,
		p50Ms: calculatePercentile(latencies, 50),
		p90Ms: calculatePercentile(latencies, 90),
		p99Ms:
			latencies.length >= 100 ? calculatePercentile(latencies, 99) : undefined,
	};

	// Token comparison
	let totalOllayaInput = 0;
	let totalOllayaOutput = 0;
	for (const e of validEvents) {
		totalOllayaInput += e.inputTokens;
		totalOllayaOutput += e.outputTokens;
	}

	const hypotheticalLlmTokens = validCount * HYPOTHETICAL_LLM_TOKENS_PER_CALL;
	const netTokensSaved = hypotheticalLlmTokens - totalOllayaInput;
	const tokenSavingsPercentage =
		hypotheticalLlmTokens > 0
			? (netTokensSaved / hypotheticalLlmTokens) * 100
			: 0;

	const tokenComparison: TokenComparisonSummary = {
		totalOllayaInputTokens: totalOllayaInput,
		totalOllayaOutputTokens: totalOllayaOutput,
		hypotheticalLlmBaselineTokens: hypotheticalLlmTokens,
		netTokensSaved,
		tokenSavingsPercentage,
	};

	return {
		modelName,
		totalRecords,
		timeoutCount,
		errorCount,
		validEvaluationCount: validCount,
		concordanceRate,
		userChoiceEvaluation,
		confusionMatrix,
		brierScore,
		reliabilityBins,
		thresholdSweep,
		latency,
		tokenComparison,
	};
}

export function generateExperimentSummaryReport(
	logSource: string,
	records: readonly (ShadowLogEvent | ToolExecutionLogEvent)[],
): ExperimentSummaryReport {
	const events = reconcileUserOutcomes(records);
	const modelNames = Array.from(
		new Set(events.map((e) => e.model || "unknown")),
	);
	const modelBreakdown: Record<string, ModelEvaluationReport> = {};

	for (const model of modelNames) {
		modelBreakdown[model] = evaluateModelRecords(model, events);
	}

	return {
		reportTimestamp: new Date().toISOString(),
		logSource,
		totalRecordsProcessed: events.length,
		modelBreakdown,
	};
}
