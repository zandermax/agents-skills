import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const skillPath = new URL(
	"../../../skills/project-history/SKILL.md",
	import.meta.url,
);
const contractPath = new URL(
	"../../../skills/project-history/references/contract.md",
	import.meta.url,
);

async function readSkill(): Promise<string> {
	return readFile(skillPath, "utf8");
}

test("project-history defines valid frontmatter and metadata", async () => {
	const skill = await readSkill();

	assert.match(skill, /^---\nname: project-history\n/);
	assert.match(
		skill,
		/description: Sets up Git decision changelogs, branch inventories, and pre-push guards\./,
	);
});

test("project-history includes required assets and contract", async () => {
	const skill = await readSkill();

	assert.match(skill, /references\/contract\.md/);
	assert.match(skill, /scripts\/check-project-history\.mjs/);
	assert.match(skill, /scripts\/pre-push-project-history\.mjs/);
	assert.match(skill, /scripts\/record-history\.mjs/);

	const contract = await readFile(contractPath, "utf8");
	assert.match(contract, /# Project history contract/);
	assert.match(contract, /PROJECT_HISTORY\.md/);
	assert.match(contract, /## Git status/);
	assert.match(contract, /## Log/);

	const checker = new URL(
		"../../../skills/project-history/scripts/check-project-history.mjs",
		import.meta.url,
	);
	const prePush = new URL(
		"../../../skills/project-history/scripts/pre-push-project-history.mjs",
		import.meta.url,
	);
	const record = new URL(
		"../../../skills/project-history/scripts/record-history.mjs",
		import.meta.url,
	);

	assert.ok((await stat(checker)).isFile());
	assert.ok((await stat(prePush)).isFile());
	assert.ok((await stat(record)).isFile());
});

test("project-history specifies one-time installation and hook setup", async () => {
	const skill = await readSkill();

	assert.match(skill, /One-time installation into a target project/);
	assert.match(skill, /post-commit/);
	assert.match(skill, /pre-push/);
	assert.match(skill, /Guidance to add to each AGENTS\.md/);
	assert.match(skill, /## Scope boundaries/);
});
