import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	lstat,
	mkdir,
	mkdtemp,
	readFile,
	readlink,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	type ClientName,
	installClients,
	parseClientArguments,
	parseInstallArguments,
} from "../scripts/install-clients.js";
import { discoverArtifacts } from "../src/lib/artifacts.js";
import { loadInstallCatalog } from "../src/lib/catalog.js";

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
	"install-clients.ts",
);

const AGENT_SOURCE = ".github/agents/executable-planner.agent.md";
const SKILL_SOURCE = ".agents/skills/executable-planning";

const EXPECTED_BUILTIN_LINKS: readonly {
	readonly source: string;
	readonly destination: string;
}[] = [
		{
			source: AGENT_SOURCE,
			destination: "~/.copilot/agents/executable-planner.agent.md",
		},
		{
			source: SKILL_SOURCE,
			destination: "~/.copilot/skills/executable-planning",
		},
		{ source: SKILL_SOURCE, destination: "~/.claude/skills/executable-planning" },
		{ source: SKILL_SOURCE, destination: "~/.agents/skills/executable-planning" },
	];

// Derive expected real-repo link counts from the actual catalog and artifacts,
// so adding or removing a skill, client, or destination can't silently
// desync these counts from what installClients would really produce.
const REAL_CATALOG = await loadInstallCatalog(projectRoot);
const REAL_ARTIFACTS = await discoverArtifacts(REAL_CATALOG, projectRoot);
const REAL_SKILL_COUNT = REAL_ARTIFACTS.filter(
	(artifact) => artifact.kind === "skill",
).length;

function countClientDestinations(artifactKind: "agent" | "skill"): number {
	const collectionNames = new Set(
		REAL_CATALOG.collections
			.filter((collection) => collection.artifactKind === artifactKind)
			.map((collection) => collection.name),
	);
	let count = 0;
	for (const client of REAL_CATALOG.clients) {
		for (const destination of client.destinations) {
			if (collectionNames.has(destination.collection)) {
				count += 1;
			}
		}
	}
	return count;
}

const REAL_ALL_CLIENTS_LINK_COUNT =
	REAL_SKILL_COUNT * countClientDestinations("skill") +
	countClientDestinations("agent");

async function createInstallFixture(label: string): Promise<{
	repoRoot: string;
	homeDirectory: string;
	cleanup: () => Promise<void>;
}> {
	const root = await mkdtemp(path.join(os.tmpdir(), `${label}-`));
	const repoRoot = path.join(root, "repo with spaces");
	const homeDirectory = path.join(root, "home with spaces");

	await mkdir(path.join(repoRoot, path.dirname(AGENT_SOURCE)), {
		recursive: true,
	});
	await mkdir(path.join(repoRoot, SKILL_SOURCE), { recursive: true });
	await writeFile(path.join(repoRoot, AGENT_SOURCE), "# agent\n", "utf8");
	await writeFile(
		path.join(repoRoot, SKILL_SOURCE, "SKILL.md"),
		"# skill\n",
		"utf8",
	);
	const catalogSource = await readFile(
		path.join(projectRoot, "install-catalog.json"),
		"utf8",
	);
	await writeFile(
		path.join(repoRoot, "install-catalog.json"),
		catalogSource,
		"utf8",
	);

	await mkdir(homeDirectory, { recursive: true });

	return {
		repoRoot,
		homeDirectory,
		cleanup: async () => rm(root, { recursive: true, force: true }),
	};
}

function destinationFor(homeDirectory: string, destination: string): string {
	assert.ok(destination.startsWith("~/"));
	return path.resolve(homeDirectory, destination.slice(2));
}

async function assertLinkPointsTo(
	destinationPath: string,
	expectedSourcePath: string,
): Promise<void> {
	const stats = await lstat(destinationPath);
	assert.equal(stats.isSymbolicLink(), true);
	const target = await readlink(destinationPath);
	const absoluteTarget = path.resolve(path.dirname(destinationPath), target);
	assert.equal(
		path.normalize(absoluteTarget),
		path.normalize(expectedSourcePath),
	);
}

test("parseClientArguments defaults to all clients in canonical order", () => {
	assert.deepEqual(parseClientArguments([]), ["copilot", "claude", "agents"]);
});

