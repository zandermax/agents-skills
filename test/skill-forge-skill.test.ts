import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillUrl = new URL(
	"../.agents/skills/skill-forge/SKILL.md",
	import.meta.url,
);

test("skill-forge uses harness questions and considers planning handoffs", async () => {
	const skill = await readFile(skillUrl, "utf8");

	assert.match(skill, /structured question mechanism.*available/i);
	assert.match(skill, /planning-to-implementation transition/i);
	assert.match(skill, /handoff/i);
});
