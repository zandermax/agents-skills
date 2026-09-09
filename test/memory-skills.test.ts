import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "../src/lib/frontmatter.js";
import { listSections } from "../src/lib/markdown-sections.js";

const testFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(testFilePath), "..");
const tsxCliPath = path.join(
	repoRoot,
	"node_modules",
	"tsx",
	"dist",
	"cli.mjs",
);

function resolveMemoryDir(): string {
	const customDir = process.env.MEMORY_DIR;
	if (customDir && customDir.trim().length > 0) {
		return path.resolve(customDir);
	}
	return path.join(os.homedir(), ".memory");
}

async function discoverMemoryTopics(
	memoryDir: string,
): Promise<readonly string[]> {
	try {
		const entries = await readdir(memoryDir, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort();
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ENOENT") {
			return [];
		}
		throw error;
	}
}

const memoryDirIsExplicit = (process.env.MEMORY_DIR ?? "").trim().length > 0;

// The personal memory store lives outside the repo, so CI runners have none.
const skipWithoutMemoryStore =
	memoryDirIsExplicit || existsSync(resolveMemoryDir())
		? false
		: "no memory store present; set MEMORY_DIR to enforce these gates";

test("memory directory resolution and topic discovery", {
	skip: skipWithoutMemoryStore,
}, async () => {
	const memoryDir = resolveMemoryDir();
	const topics = await discoverMemoryTopics(memoryDir);

	assert.ok(
		topics.length > 0,
		`Expected at least one memory topic in ${memoryDir}, but found none`,
	);
});

test("every memory topic has a dedicated test directory with at least one test file (1:1 gate)", {
	skip: skipWithoutMemoryStore,
}, async () => {
	const memoryDir = resolveMemoryDir();
	const topics = await discoverMemoryTopics(memoryDir);

	const missingTests: string[] = [];

	for (const topic of topics) {
		const testDir = path.join(memoryDir, topic, "test");
		try {
			const stats = await stat(testDir);
			if (!stats.isDirectory()) {
				missingTests.push(`${topic}: 'test' exists but is not a directory`);
				continue;
			}

			const files = await readdir(testDir);
			const testFiles = files.filter(
				(file) => file.endsWith(".test.ts") || file.endsWith(".test.js"),
			);
			if (testFiles.length === 0) {
				missingTests.push(
					`${topic}: 'test/' directory contains no *.test.ts or *.test.js files`,
				);
			}
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code === "ENOENT") {
				missingTests.push(`${topic}: missing 'test/' directory`);
			} else {
				throw error;
			}
		}
	}

	assert.equal(
		missingTests.length,
		0,
		`Memory test coverage failure - the following memory topics lack tests:\n${missingTests.map((t) => `  - ${t}`).join("\n")}`,
	);
});

test("every memory topic has valid SKILL.md structure and trigger frontmatter", {
	skip: skipWithoutMemoryStore,
}, async () => {
	const memoryDir = resolveMemoryDir();
	const topics = await discoverMemoryTopics(memoryDir);

	for (const topic of topics) {
		const skillPath = path.join(memoryDir, topic, "SKILL.md");
		const content = await readFile(skillPath, "utf8");
		const parsed = parseFrontmatter(content, `${topic}/SKILL.md`);

		const name = parsed.attributes.name;
		assert.equal(
			typeof name,
			"string",
			`${topic}/SKILL.md: frontmatter 'name' must be string`,
		);
		assert.equal(
			name,
			topic,
			`${topic}/SKILL.md: frontmatter 'name' (${name}) must match directory name (${topic})`,
		);

		const description = parsed.attributes.description;
		assert.equal(
			typeof description,
			"string",
			`${topic}/SKILL.md: frontmatter 'description' must be string`,
		);
		assert.ok(
			(description as string).length > 0,
			`${topic}/SKILL.md: description must not be empty`,
		);
		assert.match(
			description as string,
			/preferences|conventions|learnings|notes/i,
			`${topic}/SKILL.md: description should identify personal preferences/conventions`,
		);

		const sections = listSections(parsed.body);
		const headings = sections
			.filter((s) => s.level === 2)
			.map((s) => s.heading.toLowerCase());

		assert.ok(
			headings.some((h) => ["preferences", "conventions", "notes"].includes(h)),
			`${topic}/SKILL.md: expected at least one 'Preferences', 'Conventions', or 'Notes' section`,
		);
	}
});

test("behavioral evals: execute per-skill tests in all memory topics", {
	skip: skipWithoutMemoryStore,
}, async () => {
	const memoryDir = resolveMemoryDir();
	const topics = await discoverMemoryTopics(memoryDir);

	for (const topic of topics) {
		const testDir = path.join(memoryDir, topic, "test");
		const files = await readdir(testDir);
		const testFiles = files.filter(
			(file) => file.endsWith(".test.ts") || file.endsWith(".test.js"),
		);

		for (const testFile of testFiles) {
			const absoluteTestPath = path.join(testDir, testFile);

			const result = spawnSync(
				process.execPath,
				[tsxCliPath, "--test", absoluteTestPath],
				{
					cwd: repoRoot,
					encoding: "utf8",
					env: {
						...process.env,
						MEMORY_DIR: memoryDir,
					},
				},
			);

			assert.equal(
				result.status,
				0,
				`Behavioral test failed for memory topic '${topic}' (${testFile}):\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
			);
		}
	}
});