test("parseClientArguments accepts each single client", () => {
	for (const client of [
		"copilot",
		"claude",
		"agents",
	] satisfies readonly ClientName[]) {
		assert.deepEqual(parseClientArguments(["--client", client]), [client]);
	}
});

test("parseClientArguments accepts all explicitly", () => {
	assert.deepEqual(parseClientArguments(["--client", "all"]), [
		"copilot",
		"claude",
		"agents",
	]);
});

test("parseClientArguments deduplicates while preserving canonical order", () => {
	assert.deepEqual(
		parseClientArguments([
			"--client",
			"agents",
			"--client",
			"copilot",
			"--client",
			"agents",
			"--client",
			"claude",
		]),
		["copilot", "claude", "agents"],
	);
});

test("parseClientArguments rejects unknown clients", () => {
	assert.throws(
		() => parseClientArguments(["--client", "unknown"]),
		/Usage: npm run install:clients -- \[--client all\|copilot\|claude\|agents\]/,
	);
});

test("parseClientArguments rejects missing client value", () => {
	assert.throws(
		() => parseClientArguments(["--client"]),
		/Usage: npm run install:clients -- \[--client all\|copilot\|claude\|agents\]/,
	);
});

test("parseClientArguments rejects unsupported arguments", () => {
	assert.throws(
		() => parseClientArguments(["--unknown"]),
		/Usage: npm run install:clients -- \[--client all\|copilot\|claude\|agents\]/,
	);
});

test("parseInstallArguments preserves the no-argument client default", () => {
	assert.deepEqual(parseInstallArguments([]), {
		clients: ["copilot", "claude", "agents"],
		skillDirectories: [],
	});
});

test("parseInstallArguments selects only custom roots without a client flag", () => {
	assert.deepEqual(
		parseInstallArguments([
			"--skills-dir",
			"first skills",
			"--skills-dir",
			"second-skills",
		]),
		{
			clients: [],
			skillDirectories: ["first skills", "second-skills"],
		},
	);
});

test("parseInstallArguments combines client and custom root selections", () => {
	assert.deepEqual(
		parseInstallArguments([
			"--skills-dir",
			"harness-skills",
			"--client",
			"copilot",
		]),
		{
			clients: ["copilot"],
			skillDirectories: ["harness-skills"],
		},
	);
});

test("parseInstallArguments rejects a missing custom root", () => {
	assert.throws(
		() => parseInstallArguments(["--skills-dir"]),
		/Usage: npm run install:clients/,
	);
});

test("installClients creates all missing parent directories and links", async () => {
	const fixture = await createInstallFixture("install-clients-create");

	try {
		const result = await installClients({
			clients: ["copilot", "claude", "agents"],
			repoRoot: fixture.repoRoot,
			homeDirectory: fixture.homeDirectory,
		});

		assert.equal(result.created.length, EXPECTED_BUILTIN_LINKS.length);
		assert.equal(result.existing.length, 0);

		for (const link of EXPECTED_BUILTIN_LINKS) {
			const destinationPath = destinationFor(
				fixture.homeDirectory,
				link.destination,
			);
			const expectedSource = path.resolve(fixture.repoRoot, link.source);
			await assertLinkPointsTo(destinationPath, expectedSource);
		}
	} finally {
		await fixture.cleanup();
	}
});

