import assert from "node:assert/strict";
import test from "node:test";

import { parseFrontmatter } from "../src/lib/frontmatter.js";
import type { SkillManifest } from "../src/lib/manifests.js";
import { listSections } from "../src/lib/markdown-sections.js";
import { type OwnedSection, renderSkill } from "../src/lib/render-skill.js";

function createManifest(): SkillManifest {
	return {
		name: "executable-planning",
		description: "Use when planning work requires deterministic checkpoints.",
		output: ".agents/skills/executable-planning/SKILL.md",
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

test("renderSkill composes deterministic output in manifest heading order", () => {
	const rendered = renderSkill(createManifest(), createSections());

	const expected = [
		"---",
		"name: executable-planning",
		"description: Use when planning work requires deterministic checkpoints.",
		"---",
		"# Executable Planning",
		"",
		"## Scope",
		"Clarify outcomes, constraints, and success criteria first.",
		"",
		"## Phases",
		"Every plan has at least two domain phases and a canonical state record.",
		"",
		"## Discovery",
		"Research the repository and iterate until explicit approval.",
		"",
		"## Usage",
		"Use at the start of planning and preserve deferred items.",
	].join("\n");

	assert.equal(rendered.path, ".agents/skills/executable-planning/SKILL.md");
	assert.equal(rendered.content, expected);

	const h1Count = rendered.content
		.split("\n")
		.filter((line) => line.startsWith("# ")).length;
	assert.equal(h1Count, 1);
	assert.equal(rendered.content.includes("Maintenance notice"), false);
});

test("renderSkill frontmatter contains only name and description", () => {
	const rendered = renderSkill(createManifest(), createSections());
	const parsed = parseFrontmatter(rendered.content, rendered.path);

	assert.deepEqual(Object.keys(parsed.attributes), ["name", "description"]);
	assert.deepEqual(parsed.attributes, {
		name: "executable-planning",
		description: "Use when planning work requires deterministic checkpoints.",
	});
});

test("renderSkill is deterministic across repeated renders", () => {
	const manifest = createManifest();
	const sections = createSections();

	const first = renderSkill(manifest, sections);
	const second = renderSkill(manifest, sections);

	assert.deepEqual(second, first);
});

test("renderSkill rejects duplicate headings in provided sections", () => {
	const sections: readonly OwnedSection[] = [
		...createSections(),
		{
			owner: "core",
			heading: "Scope",
			content: "## Scope\nDuplicate scope section.",
			sourceName: "duplicate-core.md",
		},
	];

	assert.throws(
		() => {
			renderSkill(createManifest(), sections);
		},
		(error: unknown) => {
			assert.match(String(error), /duplicate/i);
			assert.match(String(error), /Scope/);
			return true;
		},
	);
});

test("renderSkill rejects missing section ownership entries", () => {
	const manifest: SkillManifest = {
		...createManifest(),
		sectionOwnership: {
			Scope: "core",
			Phases: "core",
			Discovery: "official",
		},
	};

	assert.throws(
		() => {
			renderSkill(manifest, createSections());
		},
		(error: unknown) => {
			assert.match(String(error), /ownership/i);
			assert.match(String(error), /Usage/);
			return true;
		},
	);
});

test("renderSkill rejects owner mismatches", () => {
	const sections: readonly OwnedSection[] = createSections().map(
		(section): OwnedSection =>
			section.heading === "Discovery"
				? {
						...section,
						owner: "skill",
					}
				: section,
	);

	assert.throws(
		() => {
			renderSkill(createManifest(), sections);
		},
		(error: unknown) => {
			assert.match(String(error), /owner|ownership/i);
			assert.match(String(error), /Discovery/);
			return true;
		},
	);
});

test("renderSkill rejects when required phrase is missing", () => {
	const sections = createSections().map((section) =>
		section.heading === "Phases"
			? {
					...section,
					content: "## Phases\nEvery plan has at least two domain phases.",
				}
			: section,
	);

	assert.throws(
		() => {
			renderSkill(createManifest(), sections);
		},
		(error: unknown) => {
			assert.match(String(error), /required/i);
			assert.match(String(error), /canonical state record/);
			return true;
		},
	);
});

test("renderSkill rejects when forbidden phrase is present", () => {
	const sections = createSections().map((section) =>
		section.heading === "Usage"
			? {
					...section,
					content: `${section.content}\nDo not write to /memories/session/plan.md.`,
				}
			: section,
	);

	assert.throws(
		() => {
			renderSkill(createManifest(), sections);
		},
		(error: unknown) => {
			assert.match(String(error), /forbidden/i);
			assert.match(String(error), /\/memories\/session\/plan\.md/);
			return true;
		},
	);
});

test("renderSkill rejects descriptions longer than 1024 characters", () => {
	const manifest: SkillManifest = {
		...createManifest(),
		description: `Use when ${"x".repeat(1017)}`,
	};

	assert.throws(
		() => {
			renderSkill(manifest, createSections());
		},
		(error: unknown) => {
			assert.match(String(error), /description/i);
			assert.match(String(error), /1024/);
			return true;
		},
	);
});

test("renderSkill ignores fenced hash-prefixed lines when enforcing single H1", () => {
	const sections = createSections().map((section) =>
		section.heading === "Usage"
			? {
					...section,
					content: `${section.content}\n\n\`\`\`md\n# Example\n\`\`\``,
				}
			: section,
	);

	const rendered = renderSkill(createManifest(), sections);
	const parsedH1Count = listSections(rendered.content).filter(
		(section) => section.level === 1,
	).length;

	assert.equal(parsedH1Count, 1);
});

test("renderSkill rejects actual additional parsed H1 headings", () => {
	const sections = createSections().map((section) =>
		section.heading === "Usage"
			? {
					...section,
					content: `${section.content}\n# Extra H1`,
				}
			: section,
	);

	assert.throws(
		() => {
			renderSkill(createManifest(), sections);
		},
		(error: unknown) => {
			assert.match(String(error), /H1/i);
			assert.match(String(error), /one|single/i);
			return true;
		},
	);
});
