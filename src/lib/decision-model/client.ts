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

export const DEFAULT_TASK_CONTEXT =
	"You are helping decide if this tool should be approved, denied, or prompted to the user during automated coding and testing. The user expects autonomous development, test execution, file inspection, and routine edits, but wants protection against destructive, unrecoverable, or ambiguous commands.";

export const TOOL_SAFETY_QUESTION: ToolDecisionQuestion = {
	type: "choice",
	instructions:
		"Determine whether the user would want this tool execution to proceed autonomously without interrupting them, or if it is dangerous and should be denied, or if it genuinely warrants interrupting the user for confirmation.",
	criteria: {
		approve:
			"Routine, safe, or expected development actions (reading files, listing directories, running tests, typechecks, formatting, making planned edits, running non-destructive git commands) that the user expects the agent to perform autonomously.",
		deny: "Destructive, unrecoverable, or harmful actions (force pushing, deleting repos or uncommitted work, hard resets, accessing sensitive external secrets) that should be blocked outright.",
		prompt:
			"High-impact, irreversible, or ambiguous actions (pushing to remotes, deleting branches, running arbitrary remote curl commands, publishing packages) where the user would want a human confirmation gate before proceeding.",
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
	const effectiveContext =
		taskContext !== undefined ? taskContext : DEFAULT_TASK_CONTEXT;
	const toolInputStr =
		typeof toolInput === "string"
			? toolInput
			: JSON.stringify(toolInput ?? null);
	const contextPrefix = effectiveContext
		? `Task Context: ${effectiveContext}\n`
		: "";
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
