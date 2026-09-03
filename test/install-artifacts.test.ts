import assert from "node:assert/strict";
import {
	lstat,
	mkdir,
	mkdtemp,
	readlink,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { ArtifactRequest } from "../src/lib/artifact-selection.js";
import {
	buildArtifactLinks,
	installArtifacts,
	type ResolvedLink,
} from "../src/lib/install-artifacts.js";

async function createFixture(label: string): Promise<{
	root: string;
	sources: { skill: string; agent: string };
	cleanup: () => Promise<void>;
}> {
	const root = await mkdtemp(path.join(os.tmpdir(), `${label}-`));
	const skill = path.join(root, "sources", "planning");
	const agent = path.join(root, "sources", "planner.agent.md");
	await mkdir(skill, { recursive: true });
	await writeFile(path.join(skill, "SKILL.md"), "# Planning\n", "utf8");
	await writeFile(agent, "# Planner\n", "utf8");
	return {
		root,
		sources: { skill, agent },
		cleanup: () => rm(root, { recursive: true, force: true }),
	};
}

async function assertLinkPointsTo(
	destination: string,
	source: string,
): Promise<void> {
	assert.equal((await lstat(destination)).isSymbolicLink(), true);
	const target = await readlink(destination);
	assert.equal(path.resolve(path.dirname(destination), target), source);
}

function request(
	root: string,
	sources: { skill: string; agent: string },
): ArtifactRequest {
	return {
		listOnly: false,
		artifacts: [
			{
				kind: "skill",
				id: "planning",
				name: "planning",
				collection: "skills",
				sourcePath: sources.skill,
				destinationName: "planning",
				entryKind: "directory",
			},
			{
				kind: "agent",
				id: "copilot:planner",
				name: "planner",
				collection: "copilot",
				sourcePath: sources.agent,
				destinationName: "planner.agent.md",
				entryKind: "file",
			},
		],
		targets: [
			{ collection: "skills", directory: path.join(root, "skills") },
			{ collection: "copilot", directory: path.join(root, "agents") },
		],
	};
}

test("buildArtifactLinks maps artifacts only to targets in their collection", async () => {
	const fixture = await createFixture("build-artifact-links");
	try {
		assert.deepEqual(
			buildArtifactLinks(request(fixture.root, fixture.sources)),
			[
				{
					kind: "directory",
					sourcePath: fixture.sources.skill,
					destinationPath: path.join(fixture.root, "skills", "planning"),
				},
				{
					kind: "file",
					sourcePath: fixture.sources.agent,
					destinationPath: path.join(
						fixture.root,
						"agents",
						"planner.agent.md",
					),
				},
			],
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installArtifacts creates file and directory links and is idempotent", async () => {
	const fixture = await createFixture("install-artifacts-create");
	try {
		const links = buildArtifactLinks(request(fixture.root, fixture.sources));
		const first = await installArtifacts(links);
		assert.deepEqual(
			first.created,
			links.map((link) => link.destinationPath),
		);
		assert.deepEqual(first.existing, []);
		const [skillLink, agentLink] = links;
		if (skillLink === undefined || agentLink === undefined) {
			assert.fail("expected skill and agent links");
		}
		await assertLinkPointsTo(skillLink.destinationPath, fixture.sources.skill);
		await assertLinkPointsTo(agentLink.destinationPath, fixture.sources.agent);

		const second = await installArtifacts(links);
		assert.deepEqual(second.created, []);
		assert.deepEqual(
			second.existing,
			links.map((link) => link.destinationPath),
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installArtifacts deduplicates equivalent links and rejects conflicting destinations", async () => {
	const fixture = await createFixture("install-artifacts-deduplicate");
	try {
		const destination = path.join(fixture.root, "dest", "planning");
		const duplicate: ResolvedLink = {
			kind: "directory",
			sourcePath: fixture.sources.skill,
			destinationPath: path.join(fixture.root, "dest", ".", "planning"),
		};
		const result = await installArtifacts([
			{
				kind: "directory",
				sourcePath: fixture.sources.skill,
				destinationPath: destination,
			},
			duplicate,
		]);
		assert.deepEqual(result.created, [destination]);

		await assert.rejects(
			installArtifacts([
				{
					kind: "directory",
					sourcePath: fixture.sources.skill,
					destinationPath: path.join(fixture.root, "conflict"),
				},
				{
					kind: "file",
					sourcePath: fixture.sources.agent,
					destinationPath: path.join(fixture.root, "conflict"),
				},
			]),
			/Conflicting destination mappings/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installArtifacts rejects regular, unrelated, and broken destination links without writes", async () => {
	const fixture = await createFixture("install-artifacts-collisions");
	try {
		const regular = path.join(fixture.root, "dest", "regular");
		const unrelated = path.join(fixture.root, "dest", "unrelated");
		const broken = path.join(fixture.root, "dest", "broken");
		const untouched = path.join(fixture.root, "dest", "untouched");
		await mkdir(path.dirname(regular), { recursive: true });
		await writeFile(regular, "collision", "utf8");
		await symlink(fixture.root, unrelated, "dir");
		await symlink("missing", broken, "dir");

		await assert.rejects(
			installArtifacts([
				{
					kind: "directory",
					sourcePath: fixture.sources.skill,
					destinationPath: regular,
				},
				{
					kind: "directory",
					sourcePath: fixture.sources.skill,
					destinationPath: unrelated,
				},
				{
					kind: "directory",
					sourcePath: fixture.sources.skill,
					destinationPath: broken,
				},
				{
					kind: "directory",
					sourcePath: fixture.sources.skill,
					destinationPath: untouched,
				},
			]),
			(error: unknown) => {
				const message = String(error);
				assert.match(message, /not a symlink/);
				assert.match(message, /points elsewhere/);
				assert.match(message, /is broken/);
				return true;
			},
		);
		await assert.rejects(lstat(untouched), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});

test("installArtifacts accepts a canonical alias and validates source types before writing", async () => {
	const fixture = await createFixture("install-artifacts-validation");
	try {
		const alias = path.join(fixture.root, "alias");
		const aliasedDestination = path.join(fixture.root, "dest", "planning");
		await mkdir(path.dirname(aliasedDestination), { recursive: true });
		await symlink(path.dirname(fixture.sources.skill), alias, "dir");
		await symlink(path.join(alias, "planning"), aliasedDestination, "dir");

		const existing = await installArtifacts([
			{
				kind: "directory",
				sourcePath: fixture.sources.skill,
				destinationPath: aliasedDestination,
			},
		]);
		assert.deepEqual(existing.existing, [aliasedDestination]);

		const untouched = path.join(fixture.root, "new", "untouched");
		await assert.rejects(
			installArtifacts([
				{
					kind: "file",
					sourcePath: fixture.sources.skill,
					destinationPath: path.join(fixture.root, "wrong-kind"),
				},
				{
					kind: "directory",
					sourcePath: path.join(fixture.root, "missing"),
					destinationPath: untouched,
				},
			]),
			/Source is not a file[\s\S]*Source is missing/,
		);
		await assert.rejects(lstat(untouched), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});
