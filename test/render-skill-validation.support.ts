import type { OwnedSection, SkillManifest } from "./render-skill.shared.js";
import {
	assert,
	createManifest,
	createSections,
	renderSkill,
	test,
} from "./render-skill.shared.js";

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
