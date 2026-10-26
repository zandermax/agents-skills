export { parseCliTranscript } from "./agent-eval-transcripts.js";

export type SupportedCli = "copilot" | "claude";

export const SUPPORTED_CLIS: readonly SupportedCli[] = ["copilot", "claude"];

export interface EvalScenario {
	readonly name: string;
	readonly prompt: string;
	readonly expectedMemoryOrSkill: string;
	readonly requiredOutput: readonly string[];
	readonly forbiddenOutput: readonly string[];
	readonly judgeRubric?: string;
}

export interface EvalTranscript {
	readonly filesAccessed: readonly string[];
	readonly responseText: string;
}

export interface GateResult {
	readonly pass: boolean;
	readonly detail: string;
}

export interface ScenarioResult {
	readonly name: string;
	readonly gate1: GateResult;
	readonly gate2: GateResult;
	readonly pass: boolean;
}

export interface CliInvocation {
	readonly command: string;
	readonly args: readonly string[];
}

function parseStringArray(
	value: unknown,
	sourceName: string,
	index: number,
	name: string,
	field: string,
): readonly string[] {
	if (!Array.isArray(value)) {
		throw new Error(
			`${sourceName}: scenario ${index} (${name}) requires '${field}' to be an array of strings`,
		);
	}
	return value.map((entry, entryIndex) => {
		if (typeof entry !== "string") {
			throw new Error(
				`${sourceName}: scenario ${index} (${name}) '${field}[${entryIndex}]' must be a string`,
			);
		}
		return entry;
	});
}

function parseEvalScenario(
	value: unknown,
	sourceName: string,
	index: number,
): EvalScenario {
	if (typeof value !== "object" || value === null) {
		throw new Error(`${sourceName}: scenario ${index} must be an object`);
	}
	const record = value as Record<string, unknown>;

	const name =
		typeof record.name === "string" && record.name.length > 0
			? record.name
			: `scenario-${index}`;

	const prompt = record.prompt;
	if (typeof prompt !== "string" || prompt.length === 0) {
		throw new Error(
			`${sourceName}: scenario ${index} (${name}) requires a non-empty 'prompt' string`,
		);
	}

	const expectedMemoryOrSkill = record.expectedMemoryOrSkill;
	if (
		typeof expectedMemoryOrSkill !== "string" ||
		expectedMemoryOrSkill.length === 0
	) {
		throw new Error(
			`${sourceName}: scenario ${index} (${name}) requires a non-empty 'expectedMemoryOrSkill' string`,
		);
	}

	const requiredOutput = parseStringArray(
		record.requiredOutput,
		sourceName,
		index,
		name,
		"requiredOutput",
	);
	const forbiddenOutput = parseStringArray(
		record.forbiddenOutput,
		sourceName,
		index,
		name,
		"forbiddenOutput",
	);

	const judgeRubric = record.judgeRubric;
	if (judgeRubric !== undefined && typeof judgeRubric !== "string") {
		throw new Error(
			`${sourceName}: scenario ${index} (${name}) 'judgeRubric' must be a string when present`,
		);
	}

	return {
		name,
		prompt,
		expectedMemoryOrSkill,
		requiredOutput,
		forbiddenOutput,
		...(typeof judgeRubric === "string" ? { judgeRubric } : {}),
	};
}

/** Parses and validates an evals.json document into scenario objects. */
export function parseEvalScenarios(
	raw: string,
	sourceName: string,
): readonly EvalScenario[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		const details = error instanceof Error ? error.message : String(error);
		throw new Error(`${sourceName}: invalid JSON: ${details}`);
	}

	if (!Array.isArray(parsed)) {
		throw new Error(`${sourceName}: must be a JSON array of scenarios`);
	}

	return parsed.map((value, index) =>
		parseEvalScenario(value, sourceName, index),
	);
}

