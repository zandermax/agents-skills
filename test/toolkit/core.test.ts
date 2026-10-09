import { test } from "bun:test";
import assert from "node:assert/strict";
import {
	dedupe,
	frequencies,
	groupCount,
	mode,
	type Scalar,
} from "../../src/lib/collections.ts";
import { countOccurrences, graphemeCount } from "../../src/lib/text.ts";

test("mode ranks counts and breaks ties by first appearance", () => {
	assert.deepEqual(mode(["b", "a", "a", "b", "c"]), [["b", 2]]);
	assert.deepEqual(mode(["b", "a", "a", "b"], { top: 3 }), [
		["b", 2],
		["a", 2],
	]);
	assert.deepEqual(mode([]), []);
	for (const top of [0, -1, 1.5, Number.NaN]) {
		assert.throws(() => mode(["a"], { top }), RangeError);
	}
});

test("frequencies preserves scalar types and stable count ties", () => {
	const items = Object.freeze([1, "1", null, false, 1, "b", "a"]);
	assert.deepEqual(frequencies(items), [
		[1, 2],
		["1", 1],
		[null, 1],
		[false, 1],
		["b", 1],
		["a", 1],
	]);
	assert.deepEqual(frequencies([-0, 0]), [[0, 2]]);
	assert.deepEqual(frequencies([]), []);
});

test("frequencies implements first-seen and code-point alpha ordering", () => {
	assert.deepEqual(frequencies(["b", "a", "a"], { sort: "first_seen" }), [
		["b", 1],
		["a", 2],
	]);
	assert.deepEqual(
		frequencies(["\u{10000}", "\ue000", 2, 10, null, true], { sort: "alpha" }),
		[
			[true, 1],
			[null, 1],
			[10, 1],
			[2, 1],
			["\ue000", 1],
			["\u{10000}", 1],
		],
	);
	assert.deepEqual(frequencies(["a", "b"], { limit: 1 }), [["a", 1]]);
	assert.deepEqual(frequencies(["a"], { limit: 0 }), []);
	assert.throws(() => frequencies(["a"], { limit: -1 }), RangeError);
	assert.throws(
		() => frequencies(["a"], { sort: "invalid" as "alpha" }),
		TypeError,
	);
});

test("collections reject non-scalar and non-finite items", () => {
	for (const invalid of [undefined, {}, [], Number.NaN, Infinity]) {
		const items = [invalid] as Scalar[];
		assert.throws(() => frequencies(items), TypeError);
		assert.throws(() => dedupe(items), TypeError);
	}
});

test("dedupe preserves first or last representatives and retained ordering", () => {
	const items = Object.freeze(["A", "B", "a", "b", "C"]);
	assert.deepEqual(dedupe(items), ["A", "B", "a", "b", "C"]);
	assert.deepEqual(dedupe(items, { caseSensitive: false }), ["A", "B", "C"]);
	assert.deepEqual(
		dedupe(["A", "B", "a"], { caseSensitive: false, keepFirst: false }),
		["B", "a"],
	);
	assert.deepEqual(dedupe([1, "1", null, 1, false, null]), [
		1,
		"1",
		null,
		false,
	]);
	assert.deepEqual(dedupe([]), []);
});

test("dedupe lowercases without full folding or Unicode normalization", () => {
	assert.deepEqual(
		dedupe(["\u00c9", "\u00e9", "e\u0301", "\u00df", "ss"], {
			caseSensitive: false,
		}),
		["\u00c9", "e\u0301", "\u00df", "ss"],
	);
});

test("groupCount follows own-property dot paths and first-seen order", () => {
	const records = Object.freeze([
		{ team: { name: "b" } },
		{ team: { name: "a" } },
		{ team: { name: "b" } },
	]);
	assert.deepEqual(groupCount(records, "team.name"), [
		["b", 2],
		["a", 1],
	]);
	assert.deepEqual(
		groupCount([{ value: null }, { value: 1 }, { value: "1" }], "value"),
		[
			[null, 1],
			[1, 1],
			["1", 1],
		],
	);
	assert.deepEqual(groupCount([], "team.name"), []);
});

