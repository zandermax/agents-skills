import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillPath = new URL(
	"../.agents/skills/plan-executor/SKILL.md",
	import.meta.url,
);
const agentPath = new URL(
	"../.github/agents/plan-executor.agent.md",
	import.meta.url,
);

test("plan-executor skill frontmatter and core structure", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /^name:\s*plan-executor$/m);
	assert.match(
		skill,
		/^description:\s*Executes implementation plans with step verification and tracking$/m,
	);
	assert.match(skill, /# Plan Executor/);
	assert.match(skill, /## Invariants/);
	assert.match(skill, /## Harness Mechanisms/);
	assert.match(skill, /## Workflow/);

	assert.match(skill, /Every repo-backed plan starts with YAML frontmatter/i);
	assert.match(skill, /One canonical plan/i);
	assert.match(skill, /Plan existence gate/i);
	assert.match(skill, /Evidence before assertion/i);
	assert.match(skill, /Stop on blocker/i);
	assert.match(skill, /missing, incomplete, or malformed|canonical plan/i);
	assert.match(skill, /plan-checker.*admission|admission.*plan-checker/i);
	assert.match(skill, /`not-ready`.*block|block.*`not-ready`/i);
	assert.match(skill, /`unchecked`.*block|block.*`unchecked`/i);
	assert.match(skill, /fingerprint.*match|match.*fingerprint/i);
	assert.match(skill, /semantic.*change.*invalid|invalid.*semantic.*change/i);
	assert.match(
		skill,
		/before.*implementation write|implementation write.*before/i,
	);
});

test("plan-executor agent frontmatter and required skill reference", async () => {
	const agent = await readFile(agentPath, "utf8");

	assert.match(agent, /^name:\s*Plan Executor$/m);
	assert.match(
		agent,
		/^description:\s*Executes implementation plans step-by-step with strict verification$/m,
	);
	assert.match(
		agent,
		/\*\*REQUIRED SKILL:\*\*\s+Use\s+plan-executor\s+for all implementation plan execution behavior\./,
	);
	assert.match(
		agent,
		/tools:\s*\[\s*"search"\s*,\s*"read"\s*,\s*"edit"\s*,\s*"execute"\s*,\s*"agent"\s*,\s*"todo"\s*\]/i,
	);
	assert.match(agent, /no canonical plan exists|malformed|incomplete/i);
	assert.match(agent, /plan-checker admission and freshness gates/i);
	assert.match(agent, /`unchecked`.*`not-ready`|`not-ready`.*`unchecked`/i);
	assert.match(agent, /fingerprint mismatch/i);
});
