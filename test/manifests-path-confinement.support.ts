import {
	assert,
	createValidManifest,
	fixtureManifestPath,
	fixtureRepoRoot,
	parseSkillManifest,
	test,
} from "./manifests.shared.js";

test("parseSkillManifest enforces source and transform path existence and repository confinement", () => {
	assert.throws(
		() => {
			parseSkillManifest(
				{
					...createValidManifest(),
					selections: [
						{
							source: "/tmp/outside.md",
							owner: "core",
							headings: ["Scope"],
						},
					],
					sectionOwnership: { Scope: "core" },
				},
				fixtureManifestPath,
				fixtureRepoRoot,
			);
		},
		(error: unknown) => {
			assert.match(String(error), /source/);
			assert.match(String(error), /inside/i);
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
							source: "missing.md",
							owner: "core",
							headings: ["Scope"],
						},
					],
					sectionOwnership: { Scope: "core" },
				},
				fixtureManifestPath,
				fixtureRepoRoot,
			);
		},
		(error: unknown) => {
			assert.match(String(error), /missing\.md/);
			assert.match(String(error), /exist|missing/i);
			return true;
		},
	);

	assert.throws(
		() => {
			const invalid = createValidManifest();
			const selections = (
				invalid.selections as Array<Record<string, unknown>>
			).map((selection) => ({ ...selection }));
			selections[1] = {
				...selections[1],
				transforms: "/tmp/transforms.json",
			};
			invalid.selections = selections;
			parseSkillManifest(invalid, fixtureManifestPath, fixtureRepoRoot);
		},
		(error: unknown) => {
			assert.match(String(error), /transforms/);
			assert.match(String(error), /inside/i);
			return true;
		},
	);
});
