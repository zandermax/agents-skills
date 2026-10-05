export const DEFAULT_DECISION_MODEL = "winnow:e4b";
export const LAYA_DECISION_MODEL = "laya:en";
export const CONFIDENCE_THRESHOLD = 0.85;
export const DEFAULT_DECISION_BASE_URL = "http://localhost:11435";
export const SYSTEMONE_PATH = "/v1/systemone";

export const TOOL_SAFETY_CRITERIA = {
	approve: "The tool call is safe to run without asking the user.",
	deny: "The tool call must be blocked.",
	prompt: "The tool call needs a user decision.",
} as const;

export type ToolSafetyLabel = "approve" | "deny" | "prompt";

export interface ToolSafetyDecision {
	readonly model: string;
	readonly rawChoice: ToolSafetyLabel | null;
	readonly decision: ToolSafetyLabel;
	readonly confidence: number | null;
	readonly inputTokens: number | null;
	readonly outputTokens: number | null;
	readonly promptTokens: number | null;
	readonly error: string | null;
}

export interface SystemOneRequest {
	readonly model: string;
	readonly state: string;
	readonly questions: {
		readonly safety: {
			readonly type: "choice";
			readonly criteria: typeof TOOL_SAFETY_CRITERIA;
		};
	};
}

export interface DecideToolSafetyInput {
	readonly model?: string;
	readonly state: string;
}

export interface DecideToolSafetyOptions {
	readonly fetch?: typeof fetch;
	readonly baseUrl?: string;
	readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;

export function buildSafetyRequest(
	input: DecideToolSafetyInput,
): SystemOneRequest {
	return {
		model: input.model ?? DEFAULT_DECISION_MODEL,
		state: input.state,
		questions: {
			safety: {
				type: "choice",
				criteria: TOOL_SAFETY_CRITERIA,
			},
		},
	};
}

export function applyConfidenceThreshold(
	choice: ToolSafetyLabel,
	confidence: number | null,
): ToolSafetyLabel {
	if (choice === "prompt" || confidence === null) {
		return "prompt";
	}

	if (confidence < CONFIDENCE_THRESHOLD) {
		return "prompt";
	}

	return choice;
}

export async function decideToolSafety(
	input: DecideToolSafetyInput,
	options: DecideToolSafetyOptions = {},
): Promise<ToolSafetyDecision> {
	const request = buildSafetyRequest(input);
	const fetchImpl = options.fetch ?? fetch;
	const baseUrl = options.baseUrl ?? DEFAULT_DECISION_BASE_URL;
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	try {
		const response = await fetchImpl(`${baseUrl}${SYSTEMONE_PATH}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(request),
			signal: AbortSignal.timeout(timeoutMs),
		});
		const body: unknown = await parseJson(response);

		if (!response.ok) {
			return failSafe(
				request.model,
				errorMessage(body) ?? `HTTP ${response.status}`,
			);
		}

		return parseDecision(request.model, body);
	} catch (error) {
		return failSafe(
			request.model,
			error instanceof Error ? error.message : "request failed",
		);
	}
}

function failSafe(model: string, error: string): ToolSafetyDecision {
	return {
		model,
		rawChoice: null,
		decision: "prompt",
		confidence: null,
		inputTokens: null,
		outputTokens: null,
		promptTokens: null,
		error,
	};
}

async function parseJson(response: Response): Promise<unknown> {
	const text = await response.text();
	if (text.length === 0) {
		return null;
	}

	return JSON.parse(text) as unknown;
}

function parseDecision(model: string, body: unknown): ToolSafetyDecision {
	if (!isRecord(body) || !isRecord(body.answers)) {
		return failSafe(model, "missing answers");
	}

	const safety = body.answers.safety;
	if (!isRecord(safety) || !isLabel(safety.choice)) {
		return failSafe(model, "missing safety choice");
	}

	const confidence =
		typeof safety.confidence === "number" ? safety.confidence : null;
	const usage = isRecord(body.usage) ? body.usage : null;
	const inputTokens =
		usage && typeof usage.input_tokens === "number" ? usage.input_tokens : null;
	const outputTokens =
		usage && typeof usage.output_tokens === "number"
			? usage.output_tokens
			: null;

	return {
		model,
		rawChoice: safety.choice,
		decision: applyConfidenceThreshold(safety.choice, confidence),
		confidence,
		inputTokens,
		outputTokens,
		promptTokens: inputTokens,
		error: null,
	};
}

function errorMessage(body: unknown): string | null {
	if (isRecord(body) && typeof body.error === "string") {
		return body.error;
	}

	return null;
}

function isLabel(value: unknown): value is ToolSafetyLabel {
	return value === "approve" || value === "deny" || value === "prompt";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
