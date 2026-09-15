import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import { parseFrontmatter, renderFrontmatter } from "../src/lib/frontmatter.js";

test("parseFrontmatter parses leading YAML frontmatter object and body", () => {
	const source = [
		"---",
		"name: Example Skill",
		"enabled: true",
		"priority: 3",
		"tags:",
		"  - planning",
		"  - quality",
		"---",
		"# Heading",
		"Body line",
	].join("\n");

	const parsed = parseFrontmatter(source, "skill.md");

	assert.deepEqual(parsed.attributes, {
		name: "Example Skill",
		enabled: true,
		priority: 3,
		tags: ["planning", "quality"],
	});
	assert.equal(parsed.body, "# Heading\nBody line");
});

test("parseFrontmatter treats content without leading delimiter as body only", () => {
	const source = "title: not frontmatter\n---\nstill body";

	const parsed = parseFrontmatter(source, "agent.md");

	assert.deepEqual(parsed.attributes, {});
	assert.equal(parsed.body, source);
});

test("parseFrontmatter does not treat --- inside body as a delimiter", () => {
	const source = "first line\n---\nsecond line";

	const parsed = parseFrontmatter(source, "agent.md");

	assert.deepEqual(parsed.attributes, {});
	assert.equal(parsed.body, source);
});

test("parseFrontmatter throws when opening delimiter has no closing delimiter", () => {
	const source = [
		"---",
		"name: Missing Close",
		"body starts and never closes",
	].join("\n");

	assert.throws(
		() => {
			parseFrontmatter(source, "skill.md");
		},
		(error: unknown) => {
			assert.match(String(error), /skill\.md/);
			assert.match(String(error), /closing delimiter/i);
			return true;
		},
	);
});

test("parseFrontmatter throws on duplicate YAML keys", () => {
	const source = ["---", "name: one", "name: two", "---", "body"].join("\n");

	assert.throws(
		() => {
			parseFrontmatter(source, "skill.md");
		},
		(error: unknown) => {
			assert.match(String(error), /skill\.md/);
			assert.match(String(error), /unique/i);
			return true;
		},
	);
});

test("parseFrontmatter throws when YAML frontmatter is not an object mapping", () => {
	const source = ["---", "- item", "- another", "---", "body"].join("\n");

	assert.throws(
		() => {
			parseFrontmatter(source, "agent.md");
		},
		(error: unknown) => {
			assert.match(String(error), /agent\.md/);
			assert.match(String(error), /object/i);
			return true;
		},
	);
});

test("renderFrontmatter emits deterministic insertion-order keys with one closing delimiter", () => {
	const rendered = renderFrontmatter({
		zeta: "last",
		alpha: "first",
		middle: 2,
	});

	assert.equal(rendered, "---\nzeta: last\nalpha: first\nmiddle: 2\n---\n");
	assert.equal(rendered.split("\n---\n").length - 1, 1);
});

test("parseFrontmatter preserves body bytes after closing delimiter", () => {
	const source = [
		"---",
		"name: Skill",
		"---",
		"",
		"Line 1",
		"---",
		"Line 3",
	].join("\n");

	const parsed = parseFrontmatter(source, "skill.md");

	assert.equal(parsed.body, "\nLine 1\n---\nLine 3");
});

test("all skill and agent frontmatter entries are valid", async () => {
	const skillRoot = new URL("../.agents/skills/", import.meta.url);
	const agentRoot = new URL("../.github/agents/", import.meta.url);
	const allowedSkillKeys = new Set([
		"name",
		"description",
		"disable-model-invocation",
	]);
	const allowedAgentKeys = new Set([
		"name",
		"description",
		"argument-hint",
		"tools",
		"agents",
		"user-invocable",
		"disable-model-invocation",
	]);

	for (const directory of await readdir(skillRoot, { withFileTypes: true })) {
		if (!directory.isDirectory()) {
			continue;
		}

		const filePath = new URL(`./${directory.name}/SKILL.md`, skillRoot);
		const content = await readFile(filePath, "utf8");
		const parsed = parseFrontmatter(
			content,
			`.agents/skills/${directory.name}/SKILL.md`,
		);

		for (const key of Object.keys(parsed.attributes)) {
			assert.ok(
				allowedSkillKeys.has(key),
				`unexpected skill frontmatter key for ${directory.name}: ${key}`,
			);
		}
		assert.equal(parsed.attributes.name, directory.name);
		assert.equal(typeof parsed.attributes.name, "string");
		assert.ok(String(parsed.attributes.name).trim().length > 0);
		assert.equal(typeof parsed.attributes.description, "string");
		assert.ok(String(parsed.attributes.description).length <= 80);
		assert.doesNotMatch(
			String(parsed.attributes.description),
			/^(?:use|run|call)\b/i,
		);
		assert.doesNotMatch(String(parsed.attributes.description), /\busers?\b/i);
		if (parsed.attributes["disable-model-invocation"] !== undefined) {
			assert.equal(parsed.attributes["disable-model-invocation"], true);
		}
	}

	for (const entry of await readdir(agentRoot, { withFileTypes: true })) {
		if (!entry.isFile() || !entry.name.endsWith(".agent.md")) {
			continue;
		}

		const filePath = new URL(`./${entry.name}`, agentRoot);
		const content = await readFile(filePath, "utf8");
		const parsed = parseFrontmatter(content, `.github/agents/${entry.name}`);

		for (const key of Object.keys(parsed.attributes)) {
			assert.ok(
				allowedAgentKeys.has(key),
				`unexpected agent frontmatter key for ${entry.name}: ${key}`,
			);
		}
		assert.equal(typeof parsed.attributes.name, "string");
		assert.ok(String(parsed.attributes.name).trim().length > 0);
		assert.equal(typeof parsed.attributes.description, "string");
		assert.ok(String(parsed.attributes.description).length <= 80);
		assert.doesNotMatch(
			String(parsed.attributes.description),
			/^(?:use|run|call)\b/i,
		);
		assert.doesNotMatch(String(parsed.attributes.description), /\busers?\b/i);

		if (parsed.attributes["argument-hint"] !== undefined) {
			assert.equal(typeof parsed.attributes["argument-hint"], "string");
		}
		if (parsed.attributes.tools !== undefined) {
			assert.ok(Array.isArray(parsed.attributes.tools));
			assert.ok(
				(parsed.attributes.tools as unknown[]).every(
					(value) => typeof value === "string",
				),
			);
		}
		if (parsed.attributes.agents !== undefined) {
			assert.ok(Array.isArray(parsed.attributes.agents));
			assert.ok(
				(parsed.attributes.agents as unknown[]).every(
					(value) => typeof value === "string",
				),
			);
		}
		if (parsed.attributes["user-invocable"] !== undefined) {
			assert.equal(typeof parsed.attributes["user-invocable"], "boolean");
		}
		if (parsed.attributes["disable-model-invocation"] !== undefined) {
			assert.equal(
				typeof parsed.attributes["disable-model-invocation"],
				"boolean",
			);
		}
	}
});
