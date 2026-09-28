export type ToolDecisionChoice = "approve" | "deny" | "prompt";

export interface ToolDecisionQuestion {
	readonly type: "choice";
	readonly instructions: string;
	readonly criteria: Record<ToolDecisionChoice, string>;
}

export interface OllayaSystemOneRequest {
	readonly model: string;
	readonly state: string;
	readonly questions: Record<string, ToolDecisionQuestion>;
}

export interface OllayaChoiceAnswer {
	readonly type: "choice";
	readonly choice: ToolDecisionChoice;
	readonly confidence: number;
	readonly probabilities: Record<ToolDecisionChoice, number>;
}

export interface OllayaUsage {
	readonly input_tokens: number;
	readonly output_tokens: number;
}

export interface OllayaSystemOneResponse {
	readonly model: string;
	readonly answers: Record<string, OllayaChoiceAnswer>;
	readonly usage: OllayaUsage;
}

export interface ToolDecisionResult {
	readonly decision: ToolDecisionChoice;
	readonly rawChoice: ToolDecisionChoice;
	readonly confidence: number;
	readonly probabilities: Record<ToolDecisionChoice, number>;
	readonly thresholdApplied: boolean;
	readonly model: string;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly latencyMs: number;
}

export interface ShadowLogEvent {
	readonly timestamp: string;
	readonly toolName: string;
	readonly toolInputSnippet: string;
	readonly model: string;
	readonly shadowDecision: ToolDecisionChoice;
	readonly rawChoice: ToolDecisionChoice;
	readonly confidence: number;
	readonly probabilities: Record<ToolDecisionChoice, number>;
	readonly thresholdApplied: boolean;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly latencyMs: number;
	readonly actualPermissionDecision?: "allow" | "ask" | "deny" | undefined;
	readonly userOutcome?:
		| "approved"
		| "rejected"
		| "skipped"
		| "unspecified"
		| undefined;
	readonly llmBaselineTokens?:
		| {
				readonly inputTokens?: number | undefined;
				readonly outputTokens?: number | undefined;
		  }
		| undefined;
}