/** A leading/trailing "/pattern/flags" is treated as regex; otherwise substring, case-insensitive. */
export function matchesPattern(text: string, pattern: string): boolean {
	const regexMatch = /^\/(.*)\/([a-z]*)$/s.exec(pattern);
	if (regexMatch) {
		const [, source, flags] = regexMatch;
		return new RegExp(source ?? "", flags ?? "").test(text);
	}
	return text.toLowerCase().includes(pattern.toLowerCase());
}

export function evaluateGate1(
	transcript: EvalTranscript,
	expectedMemoryOrSkill: string,
): GateResult {
	const accessed = transcript.filesAccessed.some((filePath) =>
		filePath.includes(expectedMemoryOrSkill),
	);
	return {
		pass: accessed,
		detail: accessed
			? `accessed a file matching '${expectedMemoryOrSkill}'`
			: `no accessed file matched '${expectedMemoryOrSkill}' (accessed: ${transcript.filesAccessed.join(", ") || "none"})`,
	};
}

/** Fenced code blocks, e.g. ```js\n...\n```; without the fence markers. */
function extractCodeBlocks(text: string): readonly string[] {
	const blocks: string[] = [];
	for (const match of text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) {
		if (match[1] !== undefined) {
			blocks.push(match[1]);
		}
	}
	return blocks;
}

/**
 * Prefer matching against fenced code blocks so prose that quotes a forbidden
 * pattern only to explain it was avoided doesn't trigger a false failure.
 */
function textForBehavioralMatching(transcript: EvalTranscript): string {
	const codeBlocks = extractCodeBlocks(transcript.responseText);
	return codeBlocks.length > 0
		? codeBlocks.join("\n")
		: transcript.responseText;
}

/** Strips // and /* *\/ comments so forbidden-pattern checks ignore anti-pattern documentation left in comments. */
function stripCodeComments(code: string): string {
	return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

export function evaluateGate2(
	transcript: EvalTranscript,
	scenario: EvalScenario,
): GateResult {
	const textToMatch = textForBehavioralMatching(transcript);
	const forbiddenCheckText = stripCodeComments(textToMatch);
	const missingRequired = scenario.requiredOutput.filter(
		(pattern) => !matchesPattern(textToMatch, pattern),
	);
	const presentForbidden = scenario.forbiddenOutput.filter((pattern) =>
		matchesPattern(forbiddenCheckText, pattern),
	);

	const pass = missingRequired.length === 0 && presentForbidden.length === 0;
	const details: string[] = [];
	if (missingRequired.length > 0) {
		details.push(`missing required patterns: ${missingRequired.join(", ")}`);
	}
	if (presentForbidden.length > 0) {
		details.push(`present forbidden patterns: ${presentForbidden.join(", ")}`);
	}

	return {
		pass,
		detail: pass
			? "response satisfied all required/forbidden matchers"
			: details.join("; "),
	};
}

export function evaluateScenario(
	scenario: EvalScenario,
	transcript: EvalTranscript,
): ScenarioResult {
	const gate1 = evaluateGate1(transcript, scenario.expectedMemoryOrSkill);
	const gate2 = evaluateGate2(transcript, scenario);
	return {
		name: scenario.name,
		gate1,
		gate2,
		pass: gate1.pass && gate2.pass,
	};
}

export function detectAvailableClis(
	commandExists: (command: string) => boolean,
): readonly SupportedCli[] {
	return SUPPORTED_CLIS.filter((cli) => commandExists(cli));
}

export function selectSupportedCli(
	available: readonly SupportedCli[],
): SupportedCli | undefined {
	return SUPPORTED_CLIS.find((cli) => available.includes(cli));
}

export function buildCliInvocation(
	cli: SupportedCli,
	prompt: string,
): CliInvocation {
	if (cli === "copilot") {
		return {
			command: "copilot",
			args: ["-p", prompt, "--output-format", "json", "--allow-all-tools"],
		};
	}
	return {
		command: "claude",
		args: [
			"-p",
			prompt,
			"--output-format",
			"json",
			"--dangerously-skip-permissions",
		],
	};
}
