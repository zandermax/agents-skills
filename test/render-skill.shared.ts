import assert from "node:assert/strict";
import test from "node:test";

import { parseFrontmatter } from "../src/lib/frontmatter.js";
import type { SkillManifest } from "../src/lib/manifests.js";
import { listSections } from "../src/lib/markdown-sections.js";
import { type OwnedSection, renderSkill } from "../src/lib/render-skill.js";

function createManifest(): SkillManifest {
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

function createSections(): readonly OwnedSection[] {
	return [
		{
			owner: "skill",
			heading: "Usage",
			content: [
				"## Usage",
				"Use at the start of planning and preserve deferred items.",
			].join("\n"),
			sourceName: "skill-only.md",
		},
		{
			owner: "core",
			heading: "Phases",
			content: [
				"## Phases",
				"Every plan has at least two domain phases and a canonical state record.",
			].join("\n"),
			sourceName: "core.md",
		},
		{
			owner: "official",
			heading: "Discovery",
			content: [
				"## Discovery",
				"Research the repository and iterate until explicit approval.",
			].join("\n"),
			sourceName: "official.md",
		},
		{
			owner: "core",
			heading: "Scope",
			content: [
				"## Scope",
				"Clarify outcomes, constraints, and success criteria first.",
			].join("\n"),
			sourceName: "core.md",
		},
	];
}

export type { OwnedSection, SkillManifest };
export {
	assert,
	createManifest,
	createSections,
	listSections,
	parseFrontmatter,
	renderSkill,
	test,
};
