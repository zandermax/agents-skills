import {
	assert,
	checkCustomizations,
	createFixtureRepo,
	mkdir,
	path,
	rm,
	test,
	writeFile,
} from "./check-customizations.shared.js";

test("checkCustomizations rejects agents declaring an unknown required skill", async () => {
	const repoRoot = await createFixtureRepo({
		agentBodyOverride: [
			"# Executable Planner",
			"",
			"**REQUIRED SKILL:** Use missing-skill for planning behavior.",
		].join("\n"),
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(String(error), /agents\/executable-planner\.agent\.md:/);
				assert.match(String(error), /missing-skill/);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations validates each Copilot agent against only its declared skills", async () => {
	const repoRoot = await createFixtureRepo();
	const reviewingSourceDir = path.join(repoRoot, "sources", "reviewing");
	const reviewingSkillDir = path.join(repoRoot, "skills", "reviewing");

	await mkdir(reviewingSourceDir, { recursive: true });
	await mkdir(reviewingSkillDir, { recursive: true });
	await writeFile(
		path.join(reviewingSourceDir, "core.md"),
		"## Review\nReview source content.\n",
		"utf8",
	);
	await writeFile(
		path.join(reviewingSourceDir, "skill.json"),
		JSON.stringify(
			{
				name: "reviewing",
				title: "Reviewing",
				description: "Provides focused review feedback.",
				output: "skills/reviewing/SKILL.md",
				selections: [
					{ source: "core.md", owner: "core", headings: ["Review"] },
				],
				sectionOwnership: { Review: "core" },
				requiredPhrases: [],
				forbiddenPhrases: [],
			},
			null,
			2,
		),
		"utf8",
	);
	await writeFile(
		path.join(reviewingSkillDir, "SKILL.md"),
		"---\nname: reviewing\ndescription: Provides focused review feedback.\n---\n# Reviewing\n\n## Review\nReview feedback.\n",
		"utf8",
	);
	await writeFile(
		path.join(repoRoot, "agents", "reviewer.agent.md"),
		'---\nname: Reviewer\ndescription: Review work.\ntools: ["read", "search", "web", "vscode/askQuestions"]\n---\n\n**REQUIRED SKILL:** Use reviewing for review behavior.\n',
		"utf8",
	);

	try {
		await checkCustomizations(repoRoot);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects a Copilot agent missing a baseline tool", async () => {
	const repoRoot = await createFixtureRepo();
	await writeFile(
		path.join(repoRoot, "agents", "executable-planner.agent.md"),
		[
			"---",
			"name: Executable Planner",
			"description: Planning-only orchestrator.",
			'tools: ["read", "search", "web"]',
			"---",
			"# Executable Planner",
			"",
			"**REQUIRED SKILL:** Use executable-planning for all planning behavior.",
			"",
			"Keep this agent thin and delegate planning workflow to the skill.",
		].join("\n"),
		"utf8",
	);

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(String(error), /agents\/executable-planner\.agent\.md:/);
				assert.match(
					String(error),
					/agent tools missing required baseline tool vscode\/askQuestions/,
				);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects duplicated canonical headings in thin agent", async () => {
	const repoRoot = await createFixtureRepo({
		agentBodyOverride: [
			"# Executable Planner",
			"",
			"**REQUIRED SKILL:** Use executable-planning for all planning behavior.",
			"",
			"## Scope",
			"Duplicated workflow section should stay in the skill.",
		].join("\n"),
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(String(error), /agents\/executable-planner\.agent\.md:/);
				assert.match(String(error), /duplicate canonical heading/i);
				assert.match(String(error), /Scope/);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects canonical headings at any agent heading level", async () => {
	const repoRoot = await createFixtureRepo({
		agentBodyOverride: [
			"# Scope",
			"",
			"**REQUIRED SKILL:** Use executable-planning for all planning behavior.",
			"",
			"A level-one heading must not bypass canonical ownership.",
		].join("\n"),
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(String(error), /duplicate canonical heading/i);
				assert.match(String(error), /Scope/);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});
