import {
	assert,
	createValidManifest,
	fixtureManifestPath,
	fixtureRepoRoot,
	parseSkillManifest,
	test,
} from "./manifests.shared.js";

test("parseSkillManifest parses a valid closed manifest", () => {
	const parsed = parseSkillManifest(
		createValidManifest(),
		fixtureManifestPath,
		fixtureRepoRoot,
	);

	assert.equal(parsed.name, "executable-planning");
	assert.equal(parsed.title, "Executable Planning");
	assert.equal(parsed.output, "skills/executable-planning/SKILL.md");
	assert.equal(parsed.selections.length, 3);
	assert.equal(parsed.selections[1]?.owner, "official");
	assert.equal(parsed.selections[1]?.transforms, "transforms.json");
	assert.deepEqual(parsed.sectionOwnership, {
		Scope: "core",
		Phases: "core",
		Discovery: "official",
		Usage: "skill",
	});
	assert.ok(parsed.selections[0]);
	assert.ok(Object.isFrozen(parsed));
	assert.ok(Object.isFrozen(parsed.selections));
	assert.ok(Object.isFrozen(parsed.selections[0].headings));
	assert.ok(Object.isFrozen(parsed.sectionOwnership));
});

test("parseSkillManifest rejects unknown keys and wrong primitive types", () => {
	const withUnknown = {
		...createValidManifest(),
		unexpected: true,
	};

	assert.throws(
		() => {
			parseSkillManifest(withUnknown, fixtureManifestPath, fixtureRepoRoot);
		},
		(error: unknown) => {
			assert.match(String(error), /unknown/i);
			assert.match(String(error), /unexpected/);
			return true;
		},
	);

	const wrongTypes = {
		...createValidManifest(),
		name: 123,
	};

	assert.throws(
		() => {
			parseSkillManifest(wrongTypes, fixtureManifestPath, fixtureRepoRoot);
		},
		(error: unknown) => {
			assert.match(String(error), /name/);
			assert.match(String(error), /string/i);
			return true;
		},
	);
});

test("parseSkillManifest validates name, title, description prefix, and output path", () => {
	assert.throws(
		() => {
			parseSkillManifest(
				{
					...createValidManifest(),
					name: "Executable Planning",
				},
				fixtureManifestPath,
				fixtureRepoRoot,
			);
		},
		(error: unknown) => {
			assert.match(String(error), /name/);
			return true;
		},
	);

	for (const title of [
		undefined,
		123,
		"",
		" Executable Planning",
		"Executable\nPlanning",
	]) {
		assert.throws(
			() => {
				parseSkillManifest(
					{
						...createValidManifest(),
						title,
					},
					fixtureManifestPath,
					fixtureRepoRoot,
				);
			},
			(error: unknown) => {
				assert.match(String(error), /title/i);
				return true;
			},
		);
	}

	assert.throws(
		() => {
			parseSkillManifest(
				{
					...createValidManifest(),
					description: "Use when planning.",
				},
				fixtureManifestPath,
				fixtureRepoRoot,
			);
		},
		(error: unknown) => {
			assert.match(String(error), /instruction/i);
			return true;
		},
	);

	assert.throws(
		() => {
			parseSkillManifest(
				{
					...createValidManifest(),
					description: "Guides a user through planning.",
				},
				fixtureManifestPath,
				fixtureRepoRoot,
			);
		},
		(error: unknown) => {
			assert.match(String(error), /user/i);
			return true;
		},
	);

	assert.throws(
		() => {
			parseSkillManifest(
				{
					...createValidManifest(),
					output: "skills/other/SKILL.md",
				},
				fixtureManifestPath,
				fixtureRepoRoot,
			);
		},
		(error: unknown) => {
			assert.match(String(error), /output/);
			assert.match(String(error), /executable-planning/);
			return true;
		},
	);
});
