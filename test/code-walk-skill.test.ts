import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillPath = new URL(
	"../.agents/skills/code-walk/SKILL.md",
	import.meta.url,
);
const agentPath = new URL(
	"../.github/agents/code-walk.agent.md",
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
