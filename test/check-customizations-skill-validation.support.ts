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

test("checkCustomizations rejects skill folder and frontmatter name mismatches", async () => {
	const repoRoot = await createFixtureRepo({
		skillFolderName: "different-name",
		skillFrontmatterName: "executable-planning",
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				const message = String(error);
				assert.match(message, /skills\/different-name\/SKILL\.md:/);
				assert.match(message, /frontmatter name/i);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects forbidden agent-only skill frontmatter", async () => {
	const repoRoot = await createFixtureRepo({
		skillExtraFrontmatter: { tools: ["run_in_terminal"] },
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(String(error), /SKILL\.md:/);
				assert.match(String(error), /frontmatter/i);
				assert.match(String(error), /tools/);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations accepts a manual-invocation-only skill", async () => {
	const repoRoot = await createFixtureRepo({
		skillExtraFrontmatter: { "disable-model-invocation": true },
	});

	try {
		await checkCustomizations(repoRoot);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects disable-model-invocation set to a non-true value", async () => {
	const repoRoot = await createFixtureRepo({
		skillExtraFrontmatter: { "disable-model-invocation": false },
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(String(error), /SKILL\.md:/);
				assert.match(String(error), /disable-model-invocation must be true/i);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations reports skill-file errors in code-point lexical order", async () => {
	const repoRoot = await createFixtureRepo();

	const upperSkillDir = path.join(repoRoot, "skills", "B-skill");
	await mkdir(upperSkillDir, { recursive: true });
	await writeFile(
		path.join(upperSkillDir, "SKILL.md"),
		[
			"---",
			'name: "B-skill"',
			'description: "Uppercase sort probe"',
			"---",
			"# B Skill",
			"",
			"## Scope",
			"Contains run_in_terminal token for deterministic ordering checks.",
		].join("\n"),
		"utf8",
	);

	const lowerSkillDir = path.join(repoRoot, "skills", "a-skill");
	await mkdir(lowerSkillDir, { recursive: true });
	await writeFile(
		path.join(lowerSkillDir, "SKILL.md"),
		[
			"---",
			'name: "a-skill"',
			'description: "Lowercase sort probe"',
			"---",
			"# A Skill",
			"",
			"## Scope",
			"Contains run_in_terminal token for deterministic ordering checks.",
		].join("\n"),
		"utf8",
	);

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				const message = String(error);
				const upperIndex = message.indexOf("skills/B-skill/SKILL.md:");
				const lowerIndex = message.indexOf("skills/a-skill/SKILL.md:");

				assert.notEqual(upperIndex, -1);
				assert.notEqual(lowerIndex, -1);
				assert.ok(upperIndex < lowerIndex);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects VS Code tool and session tokens in skill content", async () => {
	const repoRoot = await createFixtureRepo({
		skillBodyExtra:
			"\nDo not store plans in /memories/session/plan.md and call run_in_terminal.",
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(String(error), /SKILL\.md:/);
				assert.match(String(error), /\/memories\/session\/plan\.md/);
				assert.match(String(error), /run_in_terminal/);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});