test("groupCount rejects missing paths, array traversal, and invalid keys", () => {
	for (const key of ["", ".name", "team..name", "team."]) {
		assert.throws(() => groupCount([], key), TypeError);
	}
	assert.throws(() => groupCount([{ value: {} }], "value"), TypeError);
	assert.throws(() => groupCount([{}], "value"), TypeError);
	assert.throws(() => groupCount([{ team: ["a"] }], "team.0"), TypeError);
	assert.throws(
		() => groupCount([Object.create({ value: "a" })], "value"),
		TypeError,
	);
});

test("countOccurrences handles literal overlap and escaped patterns", () => {
	assert.equal(countOccurrences("aaa", "aa"), 1);
	assert.equal(countOccurrences("aaa", "aa", { overlapping: true }), 2);
	assert.equal(countOccurrences("a.a.", "."), 2);
	assert.equal(countOccurrences("", "a"), 0);
	assert.equal(countOccurrences("abc", "z"), 0);
});

test("countOccurrences uses Unicode regex case matching without normalization", () => {
	assert.equal(
		countOccurrences("AaA", "aa", { caseSensitive: false, overlapping: true }),
		2,
	);
	assert.equal(countOccurrences("AaA", "aa"), 0);
	assert.equal(countOccurrences("\u212aKk", "k", { caseSensitive: false }), 3);
	assert.equal(countOccurrences("\u00dfss", "ss", { caseSensitive: false }), 1);
	assert.equal(
		countOccurrences("e\u0301", "\u00e9", { caseSensitive: false }),
		0,
	);
});

test("countOccurrences supports Unicode regex overlap on original code-point boundaries", () => {
	assert.equal(
		countOccurrences("aaa", "a{2}", { regex: true, overlapping: true }),
		2,
	);
	assert.equal(
		countOccurrences("AaA", "a{2}", { regex: true, caseSensitive: false }),
		1,
	);
	assert.equal(
		countOccurrences("\u{1f600}\u{1f600}", "..", {
			regex: true,
			overlapping: true,
		}),
		1,
	);
	assert.equal(countOccurrences("\u{1f600}\u{1f600}", "\u{1f600}"), 2);
});

test("countOccurrences rejects empty, invalid, and zero-width needles", () => {
	assert.throws(() => countOccurrences("abc", ""), TypeError);
	assert.throws(
		() => countOccurrences("abc", "[", { regex: true }),
		SyntaxError,
	);
	for (const needle of ["^", "a*", "(?=a)"]) {
		assert.throws(
			() => countOccurrences("aaa", needle, { regex: true }),
			TypeError,
		);
	}
	assert.throws(() => countOccurrences("", "$", { regex: true }), TypeError);
});

test("graphemeCount distinguishes UTF-16, code points, and clusters", () => {
	for (const [text, expected] of [
		["", { graphemes: 0, utf16Length: 0, codePoints: 0 }],
		["abc", { graphemes: 3, utf16Length: 3, codePoints: 3 }],
		["e\u0301", { graphemes: 1, utf16Length: 2, codePoints: 2 }],
		["\u{1f600}", { graphemes: 1, utf16Length: 2, codePoints: 1 }],
		["\u{1f44b}\u{1f3fd}", { graphemes: 1, utf16Length: 4, codePoints: 2 }],
		["\u{1f1fa}\u{1f1f8}", { graphemes: 1, utf16Length: 4, codePoints: 2 }],
		[
			"\u{1f469}\u200d\u{1f469}\u200d\u{1f467}\u200d\u{1f466}",
			{ graphemes: 1, utf16Length: 11, codePoints: 7 },
		],
	] as const) {
		assert.deepEqual(graphemeCount(text), expected);
	}
});
