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
