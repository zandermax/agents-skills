import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { lstat, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { type Artifact, discoverArtifacts } from "../src/lib/artifacts.js";
import {
	clientsForCollection,
	destinationCountsForClients,
	expectedLinkCount,
	loadRepositoryCatalog,
	requireArtifact,
	requireClientForCollection,
} from "./helpers/repository-artifacts.js";

const testFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testFilePath), "..");
const tsxCliPath = path.join(
	projectRoot,
	"node_modules",
	"tsx",
	"dist",
	"cli.mjs",
);
const installerCliPath = path.join(
	projectRoot,
	"scripts",
	"install-artifacts.ts",
);

async function createFixture(label: string): Promise<{
	homeDirectory: string;
	customSkillsDirectory: string;
	customAgentsDirectory: string;
	cleanup: () => Promise<void>;
}> {
	const root = await mkdtemp(path.join(os.tmpdir(), `${label}-`));
	return {
		homeDirectory: path.join(root, "home"),
		customSkillsDirectory: path.join(root, "custom", "skills"),
		customAgentsDirectory: path.join(root, "custom", "agents"),
		cleanup: () => rm(root, { recursive: true, force: true }),
	};
}

function runCli(
	arguments_: readonly string[],
	homeDirectory: string,
	variableName = "AGENTS_SKILLS_HOME",
) {
	return spawnSync(
		process.execPath,
		[tsxCliPath, installerCliPath, ...arguments_],
		{
			cwd: projectRoot,
			env: { ...process.env, [variableName]: homeDirectory },
			encoding: "utf8",
		},
	);
}

const catalog = await loadRepositoryCatalog();
const repositoryArtifacts = await discoverArtifacts(catalog, projectRoot);
const sampleSkill = requireArtifact(repositoryArtifacts, "skill");
const sampleAgent = requireArtifact(repositoryArtifacts, "agent");
const allClientNames = catalog.clients.map((client) => client.name);

function expectedListingPattern(artifact: Artifact): RegExp {
	const clients = clientsForCollection(catalog, artifact.collection).join(", ");
	const listing = `${artifact.kind} ${artifact.id} [${clients}]`;
	return new RegExp(listing.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

function runNpm(arguments_: readonly string[], homeDirectory: string) {
	return spawnSync("npm", arguments_, {
		cwd: projectRoot,
		env: { ...process.env, EXECUTABLE_PLANNING_HOME: homeDirectory },
		encoding: "utf8",
	});
}

const defaultLinkCount = expectedLinkCount(
	repositoryArtifacts,
	destinationCountsForClients(catalog, allClientNames),
);

test("artifact CLI installs all compatible catalog artifacts by default", async () => {
	const fixture = await createFixture("install-artifacts-cli-default");
	try {
		const result = runCli([], fixture.homeDirectory);
		assert.equal(result.status, 0, result.stderr);
		assert.match(
			result.stdout,
			new RegExp(`summary created=${defaultLinkCount} repaired=0 existing=0`),
		);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI accepts the deprecated test-home variable", async () => {
	const fixture = await createFixture("install-artifacts-cli-deprecated-home");
	try {
		const result = runCli(
			[],
			fixture.homeDirectory,
			"EXECUTABLE_PLANNING_HOME",
		);
		assert.equal(result.status, 0, result.stderr);
		assert.match(
			result.stdout,
			new RegExp(`summary created=${defaultLinkCount} repaired=0 existing=0`),
		);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI installs a selected skill and selected agent", async () => {
	const fixture = await createFixture("install-artifacts-cli-selectors");
	const skillLinkCount = expectedLinkCount(
		[sampleSkill],
		destinationCountsForClients(catalog, allClientNames),
	);
	const agentClient = requireClientForCollection(
		catalog,
		sampleAgent.collection,
	);
	const agentLinkCount = expectedLinkCount(
		[sampleAgent],
		destinationCountsForClients(catalog, [agentClient]),
	);
	try {
		const skill = runCli(["--skill", sampleSkill.id], fixture.homeDirectory);
		assert.equal(skill.status, 0, skill.stderr);
		assert.match(
			skill.stdout,
			new RegExp(`summary created=${skillLinkCount} repaired=0 existing=0`),
		);

		const agent = runCli(
			["--client", agentClient, "--agent", sampleAgent.id],
			fixture.homeDirectory,
		);
		assert.equal(agent.status, 0, agent.stderr);
		assert.match(
			agent.stdout,
			new RegExp(`summary created=${agentLinkCount} repaired=0 existing=0`),
		);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI installs into mixed custom skill and agent targets", async () => {
	const fixture = await createFixture("install-artifacts-cli-custom");
	const customLinkCount = expectedLinkCount(
		repositoryArtifacts,
		new Map([
			["skills", 1],
			[sampleAgent.collection, 1],
		]),
	);
	try {
		const result = runCli(
			[
				"--skills-dir",
				`skills=${fixture.customSkillsDirectory}`,
				"--agents-dir",
				`${sampleAgent.collection}=${fixture.customAgentsDirectory}`,
			],
			fixture.homeDirectory,
		);
		assert.equal(result.status, 0, result.stderr);
		assert.match(
			result.stdout,
			new RegExp(`summary created=${customLinkCount} repaired=0 existing=0`),
		);
		assert.equal(
			(
				await lstat(
					path.join(fixture.customSkillsDirectory, sampleSkill.destinationName),
				)
			).isSymbolicLink(),
			true,
		);
		assert.equal(
			(
				await lstat(
					path.join(fixture.customAgentsDirectory, sampleAgent.destinationName),
				)
			).isSymbolicLink(),
			true,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI lists without writing destinations", async () => {
	const fixture = await createFixture("install-artifacts-cli-list");
	try {
		const result = runCli(["--list"], fixture.homeDirectory);
		assert.equal(result.status, 0, result.stderr);
		for (const artifact of [sampleSkill, sampleAgent]) {
			assert.match(result.stdout, expectedListingPattern(artifact));
		}
		await assert.rejects(lstat(fixture.homeDirectory), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI reports malformed input as an error", async () => {
	const fixture = await createFixture("install-artifacts-cli-malformed");
	try {
		const result = runCli(["--agent"], fixture.homeDirectory);
		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /--agent requires a value/);
	} finally {
		await fixture.cleanup();
	}
});

test("install:clients remains an exact install:artifacts compatibility alias", async () => {
	const fixture = await createFixture("install-artifacts-cli-alias");
	try {
		const artifacts = runNpm(
			["run", "install:artifacts", "--", "--list"],
			fixture.homeDirectory,
		);
		const clients = runNpm(
			["run", "install:clients", "--", "--list"],
			fixture.homeDirectory,
		);
		assert.equal(artifacts.status, 0, artifacts.stderr);
		assert.equal(clients.status, 0, clients.stderr);
		for (const artifact of [sampleSkill, sampleAgent]) {
			assert.match(artifacts.stdout, expectedListingPattern(artifact));
			assert.match(clients.stdout, expectedListingPattern(artifact));
		}
	} finally {
		await fixture.cleanup();
	}
});
