import assert from "node:assert/strict";
import test from "node:test";

import {
	assertUniqueHeadings,
	listSections,
	requireSection,
} from "../src/lib/markdown-sections.js";

test("listSections parses ATX levels 1-6 and closes sections at equal-or-higher headings", () => {
	const source = [
		"# One",
		"one body",
		"## Two",
		"two body",
		"### Three",
		"three body",
		"#### Four",
		"four body",
		"##### Five",
		"five body",
		"###### Six",
		"six body",
		"## Two Again",
		"two again body",
		"# Next",
		"next body",
	].join("\n");

	const sections = listSections(source);

	assert.deepEqual(
		sections.map((section) => ({
			heading: section.heading,
			level: section.level,
			startLine: section.startLine,
			endLine: section.endLine,
		})),
		[
			{ heading: "One", level: 1, startLine: 1, endLine: 14 },
			{ heading: "Two", level: 2, startLine: 3, endLine: 12 },
			{ heading: "Three", level: 3, startLine: 5, endLine: 12 },
			{ heading: "Four", level: 4, startLine: 7, endLine: 12 },
			{ heading: "Five", level: 5, startLine: 9, endLine: 12 },
			{ heading: "Six", level: 6, startLine: 11, endLine: 12 },
			{ heading: "Two Again", level: 2, startLine: 13, endLine: 14 },
			{ heading: "Next", level: 1, startLine: 15, endLine: 16 },
		],
	);

	assert.equal(
		sections[1]?.content,
		[
			"## Two",
			"two body",
			"### Three",
			"three body",
			"#### Four",
			"four body",
			"##### Five",
			"five body",
			"###### Six",
			"six body",
			"",
		].join("\n"),
	);

	assert.equal(sections[5]?.content, ["###### Six", "six body", ""].join("\n"));
});

test("listSections ignores headings inside backtick and tilde fences including language suffixes", () => {
	const source = [
		"# Top",
		"```ts",
		"# inside backtick fence",
		"```",
		"~~~python",
		"## inside tilde fence",
		"~~~",
		"## Visible",
		"visible body",
	].join("\n");

	const sections = listSections(source);

	assert.deepEqual(
		sections.map((section) => section.heading),
		["Top", "Visible"],
	);
	assert.equal(sections[1]?.startLine, 8);
	assert.equal(sections[1]?.endLine, 9);
	assert.equal(sections[1]?.content, ["## Visible", "visible body"].join("\n"));
});

test("listSections ignores headings inside compatible fences indented up to three spaces", () => {
	const source = [
		"# Top",
		" ```ts",
		"## inside one-space backtick fence",
		" ```",
		"  ~~~python",
		"### inside two-space tilde fence",
		"  ~~~",
		"   ```md",
		"#### inside three-space backtick fence",
		"   ```",
		"## Visible",
		"visible body",
	].join("\n");

	const sections = listSections(source);

	assert.deepEqual(
		sections.map((section) => section.heading),
		["Top", "Visible"],
	);
	assert.equal(sections[1]?.startLine, 11);
	assert.equal(sections[1]?.endLine, 12);
});

test("listSections ignores indented heading-like lines", () => {
	const source = [
		"# Real",
		"  ## not heading",
		"\t### not heading either",
		"body",
	].join("\n");

	const sections = listSections(source);

	assert.equal(sections.length, 1);
	assert.equal(sections[0]?.heading, "Real");
	assert.equal(sections[0]?.endLine, 4);
	assert.equal(sections[0]?.content, source);
});

test("requireSection returns exact section bytes for unique heading", () => {
	const source = [
		"# A",
		"a body",
		"## Child",
		"child body",
		"# B",
		"b body",
	].join("\n");

	const section = requireSection(source, "Child", "doc.md");

	assert.equal(section.heading, "Child");
	assert.equal(section.level, 2);
	assert.equal(section.startLine, 3);
	assert.equal(section.endLine, 4);
	assert.equal(section.content, ["## Child", "child body", ""].join("\n"));
});

test("requireSection throws for missing headings", () => {
	assert.throws(
		() => {
			requireSection("# Present\nbody", "Absent", "doc.md");
		},
		(error: unknown) => {
			assert.match(String(error), /doc\.md/);
			assert.match(String(error), /Absent/);
			assert.match(String(error), /missing|not found/i);
			return true;
		},
	);
});

test("requireSection throws for duplicate exact headings", () => {
	const source = ["# Repeat", "one", "# Repeat", "two"].join("\n");

	assert.throws(
		() => {
			requireSection(source, "Repeat", "doc.md");
		},
		(error: unknown) => {
			assert.match(String(error), /doc\.md/);
			assert.match(String(error), /Repeat/);
			assert.match(String(error), /duplicate|more than one/i);
			return true;
		},
	);
});

test("assertUniqueHeadings throws for duplicate headings and passes for unique headings", () => {
	const unique = listSections(["# One", "body", "## Two", "body"].join("\n"));
	assert.doesNotThrow(() => {
		assertUniqueHeadings(unique, "unique.md");
	});

	const duplicate = listSections(["# Same", "one", "# Same", "two"].join("\n"));

	assert.throws(
		() => {
			assertUniqueHeadings(duplicate, "dup.md");
		},
		(error: unknown) => {
			assert.match(String(error), /dup\.md/);
			assert.match(String(error), /Same/);
			assert.match(String(error), /duplicate|unique/i);
			return true;
		},
	);
});
