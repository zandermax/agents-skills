import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { discoverArtifacts } from "../src/lib/artifacts.js";
import { loadInstallCatalog } from "../src/lib/catalog.js";

const fixtureRepoRoot = path.resolve("test/fixtures/catalog/repo");
const testFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(testFilePath), "..");

test("discoverArtifacts finds structural entries in stable catalog order", async () => {
	const catalog = await loadInstallCatalog(fixtureRepoRoot);
	const artifacts = await discoverArtifacts(catalog, fixtureRepoRoot);

	assert.deepEqual(
		artifacts.map((artifact) => ({
			kind: artifact.kind,
			id: artifact.id,
			name: artifact.name,
			collection: artifact.collection,
			destinationName: artifact.destinationName,
			entryKind: artifact.entryKind,
		})),
		[
			{
				kind: "skill",
				id: "alpha",
				name: "alpha",
				collection: "skills",
				destinationName: "alpha",
				entryKind: "directory",
			},
			{
				kind: "skill",
				id: "example",
				name: "example",
				collection: "skills",
				destinationName: "example",
				entryKind: "directory",
			},
			{
				kind: "skill",
				id: "fixture-skill",
				name: "fixture-skill",
				collection: "skills",
				destinationName: "fixture-skill",
				entryKind: "directory",
			},
			{
				kind: "skill",
				id: "review-skill",
				name: "review-skill",
				collection: "skills",
				destinationName: "review-skill",
				entryKind: "directory",
			},
			{
				kind: "skill",
				id: "zeta",
				name: "zeta",
				collection: "skills",
				destinationName: "zeta",
				entryKind: "directory",
			},
			{
				kind: "agent",
				id: "copilot:example",
				name: "example",
				collection: "copilot",
				destinationName: "example.agent.md",
				entryKind: "file",
			},
			{
				kind: "agent",
				id: "copilot:fixture-planner",
				name: "fixture-planner",
				collection: "copilot",
				destinationName: "fixture-planner.agent.md",
				entryKind: "file",
			},
			{
				kind: "agent",
				id: "copilot:fixture",
				name: "fixture",
				collection: "copilot",
				destinationName: "fixture.agent.md",
				entryKind: "file",
			},
			{
				kind: "agent",
				id: "custom-directory:fixture-reviewer",
				name: "fixture-reviewer",
				collection: "custom-directory",
				destinationName: "fixture-reviewer",
				entryKind: "directory",
			},
		],
	);
});

test("discoverArtifacts returns unique immutable artifacts confined to collection roots", async () => {
	const catalog = await loadInstallCatalog(fixtureRepoRoot);
	const artifacts = await discoverArtifacts(catalog, fixtureRepoRoot);
	const ids = artifacts.map((artifact) => artifact.id);

	assert.equal(new Set(ids).size, ids.length);
	assert.ok(Object.isFrozen(artifacts));
	for (const artifact of artifacts) {
		assert.ok(Object.isFrozen(artifact));
		const collection = catalog.collections.find(
			(candidate) => candidate.name === artifact.collection,
		);
		assert.ok(collection);
		const collectionRoot = path.resolve(fixtureRepoRoot, collection.source);
		const relativePath = path.relative(collectionRoot, artifact.sourcePath);
		assert.equal(relativePath.startsWith(".."), false);
		assert.equal(path.isAbsolute(relativePath), false);
	}
});

test("discoverArtifacts finds the real planning skill, its companion, and the Copilot agent", async () => {
	const catalog = await loadInstallCatalog(repoRoot);
	const artifacts = await discoverArtifacts(catalog, repoRoot);

	assert.deepEqual(
		artifacts.map((artifact) => artifact.id),
		["executable-planning", "plan-it-out", "copilot:executable-planner"],
	);
});
