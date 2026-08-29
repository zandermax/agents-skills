import assert from "node:assert/strict";
import test from "node:test";

import { applyExactTransforms, loadTransforms } from "../src/lib/transforms.js";

test("applyExactTransforms applies ordered literal transforms with exact counts", () => {
	const source = "alpha alpha\nnotes\n";
	const transforms = loadTransforms(
		[
			{
				id: "replace-alpha",
				operation: "replace",
				search: "alpha",
				replacement: "beta",
				expectedCount: 2,
			},
			{
				id: "remove-notes",
				operation: "remove",
				search: "notes",
				expectedCount: 1,
			},
		],
		"transforms.json",
	);

	assert.equal(applyExactTransforms(source, transforms), "beta beta\n\n");
});

test("applyExactTransforms counts non-overlapping literal occurrences", () => {
	const source = "aaaaa";
	const transforms = loadTransforms(
		[
			{
				id: "remove-aa",
				operation: "remove",
				search: "aa",
				expectedCount: 2,
			},
		],
		"transforms.json",
	);

	assert.equal(applyExactTransforms(source, transforms), "a");
});

test("applyExactTransforms allows expected count zero without mutation", () => {
	const source = "stable text";
	const transforms = loadTransforms(
		[
			{
				id: "no-op",
				operation: "remove",
				search: "missing",
				expectedCount: 0,
			},
		],
		"transforms.json",
	);

	assert.equal(applyExactTransforms(source, transforms), source);
});

test("applyExactTransforms throws before mutation when expected count mismatches", () => {
	const source = "a b";
	const transforms = loadTransforms(
		[
			{
				id: "replace-a",
				operation: "replace",
				search: "a",
				replacement: "x",
				expectedCount: 2,
			},
		],
		"transforms.json",
	);

	assert.throws(
		() => {
			applyExactTransforms(source, transforms);
		},
		(error: unknown) => {
			assert.match(String(error), /replace-a/);
			assert.match(String(error), /expected\s+2/i);
			assert.match(String(error), /found\s+1/i);
			return true;
		},
	);
});

test("loadTransforms rejects duplicate transform IDs", () => {
	assert.throws(
		() => {
			loadTransforms(
				[
					{
						id: "duplicate",
						operation: "remove",
						search: "a",
						expectedCount: 0,
					},
					{
						id: "duplicate",
						operation: "remove",
						search: "b",
						expectedCount: 0,
					},
				],
				"transforms.json",
			);
		},
		(error: unknown) => {
			assert.match(String(error), /transforms\.json/);
			assert.match(String(error), /duplicate/i);
			assert.match(String(error), /id/i);
			return true;
		},
	);
});

test("loadTransforms rejects replace without replacement", () => {
	assert.throws(
		() => {
			loadTransforms(
				[
					{
						id: "replace-missing-replacement",
						operation: "replace",
						search: "a",
						expectedCount: 1,
					},
				],
				"transforms.json",
			);
		},
		(error: unknown) => {
			assert.match(String(error), /replacement/i);
			return true;
		},
	);
});

test("loadTransforms rejects replacement on remove operations", () => {
	assert.throws(
		() => {
			loadTransforms(
				[
					{
						id: "remove-with-replacement",
						operation: "remove",
						search: "a",
						replacement: "x",
						expectedCount: 1,
					},
				],
				"transforms.json",
			);
		},
		(error: unknown) => {
			assert.match(String(error), /remove-with-replacement/);
			assert.match(String(error), /replacement/i);
			assert.match(String(error), /remove/i);
			return true;
		},
	);
});

test("loadTransforms validates unknown keys and primitive field types", () => {
	assert.throws(
		() => {
			loadTransforms(
				[
					{
						id: "bad",
						operation: "remove",
						search: "x",
						expectedCount: 0,
						extra: true,
					},
				],
				"transforms.json",
			);
		},
		(error: unknown) => {
			assert.match(String(error), /unknown/i);
			assert.match(String(error), /extra/);
			return true;
		},
	);

	assert.throws(
		() => {
			loadTransforms(
				[
					{
						id: 12,
						operation: "remove",
						search: "x",
						expectedCount: 0,
					},
				],
				"transforms.json",
			);
		},
		(error: unknown) => {
			assert.match(String(error), /id/i);
			assert.match(String(error), /string/i);
			return true;
		},
	);
});