test("installClients ignores custom source directories without a SKILL.md", async () => {
	const fixture = await createInstallFixture("install-clients-valid-skills");

	try {
		await mkdir(
			path.join(fixture.repoRoot, ".agents", "skills", "not-a-skill"),
			{ recursive: true },
		);
		const customSkillsRoot = path.join(fixture.homeDirectory, "harness-skills");

		const result = await installClients({
			clients: [],
			skillDirectories: [customSkillsRoot],
			repoRoot: fixture.repoRoot,
			homeDirectory: fixture.homeDirectory,
		});

		assert.deepEqual(result.created, [
			path.join(customSkillsRoot, "executable-planning"),
		]);
		await assert.rejects(
			lstat(path.join(customSkillsRoot, "not-a-skill")),
			/ENOENT/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients links every valid skill into each custom root", async () => {
	const fixture = await createInstallFixture("install-clients-multiple-roots");

	try {
		const secondSkill = path.join(
			fixture.repoRoot,
			".agents",
			"skills",
			"release-notes",
		);
		await mkdir(secondSkill, { recursive: true });
		await writeFile(path.join(secondSkill, "SKILL.md"), "# release notes\n");

		const firstRoot = path.join(fixture.homeDirectory, "first-harness");
		const secondRoot = path.join(fixture.homeDirectory, "second-harness");
		const result = await installClients({
			clients: [],
			skillDirectories: [firstRoot, secondRoot],
			repoRoot: fixture.repoRoot,
			homeDirectory: fixture.homeDirectory,
		});

		assert.deepEqual(result.created, [
			path.join(firstRoot, "executable-planning"),
			path.join(firstRoot, "release-notes"),
			path.join(secondRoot, "executable-planning"),
			path.join(secondRoot, "release-notes"),
		]);
		await assertLinkPointsTo(
			path.join(firstRoot, "release-notes"),
			secondSkill,
		);
		await assertLinkPointsTo(
			path.join(secondRoot, "executable-planning"),
			path.join(fixture.repoRoot, SKILL_SOURCE),
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients rejects a custom install when no built skills exist", async () => {
	const fixture = await createInstallFixture("install-clients-no-skills");

	try {
		await rm(path.join(fixture.repoRoot, SKILL_SOURCE), {
			recursive: true,
			force: true,
		});
		const customSkillsRoot = path.join(fixture.homeDirectory, "harness-skills");

		await assert.rejects(
			installClients({
				clients: [],
				skillDirectories: [customSkillsRoot],
				repoRoot: fixture.repoRoot,
				homeDirectory: fixture.homeDirectory,
			}),
			/No built skills found:/,
		);
		await assert.rejects(lstat(customSkillsRoot), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients reports no built skills when the source root is missing", async () => {
	const fixture = await createInstallFixture("install-clients-missing-skills");

	try {
		await rm(path.join(fixture.repoRoot, ".agents", "skills"), {
			recursive: true,
			force: true,
		});

		await assert.rejects(
			installClients({
				clients: [],
				skillDirectories: [path.join(fixture.homeDirectory, "harness-skills")],
				repoRoot: fixture.repoRoot,
				homeDirectory: fixture.homeDirectory,
			}),
			/No built skills found:/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients deduplicates equivalent built-in and custom destinations", async () => {
	const fixture = await createInstallFixture("install-clients-deduplicate");

	try {
		const sharedSkillsRoot = path.join(
			fixture.homeDirectory,
			".agents",
			"skills",
		);
		const result = await installClients({
			clients: ["agents"],
			skillDirectories: [sharedSkillsRoot],
			repoRoot: fixture.repoRoot,
			homeDirectory: fixture.homeDirectory,
		});

		assert.deepEqual(result.created, [
			path.join(sharedSkillsRoot, "executable-planning"),
		]);
		assert.deepEqual(result.existing, []);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients is idempotent on second identical run", async () => {
	const fixture = await createInstallFixture("install-clients-idempotent");

	try {
		const first = await installClients({
			clients: ["copilot", "claude", "agents"],
			repoRoot: fixture.repoRoot,
			homeDirectory: fixture.homeDirectory,
		});
		assert.equal(first.created.length, EXPECTED_BUILTIN_LINKS.length);

		const second = await installClients({
			clients: ["copilot", "claude", "agents"],
			repoRoot: fixture.repoRoot,
			homeDirectory: fixture.homeDirectory,
		});

		assert.equal(second.created.length, 0);
		assert.equal(second.existing.length, EXPECTED_BUILTIN_LINKS.length);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients rejects regular-file destination", async () => {
	const fixture = await createInstallFixture("install-clients-file-collision");

	try {
		const destinationPath = destinationFor(
			fixture.homeDirectory,
			"~/.copilot/agents/executable-planner.agent.md",
		);
		await mkdir(path.dirname(destinationPath), { recursive: true });
		await writeFile(destinationPath, "not a symlink\n", "utf8");

		await assert.rejects(
			installClients({
				clients: ["copilot"],
				repoRoot: fixture.repoRoot,
				homeDirectory: fixture.homeDirectory,
			}),
			/Destination exists and is not a symlink/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients rejects directory destination", async () => {
	const fixture = await createInstallFixture("install-clients-dir-collision");

	try {
		const destinationPath = destinationFor(
			fixture.homeDirectory,
			"~/.claude/skills/executable-planning",
		);
		await mkdir(destinationPath, { recursive: true });

		await assert.rejects(
			installClients({
				clients: ["claude"],
				repoRoot: fixture.repoRoot,
				homeDirectory: fixture.homeDirectory,
			}),
			/Destination exists and is not a symlink/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients rejects unrelated relative symlink destination", async () => {
	const fixture = await createInstallFixture(
		"install-clients-relative-symlink",
	);

	try {
		const destinationPath = destinationFor(
			fixture.homeDirectory,
			"~/.agents/skills/executable-planning",
		);
		await mkdir(path.dirname(destinationPath), { recursive: true });
		await mkdir(path.resolve(path.dirname(destinationPath), "../other-skill"), {
			recursive: true,
		});
		await symlink("../other-skill", destinationPath, "dir");

		await assert.rejects(
			installClients({
				clients: ["agents"],
				repoRoot: fixture.repoRoot,
				homeDirectory: fixture.homeDirectory,
			}),
			/Destination symlink points elsewhere/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients rejects unrelated absolute symlink destination", async () => {
	const fixture = await createInstallFixture(
		"install-clients-absolute-symlink",
	);

	try {
		const destinationPath = destinationFor(
			fixture.homeDirectory,
			"~/.copilot/skills/executable-planning",
		);
		await mkdir(path.dirname(destinationPath), { recursive: true });
		const unrelatedPath = path.join(fixture.repoRoot, "unrelated");
		await mkdir(unrelatedPath, { recursive: true });
		await symlink(unrelatedPath, destinationPath, "dir");

		await assert.rejects(
			installClients({
				clients: ["copilot"],
				repoRoot: fixture.repoRoot,
				homeDirectory: fixture.homeDirectory,
			}),
			/Destination symlink points elsewhere/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients accepts an existing destination symlink that resolves to the exact source via a symlinked ancestor", async () => {
	const fixture = await createInstallFixture("install-clients-canonical-alias");

	try {
		const destinationPath = destinationFor(
			fixture.homeDirectory,
			"~/.agents/skills/executable-planning",
		);
		await mkdir(path.dirname(destinationPath), { recursive: true });

		const aliasRoot = path.join(path.dirname(fixture.repoRoot), "repo-alias");
		await symlink(fixture.repoRoot, aliasRoot, "dir");

		const aliasTarget = path.join(aliasRoot, SKILL_SOURCE);
		await symlink(aliasTarget, destinationPath, "dir");

		const result = await installClients({
			clients: ["agents"],
			repoRoot: fixture.repoRoot,
			homeDirectory: fixture.homeDirectory,
		});

		assert.equal(result.created.length, 0);
		assert.deepEqual(result.existing, [destinationPath]);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients rejects an existing broken destination symlink and performs no writes", async () => {
	const fixture = await createInstallFixture("install-clients-broken-symlink");

	try {
		const brokenDestination = destinationFor(
			fixture.homeDirectory,
			"~/.claude/skills/executable-planning",
		);
		await mkdir(path.dirname(brokenDestination), { recursive: true });
		await symlink("../missing-target", brokenDestination, "dir");

		const untouchedDestination = destinationFor(
			fixture.homeDirectory,
			"~/.copilot/agents/executable-planner.agent.md",
		);

		await assert.rejects(
			installClients({
				clients: ["copilot", "claude"],
				repoRoot: fixture.repoRoot,
				homeDirectory: fixture.homeDirectory,
			}),
			/Destination symlink is broken:/,
		);

		await assert.rejects(lstat(untouchedDestination), /ENOENT/);
		await assert.rejects(lstat(path.dirname(untouchedDestination)), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients aggregates multiple destination conflicts before writing any link", async () => {
	const fixture = await createInstallFixture("install-clients-aggregate");

	try {
		const copilotDestination = destinationFor(
			fixture.homeDirectory,
			"~/.copilot/agents/executable-planner.agent.md",
		);
		await mkdir(path.dirname(copilotDestination), { recursive: true });
		await writeFile(copilotDestination, "not a symlink\n", "utf8");

		const claudeDestination = destinationFor(
			fixture.homeDirectory,
			"~/.claude/skills/executable-planning",
		);
		await mkdir(claudeDestination, { recursive: true });

		await assert.rejects(
			installClients({
				clients: ["copilot", "claude"],
				repoRoot: fixture.repoRoot,
				homeDirectory: fixture.homeDirectory,
			}),
			(error: unknown) => {
				const message = String(error);
				assert.ok(message.includes(copilotDestination));
				assert.ok(message.includes(claudeDestination));
				const occurrences =
					message.split("Destination exists and is not a symlink:").length - 1;
				assert.equal(occurrences, 2);
				return true;
			},
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installClients validates all destinations before writing any parent directory or link", async () => {
	const fixture = await createInstallFixture("install-clients-partial-batch");

	try {
		const conflictingDestination = destinationFor(
			fixture.homeDirectory,
			"~/.claude/skills/executable-planning",
		);
		await mkdir(path.dirname(conflictingDestination), { recursive: true });
		await writeFile(conflictingDestination, "collision\n", "utf8");

		const copilotDestination = destinationFor(
			fixture.homeDirectory,
			"~/.copilot/agents/executable-planner.agent.md",
		);

		await assert.rejects(
			installClients({
				clients: ["copilot", "claude"],
				repoRoot: fixture.repoRoot,
				homeDirectory: fixture.homeDirectory,
			}),
			/Destination exists and is not a symlink:/,
		);

		await assert.rejects(lstat(copilotDestination), /ENOENT/);
		await assert.rejects(lstat(path.dirname(copilotDestination)), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});

test("CLI supports injected temporary home and reports existing links on rerun", async () => {
	const fixture = await createInstallFixture("install-clients-cli");

	try {
		const first = spawnSync(
			process.execPath,
			[tsxCliPath, installerCliPath, "--client", "all"],
			{
				cwd: projectRoot,
				env: {
					...process.env,
					EXECUTABLE_PLANNING_HOME: fixture.homeDirectory,
				},
				encoding: "utf8",
			},
		);

		assert.equal(first.status, 0, first.stderr);
		assert.match(
			first.stdout,
			new RegExp(`summary created=${REAL_ALL_CLIENTS_LINK_COUNT} existing=0`),
		);

		for (const link of EXPECTED_BUILTIN_LINKS) {
			const destinationPath = destinationFor(
				fixture.homeDirectory,
				link.destination,
			);
			const expectedSource = path.resolve(projectRoot, link.source);
			await assertLinkPointsTo(destinationPath, expectedSource);
		}

		const second = spawnSync(
			process.execPath,
			[tsxCliPath, installerCliPath, "--client", "all"],
			{
				cwd: projectRoot,
				env: {
					...process.env,
					EXECUTABLE_PLANNING_HOME: fixture.homeDirectory,
				},
				encoding: "utf8",
			},
		);

		assert.equal(second.status, 0, second.stderr);
		assert.match(
			second.stdout,
			new RegExp(`summary created=0 existing=${REAL_ALL_CLIENTS_LINK_COUNT}`),
		);
	} finally {
		await fixture.cleanup();
	}
});

test("CLI installs skills into a custom root without installing built-in clients", async () => {
	const fixture = await createInstallFixture("install-clients-custom-root");

	try {
		const customSkillsRoot = path.join(
			fixture.homeDirectory,
			"custom harness",
			"skills",
		);
		const result = spawnSync(
			process.execPath,
			[tsxCliPath, installerCliPath, "--skills-dir", customSkillsRoot],
			{
				cwd: projectRoot,
				env: {
					...process.env,
					EXECUTABLE_PLANNING_HOME: fixture.homeDirectory,
				},
				encoding: "utf8",
			},
		);

		assert.equal(result.status, 0, result.stderr);
		assert.match(
			result.stdout,
			new RegExp(`summary created=${REAL_SKILL_COUNT} existing=0`),
		);

		await assertLinkPointsTo(
			path.join(customSkillsRoot, "executable-planning"),
			path.join(projectRoot, SKILL_SOURCE),
		);
		await assert.rejects(
			lstat(path.join(fixture.homeDirectory, ".copilot")),
			/ENOENT/,
		);
	} finally {
		await fixture.cleanup();
	}
});
