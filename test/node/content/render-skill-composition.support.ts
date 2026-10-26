import {
	assert,
	createManifest,
	createSections,
	parseFrontmatter,
	renderSkill,
	test,
} from "./render-skill.shared.js";

test("renderSkill composes deterministic output in manifest heading order", () => {
	const rendered = renderSkill(createManifest(), createSections());

	const expected = [
		"---",
		"name: executable-planning",
		"description: Creates deterministic planning checkpoints.",
		"---",
		"",
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
		"",
	].join("\n");

	assert.equal(rendered.path, "skills/executable-planning/SKILL.md");
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
		description: "Creates deterministic planning checkpoints.",
	});
});

test("renderSkill is deterministic across repeated renders", () => {
	const manifest = createManifest();
	const sections = createSections();

	const first = renderSkill(manifest, sections);
	const second = renderSkill(manifest, sections);

	assert.deepEqual(second, first);
});

test("renderSkill uses each manifest title for the generated H1", () => {
	const alpha = renderSkill(
		{
			...createManifest(),
			name: "alpha",
			title: "Alpha Skill",
			output: "skills/alpha/SKILL.md",
		},
		createSections(),
	);
	const beta = renderSkill(
		{
			...createManifest(),
			name: "beta",
			title: "Beta Skill",
			output: "skills/beta/SKILL.md",
		},
		createSections(),
	);

	assert.match(alpha.content, /# Alpha Skill\n/);
	assert.match(beta.content, /# Beta Skill\n/);
	assert.notEqual(alpha.content, beta.content);
});
