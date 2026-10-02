import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	lstat,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
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
	operation: "install" | "uninstall" = "install",
) {
	return spawnSync(
		process.execPath,
		[
			tsxCliPath,
			operation === "install"
				? installerCliPath
				: path.join(projectRoot, "scripts", "uninstall-artifacts.ts"),
			...arguments_,
		],
		{
			cwd: projectRoot,
			env: {
				...process.env,
				[variableName]: homeDirectory,
				MEMORY_DIR: path.join(homeDirectory, ".memory"),
			},
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
	catalog,
);

test("artifact CLI installs all compatible catalog artifacts by default", async () => {
	const fixture = await createFixture("install-artifacts-cli-default");
	try {
		const result = runCli([], fixture.homeDirectory);
		assert.equal(result.status, 0, result.stderr);
		assert.match(
			result.stdout,
			new RegExp(
				`summary created=${defaultLinkCount} repaired=0 removed=0 existing=0`,
			),
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
			new RegExp(
				`summary created=${defaultLinkCount} repaired=0 removed=0 existing=0`,
			),
		);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI preserves active registrations when a shared registry aliases a legacy directory", async () => {
	const fixture = await createFixture("install-artifacts-cli-alias");
	try {
		const genericSkills = path.join(fixture.homeDirectory, ".agents/skills");
		const sharedSkills = path.join(fixture.homeDirectory, ".claude/skills");
		await mkdir(genericSkills, { recursive: true });
		await mkdir(path.dirname(sharedSkills), { recursive: true });
		await symlink(genericSkills, sharedSkills, "dir");
		const result = runCli([], fixture.homeDirectory);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(
			(
				await lstat(path.join(sharedSkills, sampleSkill.destinationName))
			).isSymbolicLink(),
			true,
		);
		assert.equal(runCli([], fixture.homeDirectory).status, 0);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI refuses scoped migration of a whole discovery directory", async () => {
	const fixture = await createFixture("install-artifacts-cli-scoped-migration");
	try {
		const sharedSkills = path.join(fixture.homeDirectory, ".claude/skills");
		await mkdir(path.dirname(sharedSkills), { recursive: true });
		await symlink(
			path.join(projectRoot, ".agents/skills"),
			sharedSkills,
			"dir",
		);
		const result = runCli(["--skill", sampleSkill.name], fixture.homeDirectory);
		assert.equal(result.status, 1);
		assert.match(
			result.stderr,
			/Destination parent resolves inside an artifact source/,
		);
		assert.equal((await lstat(sharedSkills)).isSymbolicLink(), true);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI migrates owned legacy directories and uninstalls without deleting memory", async () => {
	const fixture = await createFixture("install-artifacts-cli-migration");
	try {
		const memory = path.join(fixture.homeDirectory, ".memory", "fixture-notes");
		await mkdir(path.join(memory, "test"), { recursive: true });
		await writeFile(
			path.join(memory, "SKILL.md"),
			"---\nname: fixture-notes\ndescription: Personal testing preferences.\n---\n\n## Preferences\n\n- Preserve memory.\n",
		);
		await writeFile(path.join(memory, "test", "fixture-notes.test.ts"), "");
		for (const directory of [".claude/skills", ".copilot/skills"]) {
			const destination = path.join(fixture.homeDirectory, directory);
			await mkdir(path.dirname(destination), { recursive: true });
			await symlink(
				path.join(projectRoot, ".agents/skills"),
				destination,
				"dir",
			);
		}
		const oldAgents = path.join(fixture.homeDirectory, ".copilot/agents");
		await symlink(path.join(projectRoot, ".github/agents"), oldAgents, "dir");
		const genericSkills = path.join(fixture.homeDirectory, ".agents/skills");
		await mkdir(genericSkills, { recursive: true });
		await symlink(
			sampleSkill.sourcePath,
			path.join(genericSkills, sampleSkill.destinationName),
			"dir",
		);
		await symlink(memory, path.join(genericSkills, "fixture-notes"), "dir");
		const installed = runCli(
			[
				"--skills-dir",
				`claude=${path.join(fixture.homeDirectory, ".claude/skills")}`,
				"--agents-dir",
				`copilot=${path.join(fixture.homeDirectory, ".claude/agents")}`,
			],
			fixture.homeDirectory,
		);
		assert.equal(installed.status, 0, installed.stderr);
		const sharedSkills = path.join(fixture.homeDirectory, ".claude/skills");
		assert.equal((await lstat(sharedSkills)).isSymbolicLink(), false);
		assert.equal(
			(await lstat(path.join(sharedSkills, "fixture-notes"))).isSymbolicLink(),
			true,
		);
		await assert.rejects(lstat(oldAgents), /ENOENT/);
		await assert.rejects(
			lstat(path.join(genericSkills, "fixture-notes")),
			/ENOENT/,
		);
		await assert.rejects(
			lstat(path.join(genericSkills, sampleSkill.destinationName)),
			/ENOENT/,
		);
		await writeFile(path.join(sharedSkills, "unrelated.md"), "keep");
		await symlink(memory, path.join(sharedSkills, "unrelated"), "dir");
		assert.equal(runCli([], fixture.homeDirectory).status, 0);
		const uninstalled = runCli(
			[],
			fixture.homeDirectory,
			"AGENTS_SKILLS_HOME",
			"uninstall",
		);
		assert.equal(uninstalled.status, 0, uninstalled.stderr);
		await assert.rejects(
			lstat(path.join(sharedSkills, "fixture-notes")),
			/ENOENT/,
		);
		assert.match(
			await readFile(path.join(memory, "SKILL.md"), "utf8"),
			/Preserve memory/,
		);
		assert.equal(
			await readFile(path.join(sharedSkills, "unrelated.md"), "utf8"),
			"keep",
		);
		assert.equal(
			(await lstat(path.join(sharedSkills, "unrelated"))).isSymbolicLink(),
			true,
		);
		assert.equal((await lstat(sampleSkill.sourcePath)).isDirectory(), true);
		const repeated = runCli(
			[],
			fixture.homeDirectory,
			"AGENTS_SKILLS_HOME",
			"uninstall",
		);
		assert.equal(repeated.status, 0, repeated.stderr);
		assert.match(repeated.stdout, /removed=0/);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI installs a selected skill and selected agent", async () => {
	const fixture = await createFixture("install-artifacts-cli-selectors");
	const skillLinkCount = expectedLinkCount(
		[sampleSkill],
		destinationCountsForClients(catalog, allClientNames),
		catalog,
	);
	const agentClient = requireClientForCollection(
		catalog,
		sampleAgent.collection,
	);
	const agentLinkCount = expectedLinkCount(
		[sampleAgent],
		destinationCountsForClients(catalog, [agentClient]),
		catalog,
	);
	try {
		const skill = runCli(["--skill", sampleSkill.id], fixture.homeDirectory);
		assert.equal(skill.status, 0, skill.stderr);
		assert.match(
			skill.stdout,
			new RegExp(
				`summary created=${skillLinkCount} repaired=0 removed=0 existing=0`,
			),
		);

		const agent = runCli(
			["--client", agentClient, "--agent", sampleAgent.id],
			fixture.homeDirectory,
		);
		assert.equal(agent.status, 0, agent.stderr);
		assert.match(
			agent.stdout,
			new RegExp(
				`summary created=${agentLinkCount} repaired=0 removed=0 existing=0`,
			),
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
		catalog,
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
			new RegExp(
				`summary created=${customLinkCount} repaired=0 removed=0 existing=0`,
			),
		);
		assert.equal(
			(await lstat(fixture.customSkillsDirectory)).isSymbolicLink(),
			false,
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
			(await lstat(fixture.customAgentsDirectory)).isSymbolicLink(),
			false,
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
