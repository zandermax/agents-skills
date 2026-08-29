import assert from "node:assert/strict";
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
