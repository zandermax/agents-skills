import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testFilePath), "..");
const agentInstructionsPath = path.join(projectRoot, "AGENTS.md");
const readmePath = path.join(projectRoot, "README.md");

const REQUIRED_MARKERS = [
	"# Agents Skills",
	"npm install",
	"npm run build",
	"npm run check",
	"npm run install:artifacts",
	"npm run install:artifacts -- --list",
	"--client",
	"--skill",
	"--agent",
	"--skills-dir",
	"--agents-dir",
	"install-catalog.json",
	"Adding Skills",
	"Adding Agent Formats",
	"custom destination",
	"collision",
	"stale symlink",
	"repository is moved",
	"Planning Skill Maintenance",
	"sources/executable-planning/workflow.md",
] as const;

test("README documents catalog-driven artifact installation and maintenance", async () => {
	const readme = await readFile(readmePath, "utf8");
	for (const marker of REQUIRED_MARKERS) {
		assert.match(
			readme,
			new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
			`README is missing marker: ${marker}`,
		);
	}
	assert.equal(
		readme.includes(
			"Source and destination mappings used by scripts/install-clients.ts",
		),
		false,
	);
});

test("shared agent instructions treat staging as semantically neutral", async () => {
	const instructions = await readFile(agentInstructionsPath, "utf8");
	const normalizedInstructions = instructions.replace(/\s+/g, " ");
	assert.match(
		normalizedInstructions,
		/stage changes at any time solely to monitor them/i,
	);
	assert.match(
		normalizedInstructions,
		/carry no signal about progress.*desired file state/i,
	);
	assert.match(
		normalizedInstructions,
		/Never mutate Git or try to make the index and worktree match/i,
	);
	assert.match(
		normalizedInstructions,
		/working files and fresh task-specific checks/i,
	);
});

test("shared agent instructions prohibit speculative skill builds", async () => {
	const instructions = await readFile(agentInstructionsPath, "utf8");
	const normalizedInstructions = instructions.replace(/\s+/g, " ");
	assert.match(
		normalizedInstructions,
		/Never run `npm run build` unless you have modified a source file under `sources\/` or a `skill\.json` manifest/i,
	);
});

test("shared agent instructions keep filesystem access inside the workspace by default", async () => {
	const instructions = await readFile(agentInstructionsPath, "utf8");
	const normalizedInstructions = instructions.replace(/\s+/g, " ");
	assert.match(
		normalizedInstructions,
		/active workspace folders as the default filesystem boundary/i,
	);
	assert.match(
		normalizedInstructions,
		/explicitly requests the exact path.*active plan names it as required/i,
	);
	assert.match(
		normalizedInstructions,
		/state the exact path and reason and request approval/i,
	);
	assert.match(
		normalizedInstructions,
		/Do not perform optional history or context lookups merely because/i,
	);
});

test("repository keeps active and archived plans beside specifications under docs", async () => {
	await access(path.join(projectRoot, "docs", "plans"));
	await access(path.join(projectRoot, "docs", "plans", "archive"));
	await access(path.join(projectRoot, "docs", "specs"));
	await assert.rejects(access(path.join(projectRoot, "plans")), /ENOENT/);
});

test("completed skill-forge plan exists only in the archive", async () => {
	await access(
		path.join(
			projectRoot,
			"docs",
			"plans",
			"archive",
			"2026-09-03-skill-forge-skill.md",
		),
	);
	await assert.rejects(
		access(
			path.join(
				projectRoot,
				"docs",
				"plans",
				"2026-09-03-skill-forge-skill.md",
			),
		),
		/ENOENT/,
	);
});
