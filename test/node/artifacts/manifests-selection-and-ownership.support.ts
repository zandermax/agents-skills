import {
	assert,
	createValidManifest,
	fixtureManifestPath,
	fixtureRepoRoot,
	parseSkillManifest,
	test,
} from "./manifests.shared.js";

test("parseSkillManifest requires nonempty selections and unique selected headings", () => {
	assert.throws(
		() => {
			parseSkillManifest(
				{
					...createValidManifest(),
					selections: [],
					sectionOwnership: {},
				},
				fixtureManifestPath,
				fixtureRepoRoot,
			);
		},
		(error: unknown) => {
			assert.match(String(error), /selections/);
			assert.match(String(error), /nonempty|at least/i);
			return true;
		},
	);

	assert.throws(
		() => {
			parseSkillManifest(
				{
					...createValidManifest(),
					selections: [
						{
							source: "core.md",
							owner: "core",
							headings: ["Scope"],
						},
						{
							source: "official.md",
							owner: "official",
							headings: ["Scope"],
							transforms: "transforms.json",
						},
					],
					sectionOwnership: { Scope: "core" },
				},
				fixtureManifestPath,
				fixtureRepoRoot,
			);
		},
		(error: unknown) => {
			assert.match(String(error), /Scope/);
			assert.match(String(error), /duplicate/i);
			return true;
		},
	);
});

test("parseSkillManifest validates ownership agreement and official-only transforms", () => {
	assert.throws(
		() => {
			parseSkillManifest(
				{
					...createValidManifest(),
					sectionOwnership: {
						Scope: "official",
						Phases: "core",
						Discovery: "official",
						Usage: "skill",
					},
				},
				fixtureManifestPath,
				fixtureRepoRoot,
			);
		},
		(error: unknown) => {
			assert.match(String(error), /Scope/);
			assert.match(String(error), /owner|ownership/i);
			return true;
		},
	);

	assert.throws(
		() => {
			parseSkillManifest(
				{
					...createValidManifest(),
					selections: [
						{
							source: "core.md",
							owner: "core",
							headings: ["Scope"],
							transforms: "transforms.json",
						},
					],
					sectionOwnership: { Scope: "core" },
				},
				fixtureManifestPath,
				fixtureRepoRoot,
			);
		},
		(error: unknown) => {
			assert.match(String(error), /transforms/);
			assert.match(String(error), /official/i);
			return true;
		},
	);

	assert.throws(
		() => {
			parseSkillManifest(
				{
					...createValidManifest(),
					sectionOwnership: {
						Scope: "core",
						Phases: "core",
						Discovery: "official",
						Usage: "skill",
						Extra: "skill",
					},
				},
				fixtureManifestPath,
				fixtureRepoRoot,
			);
		},
		(error: unknown) => {
			assert.match(String(error), /Extra/);
			assert.match(String(error), /selected|selection/i);
			return true;
		},
	);
});
