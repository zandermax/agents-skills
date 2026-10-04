import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillPath = new URL("../skills/agent-polish/SKILL.md", import.meta.url);

async function readSkill(): Promise<string> {
	return readFile(skillPath, "utf8");
}

test("agent-polish defines valid frontmatter and core modes", async () => {
	const skill = await readSkill();

	assert.match(skill, /^---\nname: agent-polish\n/);
	assert.match(
		skill,
		/description: Analyzes agent sessions for workflow tips, cost advice, and instruction fixes\./,
	);
	assert.match(skill, /## Modes of Operation/);
	assert.match(skill, /\*\*`tips`\*\*/);
	assert.match(skill, /\*\*`cost-tips`\*\*/);
	assert.match(skill, /\*\*`improve`\*\*/);
});

test("agent-polish specifies session discovery and ingestion rules", async () => {
	const skill = await readSkill();

	assert.match(skill, /PI_SESSION_FILE/);
	assert.match(skill, /~\/\.omp\/agent\/sessions/);
	assert.match(skill, /~\/\.omp\/agent\/history\.db/);
	assert.match(skill, /role: "user"/);
	assert.match(skill, /role: "assistant"/);
	assert.match(skill, /toolCall/);
	assert.match(skill, /usage/);
	assert.match(skill, /Session data is read-only/);
});

test("agent-polish defines actionable guidance and safety boundaries", async () => {
	const skill = await readSkill();

	assert.match(skill, /Mode 1: Workflow & Prompting Tips/);
	assert.match(skill, /Mode 2: Token & Cost Optimization/);
	assert.match(skill, /Mode 3: Instruction Improvement/);
	assert.match(skill, /AGENTS\.md/);
	assert.match(skill, /Never modify `AGENTS\.md` automatically/);
	assert.match(skill, /Evidence First/);
	assert.match(skill, /Read-Only Analysis/);
});
