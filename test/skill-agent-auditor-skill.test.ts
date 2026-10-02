import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillPath = new URL(
	"../.agents/skills/skill-agent-auditor/SKILL.md",
	import.meta.url,
);

async function readSkill(): Promise<string> {
	return readFile(skillPath, "utf8");
}

test("skill-agent-auditor defines target selection and read-only boundaries", async () => {
	const skill = await readSkill();

	assert.match(skill, /explicit path or exact skill or agent name/);
	assert.match(skill, /complete inline artifact as the audit target/);
	assert.match(skill, /Do not search for a separate on-disk artifact/);
	assert.match(skill, /never perform repository discovery for that artifact/);
	assert.match(skill, /Do not require unstated repository schema rules/);
	assert.match(skill, /Do not manufacture an important finding/);
	assert.match(
		skill,
		/return `ready` when it has a clear trigger, input, output, and safety boundary/,
	);
	assert.match(skill, /compare its declared name with the path folder name/);
	assert.match(skill, /Classify a path-name mismatch as `blocking`/);
	assert.match(skill, /Audit every declared skill relationship separately/);
	assert.match(skill, /quoted relationship contracts are supplied evidence/);
	assert.match(
		skill,
		/separate named subsection for every audited relationship/,
	);
	assert.match(skill, /## Relationship: <agent> -> <skill>/);
	assert.match(skill, /Never modify target artifacts/);
	assert.match(skill, /smallest applicable existing validation commands/);
});

test("skill-agent-auditor defines layered evidence and coverage decisions", async () => {
	const skill = await readSkill();

	assert.match(skill, /`confirmed`.*deterministic/i);
	assert.match(skill, /`observed`.*behavioral evaluation/i);
	assert.match(skill, /`inferred`.*rubric/i);
	assert.match(skill, /Label every rubric-based assessment as `inferred`/);
	assert.match(skill, /`evidence: inferred`/);
	assert.match(
		skill,
		/coverage assessment.*`evidence: inferred`.*absent behavioral coverage.*advisory/is,
	);
	assert.match(skill, /baseline rubric/);
	assert.match(skill, /target-specific profile/);
	assert.match(skill, /high-risk or complex target/i);
});

test("skill-agent-auditor reports prioritized findings and bounded handoff", async () => {
	const skill = await readSkill();

	assert.match(skill, /`blocking`, `important`, and `advisory`/);
	assert.match(skill, /`ready`, `ready with follow-ups`, or `not ready`/);
	assert.match(skill, /optional remediation brief/);
	assert.match(skill, /Stop after the report/);
});
