import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillPath = new URL(
	"../skills/learn-from-that/SKILL.md",
	import.meta.url,
);

test("learn-from-that defines valid frontmatter and core description", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(
		skill,
		/description: Diagnoses conversation friction and proposes generalizable improvements\./,
	);
	assert.match(skill, /## Invariant Remediation Hierarchy/);
	assert.match(skill, /## Operational Distinctions/);
	assert.match(skill, /## Diagnostic Categories/);
	assert.match(skill, /## Output Structure/);
});

test("learn-from-that specifies strict remediation hierarchy and subtraction-first principle", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /Shared Skills & Dedicated Tools/);
	assert.match(skill, /agents-skills\//);
	assert.match(skill, /Instruction Refactoring & Deletion/);
	assert.match(skill, /config-stuff\//);
	assert.match(skill, /Subtraction-First Principle/);
	assert.match(
		skill,
		/NEVER suggest adding instructions unless it is conclusively determined that modifying, clarifying, or removing existing instructions cannot solve the problem/,
	);
	assert.match(skill, /Private Memory & Preferences/);
	assert.match(skill, /User Prompting Habits \(Last Resort Only\)/);
});

test("learn-from-that establishes clear operational boundary with agent-polish", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /learn-from-that` vs `agent-polish/);
	assert.match(skill, /active conversation transcript/i);
	assert.match(skill, /retrospectively across multiple past sessions/i);
});

test("learn-from-that evaluates key diagnostic dimensions and generalizability", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /Hangups & Permission Boundaries/);
	assert.match(skill, /Tool Loops & Retries/);
	assert.match(skill, /Turn Churn & Conversation Length/);
	assert.match(skill, /Context Bloat & Token Efficiency/);
	assert.match(skill, /Generalizability/);
	assert.match(skill, /Reject ad-hoc, brittle rules/);
});
