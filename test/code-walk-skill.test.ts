import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillPath = new URL(
	"../.agents/skills/code-walk/SKILL.md",
	import.meta.url,
);
const teachSkillPath = new URL(
	"../.agents/skills/teach-by-doing/SKILL.md",
	import.meta.url,
);
const agentPath = new URL(
	"../.github/agents/code-walk.agent.md",
	import.meta.url,
);
const teachAgentPath = new URL(
	"../.github/agents/teach-by-doing.agent.md",
	import.meta.url,
);

test("code walk suggests concrete code for each step by default", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /for every implementation step/i);
	assert.match(skill, /exact code/i);
	assert.match(skill, /unless the user (?:asks|has asked|opts) not to/i);
	assert.match(skill, /only the lines that need to change/i);
	assert.match(skill, /do not reproduce (?:an |the )?entire function or file/i);
	assert.match(
		skill,
		/unless\s+(?:all of it|the whole (?:function|file)) changes/i,
	);
});

test("code walk keeps suggestions separate from applying edits", async () => {
	const agent = await readFile(agentPath, "utf8");

	assert.match(agent, /suggest(?:ing)? concrete code/i);
	assert.match(agent, /never apply/i);
});

test("teach-by-doing and code-walk handle requested full explanations", async () => {
	const teachSkill = await readFile(teachSkillPath, "utf8");
	const codeSkill = await readFile(skillPath, "utf8");

	assert.match(teachSkill, /with\s+full\s+explanation/i);
	assert.match(teachSkill, /beginner to/i);
	assert.match(teachSkill, /codebase/i);

	assert.match(codeSkill, /with\s+full\s+explanation/i);
	assert.match(codeSkill, /beginner to/i);
	assert.match(codeSkill, /codebase/i);
});

test("teach-by-doing and code-walk instruct concise agent action descriptions", async () => {
	const teachSkill = await readFile(teachSkillPath, "utf8");
	const codeSkill = await readFile(skillPath, "utf8");
	const teachAgent = await readFile(teachAgentPath, "utf8");
	const codeAgent = await readFile(agentPath, "utf8");

	assert.match(teachSkill, /concise/i);
	assert.match(teachSkill, /read-only/i);

	assert.match(codeSkill, /concise/i);
	assert.match(codeSkill, /read-only/i);

	assert.match(teachAgent, /concise/i);
	assert.match(codeAgent, /concise/i);
});
