import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkCustomizations } from "../src/check-customizations.js";

const testFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testFilePath), "..");
const tsxCliPath = path.join(
	projectRoot,
	"node_modules",
	"tsx",
	"dist",
	"cli.mjs",
);
const checkerCliPath = path.join(projectRoot, "src", "check-customizations.ts");

type FixtureOptions = {
	skillFolderName?: string;
	skillFrontmatterName?: string;
	skillExtraFrontmatter?: Readonly<Record<string, unknown>>;
	skillBodyExtra?: string;
	agentBodyOverride?: string;
	readmeOverride?: string;
	manifestSourceOverride?: string;
};

async function createFixtureRepo(
	options: FixtureOptions = {},
): Promise<string> {
	const repoRoot = await mkdtemp(
		path.join(os.tmpdir(), "check-customizations-"),
	);
	const skillFolderName = options.skillFolderName ?? "executable-planning";
	const skillFrontmatterName =
		options.skillFrontmatterName ?? "executable-planning";
	const skillFrontmatter = {
		name: skillFrontmatterName,
		description: "Use when planning requires deterministic checkpoints.",
		...(options.skillExtraFrontmatter ?? {}),
	};
	const skillFrontmatterYaml = Object.entries(skillFrontmatter)
		.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
		.join("\n");

	const skillDir = path.join(repoRoot, ".agents", "skills", skillFolderName);
	await mkdir(skillDir, { recursive: true });
	await writeFile(
		path.join(skillDir, "SKILL.md"),
		[
			"---",
			skillFrontmatterYaml,
			"---",
			"# Executable Planning",
			"",
			"## Scope",
			"Keep a canonical state record for each phase.",
			"",
			"## Usage",
			"Apply iterative plan checkpoints before execution.",
			options.skillBodyExtra ?? "",
		].join("\n"),
		"utf8",
	);

	const agentDir = path.join(repoRoot, ".github", "agents");
	await mkdir(agentDir, { recursive: true });
	await writeFile(
		path.join(agentDir, "executable-planner.agent.md"),
		options.agentBodyOverride ??
			[
				"---",
				"name: Executable Planner",
				"description: Planning-only orchestrator.",
				"---",
				"# Executable Planner",
				"",
				"**REQUIRED SKILL:** Use executable-planning for all planning behavior.",
				"",
				"Keep this agent thin and delegate planning workflow to the skill.",
			].join("\n"),
		"utf8",
	);

	const sourceDir = path.join(repoRoot, "sources", "executable-planning");
	await mkdir(sourceDir, { recursive: true });
	await writeFile(
		path.join(sourceDir, "core.md"),
		"## Scope\nCore scope content.\n",
		"utf8",
	);
	await writeFile(
		path.join(sourceDir, "official.md"),
		"## Discovery\nOfficial discovery content.\n",
		"utf8",
	);
	await writeFile(
		path.join(sourceDir, "skill-only.md"),
		"## Usage\nSkill-only usage content.\n",
		"utf8",
	);
	await writeFile(path.join(sourceDir, "transforms.json"), "[]\n", "utf8");
	await writeFile(
		path.join(sourceDir, "skill.json"),
		JSON.stringify(
			{
				name: "executable-planning",
				description: "Use when planning requires deterministic checkpoints.",
				output: ".agents/skills/executable-planning/SKILL.md",
				selections: [
					{
						source: options.manifestSourceOverride ?? "core.md",
						owner: "core",
						headings: ["Scope"],
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
					Discovery: "official",
					Usage: "skill",
				},
				requiredPhrases: [],
				forbiddenPhrases: [],
			},
			null,
			2,
		),
		"utf8",
	);

	await writeFile(
		path.join(repoRoot, "README.md"),
		options.readmeOverride ??
			[
				"# Executable Planning",
				"",
				"Run npm run build and npm run check to validate outputs.",
				"Run npm run install:clients to install for copilot, claude, and .agents/skills consumers.",
			].join("\n"),
		"utf8",
	);

	return repoRoot;
}

test("checkCustomizations accepts valid repository fixtures", async () => {
	const repoRoot = await createFixtureRepo();

	try {
		await checkCustomizations(repoRoot);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

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
				assert.match(message, /\.agents\/skills\/different-name\/SKILL\.md:/);
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

test("checkCustomizations reports skill-file errors in code-point lexical order", async () => {
	const repoRoot = await createFixtureRepo();

	const upperSkillDir = path.join(repoRoot, ".agents", "skills", "B-skill");
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

	const lowerSkillDir = path.join(repoRoot, ".agents", "skills", "a-skill");
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
				const upperIndex = message.indexOf(".agents/skills/B-skill/SKILL.md:");
				const lowerIndex = message.indexOf(".agents/skills/a-skill/SKILL.md:");

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

test("checkCustomizations rejects agent files missing required skill declaration", async () => {
	const repoRoot = await createFixtureRepo({
		agentBodyOverride:
			"# Executable Planner\n\nThis body omits the required skill declaration.",
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(
					String(error),
					/\.github\/agents\/executable-planner\.agent\.md:/,
				);
				assert.match(String(error), /REQUIRED SKILL/i);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects duplicated canonical headings in thin agent", async () => {
	const repoRoot = await createFixtureRepo({
		agentBodyOverride: [
			"# Executable Planner",
			"",
			"**REQUIRED SKILL:** Use executable-planning for all planning behavior.",
			"",
			"## Scope",
			"Duplicated workflow section should stay in the skill.",
		].join("\n"),
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(
					String(error),
					/\.github\/agents\/executable-planner\.agent\.md:/,
				);
				assert.match(String(error), /duplicate canonical heading/i);
				assert.match(String(error), /Scope/);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects missing README command and client instructions", async () => {
	const repoRoot = await createFixtureRepo({
		readmeOverride:
			"# Executable Planning\n\nThis README omits install and check commands.",
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(String(error), /README\.md:/);
				assert.match(String(error), /npm run check/);
				assert.match(String(error), /install:clients/);
				assert.match(String(error), /copilot/i);
				assert.match(String(error), /claude/i);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects broken repository-relative source paths", async () => {
	const repoRoot = await createFixtureRepo({
		manifestSourceOverride: "missing.md",
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(
					String(error),
					/sources\/executable-planning\/skill\.json:/,
				);
				assert.match(String(error), /missing\.md/);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations CLI exits nonzero with stable path-prefixed errors", async () => {
	const repoRoot = await createFixtureRepo({
		manifestSourceOverride: "missing.md",
	});

	try {
		const result = spawnSync(
			process.execPath,
			[tsxCliPath, checkerCliPath, repoRoot],
			{
				cwd: projectRoot,
				encoding: "utf8",
			},
		);

		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /sources\/executable-planning\/skill\.json:/);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});
