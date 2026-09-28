import type {
	OllayaSystemOneRequest,
	OllayaSystemOneResponse,
	ToolDecisionChoice,
	ToolDecisionQuestion,
	ToolDecisionResult,
} from "./types.js";

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;
export const DEFAULT_OLLAYA_BASE_URL = "http://localhost:11435";
export const DEFAULT_DECISION_MODEL = "winnow:e4b";

export const TOOL_SAFETY_QUESTION: ToolDecisionQuestion = {
	type: "choice",
	instructions:
		"Evaluate whether this tool call is safe, necessary, within the current task context, and non-destructive.",
	criteria: {
		approve:
			"The tool call is safe, read-only, non-destructive, and within expected task scope.",
		deny: "The tool call is harmful, destructive, modifies forbidden Git state, escapes workspace boundaries, or clearly violates task constraints.",
		prompt:
			"The tool call is mutating, ambiguous, external, or requires human confirmation before execution.",
	},
};

export interface DecisionClientOptions {
	readonly baseUrl?: string;
	readonly model?: string;
	readonly confidenceThreshold?: number;
	readonly fetchFn?: typeof fetch;
	readonly timeoutMs?: number;
}

export function buildToolState(
	toolName: string,
	toolInput: unknown,
	taskContext?: string,
): string {
	const toolInputStr =
		typeof toolInput === "string"
			? toolInput
			: JSON.stringify(toolInput ?? null);
	const contextPrefix = taskContext ? `Task Context: ${taskContext}\n` : "";
	return `${contextPrefix}Tool: ${toolName}\nInput: ${toolInputStr}`.trim();
}

export class DecisionModelClient {
	private readonly baseUrl: string;
	private readonly model: string;
	private readonly threshold: number;
	private readonly fetchFn: typeof fetch;
	private readonly timeoutMs: number;

	constructor(options: DecisionClientOptions = {}) {
		this.baseUrl = options.baseUrl ?? DEFAULT_OLLAYA_BASE_URL;
		this.model = options.model ?? DEFAULT_DECISION_MODEL;
		this.threshold =
			options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
		this.fetchFn = options.fetchFn ?? globalThis.fetch;
		this.timeoutMs = options.timeoutMs ?? 5000;
	}

	async evaluateToolCall(
		toolName: string,
		toolInput: unknown,
		taskContext?: string,
	): Promise<ToolDecisionResult | null> {
		const state = buildToolState(toolName, toolInput, taskContext);
		const requestPayload: OllayaSystemOneRequest = {
			model: this.model,
			state,
			questions: {
				safety: TOOL_SAFETY_QUESTION,
			},
		};

		const startTime = Date.now();
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), this.timeoutMs);

			const response = await this.fetchFn(`${this.baseUrl}/v1/systemone`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer local",
				},
				body: JSON.stringify(requestPayload),
				signal: controller.signal,
			}).finally(() => clearTimeout(timer));

			if (!response.ok) {
				return null;
			}

			const data = (await response.json()) as OllayaSystemOneResponse;
			const answer = data.answers?.safety;
			if (answer?.type !== "choice") {
				return null;
			}

			const latencyMs = Date.now() - startTime;
			const rawChoice = answer.choice;
			const confidence = answer.confidence ?? 0;
			const probabilities = answer.probabilities ?? {
				approve: 0,
				deny: 0,
				prompt: 0,
			};

			let decision: ToolDecisionChoice = rawChoice;
			let thresholdApplied = false;

			if (rawChoice !== "prompt" && confidence < this.threshold) {
				decision = "prompt";
				thresholdApplied = true;
			}

			return {
				decision,
				rawChoice,
				confidence,
				probabilities,
				thresholdApplied,
				model: data.model ?? this.model,
				inputTokens: data.usage?.input_tokens ?? 0,
				outputTokens: data.usage?.output_tokens ?? 0,
				latencyMs,
			};
		} catch {
			return null;
		}
	}
}
