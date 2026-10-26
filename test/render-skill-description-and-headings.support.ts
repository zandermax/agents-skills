import type { SkillManifest } from "./render-skill.shared.js";
import {
	assert,
	createManifest,
	createSections,
	listSections,
	renderSkill,
	test,
} from "./render-skill.shared.js";

test("renderSkill rejects descriptions longer than 80 characters", () => {
	const manifest: SkillManifest = {
		...createManifest(),
		description: `Creates ${"x".repeat(73)}`,
	};

	assert.throws(
		() => {
			renderSkill(manifest, createSections());
		},
		(error: unknown) => {
			assert.match(String(error), /description/i);
			assert.match(String(error), /80/);
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
