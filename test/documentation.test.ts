import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testFilePath), "..");
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

test("repository keeps active and archived plans under one plans root", async () => {
	await access(path.join(projectRoot, "plans"));
	await access(path.join(projectRoot, "plans", "archive"));
	await assert.rejects(
		access(path.join(projectRoot, "docs", "plans")),
		/ENOENT/,
	);
});
