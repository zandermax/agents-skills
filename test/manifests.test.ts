import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { parseSkillManifest } from "../src/lib/manifests.js";

const fixtureRepoRoot = path.resolve("test/fixtures/manifest/repo");
const fixtureManifestPath = path.join(
	fixtureRepoRoot,
	"sources/executable-planning/skill.json",
);

function createValidManifest(): Record<string, unknown> {
	return {
		name: "executable-planning",
		title: "Executable Planning",
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
				transforms: "transforms.json",
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

test("parseSkillManifest parses a valid closed manifest", () => {
	const parsed = parseSkillManifest(
		createValidManifest(),
		fixtureManifestPath,
		fixtureRepoRoot,
	);

	assert.equal(parsed.name, "executable-planning");
	assert.equal(parsed.title, "Executable Planning");
	assert.equal(parsed.output, ".agents/skills/executable-planning/SKILL.md");
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
					description: "Used for planning.",
				},
				fixtureManifestPath,
				fixtureRepoRoot,
			);
		},
		(error: unknown) => {
			assert.match(String(error), /Use when/);
			return true;
		},
	);

	assert.throws(
		() => {
			parseSkillManifest(
				{
					...createValidManifest(),
					output: ".agents/skills/other/SKILL.md",
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
