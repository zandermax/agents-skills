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
	".github",
	"agents",
	"executable-planner.agent.md",
);
const executablePlanningCorePath = path.join(
	projectRoot,
	"sources",
	"executable-planning",
	"core.md",
);

const EXECUTABLE_PLANNER_FRONTMATTER_BLOCK = [
	"---",
	"name: Executable Planner",
	"description: Create and maintain an iterative, executable plan for IDE or autonomous harness use",
	"argument-hint: Describe the goal, constraints, and whether this is an auto-run or local docs plan",
	'tools: ["search", "read", "edit", "agent", "todo"]',
	'agents: ["*"]',
	"user-invocable: true",
	"disable-model-invocation: false",
	"---",
	"",
].join("\n");
const EXECUTABLE_PLANNER_BODY = [
	"",
	"You create implementation plans under `docs/plans/` for IDE and autonomous harness execution. Planning is your sole responsibility; do not implement project work.",
	"",
	"**REQUIRED SKILL:** Use executable-planning for all planning behavior.",
	"",
	"Load every additional skill named by this agent before planning. If a required skill cannot be loaded, report that failure and stop rather than reconstructing its workflow from memory.",
	"",
	"Use the available read, search, question, persistence, and subagent tools to carry out the loaded skills. Keep harness-specific tool choices in this adapter; keep planning behavior in the skill.",
	"",
	"When the skill calls for asking the user something in interactive mode, ask through this harness's structured question tool rather than plain prose, using predefined options where the answers are fixed. In VS Code that tool is `vscode_askQuestions`. In autopilot mode, do not call it; record conservative reversible assumptions in the plan instead.",
	"",
].join("\n");

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
				title: "Executable Planning",
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
						source: ".agents/skills",
						entry: { kind: "directory", marker: "SKILL.md" },
					},
					{
						name: "copilot",
						artifactKind: "agent",
						source: ".github/agents",
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

test("checkCustomizations accepts valid repository fixtures", async () => {
	const repoRoot = await createFixtureRepo();

	try {
		await checkCustomizations(repoRoot);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations requires completed plans to be archived", async () => {
	const repoRoot = await createFixtureRepo({ planStatus: "completed" });
	try {
		await assert.rejects(
			checkCustomizations(repoRoot),
			/plans must be moved to docs\/plans\/archive/,
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations requires archived plans to be terminal", async () => {
	const repoRoot = await createFixtureRepo({
		planStatus: "in-progress",
		planArchived: true,
	});
	try {
		await assert.rejects(
			checkCustomizations(repoRoot),
			/archived plan status must be completed or abandoned/,
		);
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

test("checkCustomizations accepts a manual-invocation-only skill", async () => {
	const repoRoot = await createFixtureRepo({
		skillExtraFrontmatter: { "disable-model-invocation": true },
	});

	try {
		await checkCustomizations(repoRoot);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects disable-model-invocation set to a non-true value", async () => {
	const repoRoot = await createFixtureRepo({
		skillExtraFrontmatter: { "disable-model-invocation": false },
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(String(error), /SKILL\.md:/);
				assert.match(String(error), /disable-model-invocation must be true/i);
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

test("checkCustomizations rejects agents declaring an unknown required skill", async () => {
	const repoRoot = await createFixtureRepo({
		agentBodyOverride: [
			"# Executable Planner",
			"",
			"**REQUIRED SKILL:** Use missing-skill for planning behavior.",
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
				assert.match(String(error), /missing-skill/);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations validates each Copilot agent against only its declared skills", async () => {
	const repoRoot = await createFixtureRepo();
	const reviewingSourceDir = path.join(repoRoot, "sources", "reviewing");
	const reviewingSkillDir = path.join(
		repoRoot,
		".agents",
		"skills",
		"reviewing",
	);

	await mkdir(reviewingSourceDir, { recursive: true });
	await mkdir(reviewingSkillDir, { recursive: true });
	await writeFile(
		path.join(reviewingSourceDir, "core.md"),
		"## Review\nReview source content.\n",
		"utf8",
	);
	await writeFile(
		path.join(reviewingSourceDir, "skill.json"),
		JSON.stringify(
			{
				name: "reviewing",
				title: "Reviewing",
				description: "Use when reviewing requires focused feedback.",
				output: ".agents/skills/reviewing/SKILL.md",
				selections: [
					{ source: "core.md", owner: "core", headings: ["Review"] },
				],
				sectionOwnership: { Review: "core" },
				requiredPhrases: [],
				forbiddenPhrases: [],
			},
			null,
			2,
		),
		"utf8",
	);
	await writeFile(
		path.join(reviewingSkillDir, "SKILL.md"),
		"---\nname: reviewing\ndescription: Use when reviewing requires focused feedback.\n---\n# Reviewing\n\n## Review\nReview feedback.\n",
		"utf8",
	);
	await writeFile(
		path.join(repoRoot, ".github", "agents", "reviewer.agent.md"),
		"---\nname: Reviewer\ndescription: Review work.\n---\n\n**REQUIRED SKILL:** Use reviewing for review behavior.\n",
		"utf8",
	);

	try {
		await checkCustomizations(repoRoot);
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

test("checkCustomizations rejects canonical headings at any agent heading level", async () => {
	const repoRoot = await createFixtureRepo({
		agentBodyOverride: [
			"# Scope",
			"",
			"**REQUIRED SKILL:** Use executable-planning for all planning behavior.",
			"",
			"A level-one heading must not bypass canonical ownership.",
		].join("\n"),
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
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
				assert.match(String(error), /install:artifacts/);
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

test("executable planner agent is a thin adapter with byte-stable frontmatter", async () => {
	const [agentContent, coreContent] = await Promise.all([
		readFile(executablePlannerPath, "utf8"),
		readFile(executablePlanningCorePath, "utf8"),
	]);

	assert.ok(
		agentContent.startsWith(EXECUTABLE_PLANNER_FRONTMATTER_BLOCK),
		"agent frontmatter block must remain byte-identical",
	);

	const parsedAgent = parseFrontmatter(
		agentContent,
		".github/agents/executable-planner.agent.md",
	);

	assert.deepEqual(parsedAgent.attributes, {
		name: "Executable Planner",
		description:
			"Create and maintain an iterative, executable plan for IDE or autonomous harness use",
		"argument-hint":
			"Describe the goal, constraints, and whether this is an auto-run or local docs plan",
		tools: ["search", "read", "edit", "agent", "todo"],
		agents: ["*"],
		"user-invocable": true,
		"disable-model-invocation": false,
	});

	assert.equal(parsedAgent.body, EXECUTABLE_PLANNER_BODY);

	const coreHeadings = new Set(
		listSections(coreContent)
			.filter((section) => section.level >= 2)
			.map((section) => section.heading),
	);
	for (const section of listSections(parsedAgent.body)) {
		if (section.level >= 2) {
			assert.ok(
				!coreHeadings.has(section.heading),
				`agent body duplicates canonical core heading: ${section.heading}`,
			);
		}
	}
});
