import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testFilePath), "..");
const readmePath = path.join(projectRoot, "README.md");

const REQUIRED_MARKERS = [
	"Prerequisites",
	"npm install",
	"npm run format",
	"npm run build",
	"npm run check",
	"npm run install:clients",
	"npm run install:clients -- --client all",
	"npm run install:clients -- --client copilot",
	"npm run install:clients -- --client claude",
	"npm run install:clients -- --client agents",
	"Reload the VS Code window",
	"start a new chat",
	"Executable Planner",
	"REQUIRED SKILL",
	"restart Claude Code",
	"executable-planning",
	"Copilot .agent.md is not a Claude agent",
	"Agent Skills directory convention",
	"collision",
	"never overwritten",
	"moved",
	"remove the stale symlink",
	"rerun installation",
	"official",
	"vendor/copilot/Plan.agent.md",
	"byte-preserving copy",
	"sources/executable-planning/transforms.json",
	"vendor/copilot/README.md",
	"npm run check:drift",
	"sources/<name>/skill.json",
	".agents/skills/<name>/SKILL.md",
	"without changing src/build-skills.ts",
] as const;

const REQUIRED_MAPPINGS = [
	"Copilot file: `.github/agents/executable-planner.agent.md` -> `~/.copilot/agents/executable-planner.agent.md`",
	"Copilot directory: `.agents/skills/executable-planning` -> `~/.copilot/skills/executable-planning`",
	"Claude directory: `.agents/skills/executable-planning` -> `~/.claude/skills/executable-planning`",
	"Agent Skills directory: `.agents/skills/executable-planning` -> `~/.agents/skills/executable-planning`",
] as const;

test("README includes required installation and maintenance markers", async () => {
	const readme = await readFile(readmePath, "utf8");

	for (const marker of REQUIRED_MARKERS) {
		assert.match(
			readme,
			new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
			`README is missing marker: ${marker}`,
		);
	}

	for (const mapping of REQUIRED_MAPPINGS) {
		assert.equal(
			readme.includes(mapping),
			true,
			`README is missing exact mapping: ${mapping}`,
		);
	}
});
