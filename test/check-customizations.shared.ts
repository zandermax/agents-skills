import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkCustomizations } from "../src/check-customizations.js";
import { parseFrontmatter } from "../src/lib/frontmatter.js";
import { listSections } from "../src/lib/markdown-sections.js";

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
const executablePlannerPath = path.join(
	projectRoot,
	"agents",
	"executable-planner.agent.md",
);
const executablePlanningCorePath = path.join(
	projectRoot,
	"sources",
	"executable-planning",
	"executable-planning.md",
);
const planScoutPath = path.join(projectRoot, "agents", "plan-scout.agent.md");
const planExecutorPath = path.join(
	projectRoot,
	"agents",
	"plan-executor.agent.md",
);

type FixtureOptions = {
	skillFolderName?: string;
	skillFrontmatterName?: string;
	skillExtraFrontmatter?: Readonly<Record<string, unknown>>;
	skillBodyExtra?: string;
	agentBodyOverride?: string;
	readmeOverride?: string;
	manifestSourceOverride?: string;
	planStatus?: string;
	planArchived?: boolean;
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
		description: "Creates deterministic planning checkpoints.",
		...(options.skillExtraFrontmatter ?? {}),
	};
	const skillFrontmatterYaml = Object.entries(skillFrontmatter)
		.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
		.join("\n");

	const skillDir = path.join(repoRoot, "skills", skillFolderName);
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

	const agentDir = path.join(repoRoot, "agents");
	await mkdir(agentDir, { recursive: true });
	await writeFile(
		path.join(agentDir, "executable-planner.agent.md"),
		options.agentBodyOverride ??
			[
				"---",
				"name: Executable Planner",
				"description: Planning-only orchestrator.",
				'tools: ["read", "search", "web", "vscode/askQuestions"]',
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
				title: "Executable Planning",
				description: "Creates deterministic planning checkpoints.",
				output: "skills/executable-planning/SKILL.md",
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
				"Run npm run install:artifacts to install for copilot, claude, and .agents/skills consumers.",
			].join("\n"),
		"utf8",
	);
	await writeFile(
		path.join(repoRoot, "install-catalog.json"),
		JSON.stringify(
			{
				collections: [
					{
						name: "skills",
						artifactKind: "skill",
						source: "skills",
						entry: { kind: "directory", marker: "SKILL.md" },
					},
					{
						name: "copilot",
						artifactKind: "agent",
						source: "agents",
						entry: { kind: "file", suffix: ".agent.md" },
						validation: "copilot-agent",
					},
				],
				clients: [
					{
						name: "copilot",
						destinations: [
							{ collection: "skills", path: "~/.copilot/skills" },
							{ collection: "copilot", path: "~/.copilot/agents" },
						],
					},
				],
			},
			null,
			2,
		),
		"utf8",
	);
	const githooksDir = path.join(repoRoot, ".githooks");
	await mkdir(githooksDir, { recursive: true });
	await writeFile(
		path.join(githooksDir, "pre-push"),
		"#!/bin/sh\nnpm run check\n",
		"utf8",
	);

	await writeFile(
		path.join(repoRoot, "package.json"),
		JSON.stringify(
			{
				name: "fixture",
				scripts: {
					prepare: "git config core.hooksPath .githooks",
				},
			},
			null,
			2,
		),
		"utf8",
	);

	if (options.planStatus !== undefined) {
		const planDirectory = path.join(
			repoRoot,
			"docs",
			"plans",
			options.planArchived ? "archive" : "",
		);
		await mkdir(planDirectory, { recursive: true });
		await writeFile(
			path.join(planDirectory, "fixture.md"),
			`---\nstatus: ${options.planStatus}\n---\n# Fixture Plan\n`,
			"utf8",
		);
	}

	return repoRoot;
}

export type { FixtureOptions };
export {
	assert,
	checkCustomizations,
	checkerCliPath,
	createFixtureRepo,
	executablePlannerPath,
	executablePlanningCorePath,
	fileURLToPath,
	listSections,
	mkdir,
	mkdtemp,
	os,
	parseFrontmatter,
	path,
	planExecutorPath,
	planScoutPath,
	projectRoot,
	readFile,
	rm,
	spawnSync,
	test,
	testFilePath,
	tsxCliPath,
	writeFile,
};
