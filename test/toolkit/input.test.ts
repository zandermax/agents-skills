import { afterAll, beforeAll, test } from "bun:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadInput } from "../../src/toolkit/input.ts";

let temporary: string;
let root: string;
beforeAll(async () => {
	temporary = await mkdtemp(
		join(dirname(fileURLToPath(import.meta.url)), ".tmp-input-"),
	);
	root = join(temporary, "allowed");
	await mkdir(root);
	await writeFile(join(root, "lines.txt"), "a\r\n\r\nb\r\n");
	await writeFile(join(root, "items.json"), '["a","","b"]');
	await writeFile(
		join(root, "records.txt"),
		'{"team":{"name":"x"}}\n\n{"team":{"name":"y"}}\n',
	);
	await writeFile(
		join(root, "items.csv"),
		'name,note\r\n"a,b","first\nline"\r\n"a,b","say ""hi"""\r\nc,last\r\n',
	);
	await writeFile(join(root, "text.json"), '"a\\nb"');
	await writeFile(join(root, "empty.txt"), "");
	await writeFile(join(temporary, "outside.txt"), "outside");
	await symlink(join(temporary, "outside.txt"), join(root, "escape.txt"));
	await symlink(join(root, "lines.txt"), join(root, "inside.txt"));
});
afterAll(async () => {
	await rm(temporary, { recursive: true, force: true });
});

test("collection sources distinguish inline, literal lines, and JSON", async () => {
	const expected = ["a", "", "b"];
	assert.deepEqual(
		await loadInput("collection", "mode", { items: expected }, root),
		expected,
	);
	assert.deepEqual(
		await loadInput(
			"collection",
			"mode",
			{ path: "lines.txt", format: "lines" },
			root,
		),
		expected,
	);
	assert.deepEqual(
		await loadInput(
			"collection",
			"mode",
			{ path: "items.json", format: "json" },
			root,
		),
		expected,
	);
	assert.deepEqual(
		await loadInput(
			"collection",
			"mode",
			{ path: "empty.txt", format: "lines" },
			root,
		),
		[],
	);
});

test("CSV preserves quoted commas, newlines, and escaped quotes as strings", async () => {
	assert.deepEqual(
		await loadInput(
			"collection",
			"frequencies",
			{ path: "items.csv", format: "csv", column: "name" },
			root,
		),
		["a,b", "a,b", "c"],
	);
	assert.deepEqual(
		await loadInput(
			"collection",
			"group_count",
			{ path: "items.csv", format: "csv" },
			root,
		),
		[
			{ name: "a,b", note: "first\nline" },
			{ name: "a,b", note: 'say "hi"' },
			{ name: "c", note: "last" },
		],
	);
	assert.equal(
		await loadInput(
			"text",
			"grapheme_count",
			{ path: "items.csv", format: "csv", column: "note" },
			root,
		),
		'first\nline\nsay "hi"\nlast',
	);
});

test("text sources preserve raw lines and require JSON strings", async () => {
	assert.equal(
		await loadInput("text", "grapheme_count", { text: "a\nb" }, root),
		"a\nb",
	);
	assert.equal(
		await loadInput(
			"text",
			"grapheme_count",
			{ path: "lines.txt", format: "lines" },
			root,
		),
		"a\r\n\r\nb\r\n",
	);
	assert.equal(
		await loadInput(
			"text",
			"grapheme_count",
			{ path: "text.json", format: "json" },
			root,
		),
		"a\nb",
	);
	assert.deepEqual(
		await loadInput(
			"collection",
			"group_count",
			{ path: "records.txt", format: "lines" },
			root,
		),
		[{ team: { name: "x" } }, { team: { name: "y" } }],
	);
	await assert.rejects(
		loadInput(
			"text",
			"grapheme_count",
			{ path: "items.json", format: "json" },
			root,
		),
	);
});

test("sources reject ambiguous and irrelevant format choices", async () => {
	for (const args of [
		{},
		{ items: [], path: "lines.txt", format: "lines" },
		{ path: "lines.txt" },
		{ items: [], format: "json" },
		{ path: "items.csv", format: "csv" },
		{ path: "items.json", format: "json", column: "name" },
		{ path: "items.csv", format: "csv", column: "missing" },
	]) {
		await assert.rejects(loadInput("collection", "mode", args, root));
	}
});

test("CSV rejects missing, duplicate, and inconsistent headers or rows", async () => {
	for (const [index, content] of [
		"",
		"name,name\na,b",
		",note\na,b",
		"name,note\na",
	].entries()) {
		const filename = `invalid-${index}.csv`;
		await writeFile(join(root, filename), content);
		await assert.rejects(
			loadInput(
				"collection",
				"group_count",
				{ path: filename, format: "csv" },
				root,
			),
		);
	}
});

test("file access rejects escapes and nonregular files but allows in-root symlinks", async () => {
	for (const filename of [
		"../outside.txt",
		join(temporary, "outside.txt"),
		"escape.txt",
		".",
	]) {
		await assert.rejects(
			loadInput(
				"collection",
				"mode",
				{ path: filename, format: "lines" },
				root,
			),
		);
	}
	assert.deepEqual(
		await loadInput(
			"collection",
			"mode",
			{ path: "inside.txt", format: "lines" },
			root,
		),
		["a", "", "b"],
	);
	await writeFile(join(root, "invalid-utf8.txt"), Buffer.from([0xff]));
	await assert.rejects(
		loadInput(
			"text",
			"grapheme_count",
			{ path: "invalid-utf8.txt", format: "lines" },
			root,
		),
	);
});

test("input limits reject oversized bytes, arrays, and nested records", async () => {
	const oversized = "x".repeat(10 * 1024 * 1024 + 1);
	await assert.rejects(
		loadInput("text", "grapheme_count", { text: oversized }, root),
	);
	await writeFile(join(root, "large.txt"), oversized);
	await assert.rejects(
		loadInput(
			"text",
			"grapheme_count",
			{ path: "large.txt", format: "lines" },
			root,
		),
	);
	await assert.rejects(
		loadInput("collection", "mode", { items: Array(100_001).fill(null) }, root),
	);
	let nested: unknown = null;
	for (let depth = 0; depth < 33; depth += 1) nested = { child: nested };
	await assert.rejects(
		loadInput("collection", "group_count", { records: [nested] }, root),
	);
});
