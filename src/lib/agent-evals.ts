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

function extractJsonEvents(rawOutput: string): readonly unknown[] {
	const trimmed = rawOutput.trim();
	if (trimmed.length === 0) {
		return [];
	}

	try {
		const parsed = JSON.parse(trimmed);
		return Array.isArray(parsed) ? parsed : [parsed];
	} catch {
		// Not a single JSON value; fall through to JSONL parsing below.
	}

	const events: unknown[] = [];
	for (const line of trimmed.split("\n")) {
		const trimmedLine = line.trim();
		if (trimmedLine.length === 0) {
			continue;
		}
		try {
			events.push(JSON.parse(trimmedLine));
		} catch {
			// Ignore non-JSON lines (e.g. banners); transcripts are best-effort.
		}
	}
	return events;
}

const FILE_ARGUMENT_KEYS = ["path", "filePath", "file_path"] as const;

/**
 * Extracts memory/skill access from tool-invocation events nested under an
 * event's `data` field. Covers Copilot's `skill` tool (names the memory
 * directly, no file path) and its `view` tool (a `path` argument), verified
 * against a real captured transcript (2026-09-10, see plan Phase 2).
 */
function extractFilesAccessed(events: readonly unknown[]): readonly string[] {
	const found = new Set<string>();
	for (const event of events) {
		if (typeof event !== "object" || event === null) {
			continue;
		}
		const data = (event as Record<string, unknown>).data;
		if (typeof data !== "object" || data === null) {
			continue;
		}
		const dataRecord = data as Record<string, unknown>;

		if (dataRecord.toolName === "skill") {
			const args = dataRecord.arguments;
			if (typeof args === "object" && args !== null) {
				const skillName = (args as Record<string, unknown>).skill;
				if (typeof skillName === "string") {
					found.add(skillName);
				}
			}
		}

		const args = dataRecord.arguments ?? dataRecord.input;
		if (typeof args === "object" && args !== null) {
			const argsRecord = args as Record<string, unknown>;
			for (const key of FILE_ARGUMENT_KEYS) {
				const value = argsRecord[key];
				if (typeof value === "string") {
					found.add(value);
				}
			}
		}
	}
	return Array.from(found);
}

/**
 * Extracts the final response text. Handles Copilot's JSONL
 * `assistant.message` events (`data.content` is a plain string) and Claude's
 * `--output-format json` single-result object (top-level `result` string).
 * The nested content-block scan is best-effort for Claude's stream-json mode
 * and not yet verified against a real transcript.
 */
function extractResponseText(events: readonly unknown[]): string {
	let combined = "";
	for (const event of events) {
		if (typeof event !== "object" || event === null) {
			continue;
		}
		const record = event as Record<string, unknown>;

		if (typeof record.result === "string" && record.result.length > 0) {
			combined += `${record.result}\n`;
		}

		const data = record.data;
		if (typeof data !== "object" || data === null) {
			continue;
		}
		const dataRecord = data as Record<string, unknown>;

		if (
			record.type === "assistant.message" &&
			typeof dataRecord.content === "string" &&
			dataRecord.content.length > 0
		) {
			combined += `${dataRecord.content}\n`;
		}

		const content = dataRecord.content;
		if (Array.isArray(content)) {
			for (const block of content) {
				if (typeof block !== "object" || block === null) {
					continue;
				}
				const blockRecord = block as Record<string, unknown>;
				if (
					blockRecord.type === "text" &&
					typeof blockRecord.text === "string"
				) {
					combined += `${blockRecord.text}\n`;
				}
			}
		}
	}
	return combined.trim();
}

/**
 * Schema-tolerant transcript parser covering a single JSON result object and
 * JSONL event streams. Validated against a real Copilot CLI transcript in
 * docs/plans/2026-09-09-agent-behavioral-testing-paradigm.md Phase 2; Claude
 * support remains best-effort pending a real captured transcript.
 */
export function parseCliTranscript(rawOutput: string): EvalTranscript {
	const events = extractJsonEvents(rawOutput);
	return {
		filesAccessed: extractFilesAccessed(events),
		responseText: extractResponseText(events),
	};
}
