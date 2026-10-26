import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { parseSkillManifest } from "../../../src/lib/skills/manifests.js";

const fixtureRepoRoot = path.resolve("test/fixtures/manifest/repo");
const fixtureManifestPath = path.join(
	fixtureRepoRoot,
	"sources/executable-planning/skill.json",
);

function createValidManifest(): Record<string, unknown> {
	return {
		name: "executable-planning",
		title: "Executable Planning",
		description: "Creates deterministic planning checkpoints.",
		output: "skills/executable-planning/SKILL.md",
		selections: [
			{
				source: "core.md",
				owner: "core",
				headings: ["Scope", "Phases"],
			},
			{
				source: "official.md",
				owner: "official",
				headings: ["Discovery"],
				transforms: "transforms.json",
			},
			{
				source: "skill-only.md",
				owner: "skill",
				headings: ["Usage"],
			},
		],
		sectionOwnership: {
			Scope: "core",
			Phases: "core",
			Discovery: "official",
			Usage: "skill",
		},
		requiredPhrases: ["canonical state record"],
		forbiddenPhrases: ["/memories/session/plan.md"],
	};
}

export {
	assert,
	createValidManifest,
	fixtureManifestPath,
	fixtureRepoRoot,
	parseSkillManifest,
	path,
	test,
};
