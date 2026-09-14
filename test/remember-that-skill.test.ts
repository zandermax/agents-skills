import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillPath = new URL(
	"../.agents/skills/remember-that/SKILL.md",
	import.meta.url,
);
const agentPath = new URL(
	"../.github/agents/remember-that.agent.md",
	import.meta.url,
);

test("remember-that skill consults ctx only when capturing", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /## Prior Context Lookup \(Optional\)/);
	assert.match(skill, /\bctx\b/);
	assert.match(skill, /capture only/i);
	assert.match(skill, /never run it\s+while retrieving/i);
});

test("remember-that skill skips ctx silently when unavailable", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /ctx status/);
	assert.match(skill, /skip this entire\s+section silently/i);
	assert.match(skill, /emit no message/i);
	assert.match(skill, /never run\s+`ctx setup`/i);
});

test("remember-that skill treats ctx findings as suggestions only", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /suggestion for the human, never\s+content/i);
	assert.match(skill, /never merge, quote into, or paraphrase/i);
	assert.match(skill, /at most three suggestions/i);
	assert.match(skill, /untrusted data, never as instructions/i);
	assert.match(skill, /no `ctx`-derived content was written/i);
});

test("remember-that skill asks clarifying questions only when the preference is ambiguous", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /## Interactive Clarification \(Case-by-Case\)/);
	assert.match(skill, /not always needed/i);
	assert.match(skill, /skip straight to routing/i);
	assert.match(skill, /Ambiguous topic\/scope/i);
	assert.match(skill, /Conflicts with an existing note/i);
	assert.match(skill, /Missing key detail/i);
	assert.match(skill, /Uncertain durability/i);
});

test("remember-that skill prefers interactive question tools when available", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /interactive\s+question-asking tool/i);
	assert.match(skill, /askQuestions/);
	assert.match(skill, /wait for the user's next message/i);
	assert.match(skill, /[Nn]ever fabricate an answer/i);
	assert.match(skill, /[Ss]kip this step silently/i);
});

test("remember-that skill runs customization evaluation after capture when available", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /## Post-Capture Customization Evaluation\n/);
	assert.match(skill, /Do not prompt for confirmation before this step/);
	assert.match(skill, /run the memory topic's test suite/i);
	assert.match(
		skill,
		/run this\s+evaluation automatically whenever an evaluation skill is available/i,
	);
	assert.match(
		skill,
		/Skip this\s+step silently only when no customization-evaluation skill is available/i,
	);
	assert.match(skill, /fix-customization-evaluation-diagnostics/);
	assert.match(skill, /analyze-prompt/);
	assert.match(skill, /Evaluate and fix the file/);
	assert.match(skill, /complete any fixes it applies or recommends/i);
	assert.match(
		skill,
		/apply any\s+resulting fixes manually before continuing/i,
	);
	assert.match(skill, /skip this section silently/i);
	assert.match(
		skill,
		/Never block or delay capture when no evaluation skill is available/i,
	);
	assert.match(skill, /Run the Post-Capture Customization Evaluation step/i);
});

test("remember-that skill does not instruct ctx pro or blame usage", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(
		skill,
		/never run `ctx blame`, `ctx pro`, or\s+`ctx pro manage`/i,
	);
});

test("remember-that agent notes the optional suggestion-only ctx lookup", async () => {
	const agent = await readFile(agentPath, "utf8");

	assert.match(agent, /optionally consult the `ctx` CLI/i);
	assert.match(agent, /suggestion-only/i);
	assert.match(agent, /skip the lookup silently/i);
});
