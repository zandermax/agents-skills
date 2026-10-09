import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { createDispatcher } from '../../src/toolkit/dispatch.ts';

test('dispatch returns structured results for every operation', async () => {
	const dispatch = createDispatcher();
	for (const [kind, args, expected] of [
		[
			'collection',
			{ op: 'mode', items: ['b', 'a', 'a', 'b'], top: 2 },
			[
				['b', 2],
				['a', 2],
			],
		],
		[
			'collection',
			{ op: 'frequencies', items: ['b', 'a', 'a'], sort: 'first_seen' },
			[
				['b', 1],
				['a', 2],
			],
		],
		[
			'collection',
			{ op: 'dedupe', items: ['A', 'a'], caseSensitive: false },
			['A'],
		],
		[
			'collection',
			{
				op: 'group_count',
				records: [{ team: { name: 'x' } }, { team: { name: 'x' } }],
				key: 'team.name',
			},
			[['x', 2]],
		],
		[
			'text',
			{ op: 'count_occurrences', text: 'aaa', needle: 'aa', overlapping: true },
			2,
		],
		[
			'text',
			{ op: 'grapheme_count', text: 'e\u0301' },
			{ graphemes: 1, utf16Length: 2, codePoints: 2 },
		],
	] as const) {
		const result = await dispatch(kind, args);
		assert.notEqual(result.isError, true);
		assert.deepEqual(result.structuredContent?.result, expected);
		assert.equal(result.structuredContent?.truncated, false);
	}
});

test('row caps retain complete counts and explicitly report truncation', async () => {
	const result = await createDispatcher()('collection', {
		op: 'frequencies',
		items: ['b', 'a', 'a', 'c'],
		maxRows: 1,
	});
	assert.deepEqual(result.structuredContent, {
		result: [['a', 2]],
		totalRows: 3,
		returnedRows: 1,
		truncated: true,
		reason: 'row_limit',
	});
});

test('byte caps preserve whole values and bound both result representations', async () => {
	const dispatch = createDispatcher();
	const result = await dispatch('collection', {
		op: 'dedupe',
		items: ['a', 'b'.repeat(20_000), 'c'],
	});
	assert.deepEqual(result.structuredContent?.result, ['a']);
	assert.equal(result.structuredContent?.totalRows, 3);
	assert.equal(result.structuredContent?.truncated, true);
	assert.equal(result.structuredContent?.reason, 'byte_limit');
	assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 16 * 1024);
	const hugeFirst = await dispatch('collection', {
		op: 'mode',
		items: ['x'.repeat(20_000)],
	});
	assert.deepEqual(hugeFirst.structuredContent?.result, []);
	assert.equal(hugeFirst.structuredContent?.truncated, true);
});

test('dispatch rejects irrelevant options and over-budget values with bounded errors', async () => {
	const dispatch = createDispatcher();
	for (const args of [
		{ op: 'mode', items: ['a'], regex: true },
		{ op: 'mode', items: ['a'], top: 0 },
		{ op: 'mode', items: ['a'], maxRows: 1001 },
		{ op: 'dedupe', items: ['a'], caseSensitive: 'false' },
		{ op: 'mode', items: Array(100_001).fill(null) },
		{ op: 'x'.repeat(100_000), items: [] },
	]) {
		const result = await dispatch('collection', args);
		assert.equal(result.isError, true);
		assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 16 * 1024);
	}
});

test('regex calls run in isolation and preserve overlap behavior', async () => {
	const result = await createDispatcher()('text', {
		op: 'count_occurrences',
		text: 'aaa',
		needle: 'a{2}',
		regex: true,
		overlapping: true,
	});
	assert.equal(result.isError, undefined);
	assert.equal(result.structuredContent?.result, 2);
});

test('one active operation rejects concurrent work and recovers after cancellation', async () => {
	const dispatch = createDispatcher();
	const controller = new AbortController();
	const pending = dispatch(
		'text',
		{
			op: 'count_occurrences',
			text: `${'a'.repeat(40)}!`,
			needle: '(a+)+$',
			regex: true,
		},
		controller.signal,
	);
	const busy = await dispatch('text', { op: 'grapheme_count', text: 'a' });
	assert.equal(busy.isError, true);
	controller.abort();
	assert.equal((await pending).isError, true);
	const recovered = await dispatch('text', { op: 'grapheme_count', text: 'a' });
	assert.equal(recovered.isError, undefined);
	assert.deepEqual(recovered.structuredContent?.result, {
		graphemes: 1,
		utf16Length: 1,
		codePoints: 1,
	});
});

test('regex deadline terminates pathological matching without wedging later calls', async () => {
	const dispatch = createDispatcher();
	const result = await dispatch('text', {
		op: 'count_occurrences',
		text: `${'a'.repeat(20)}!`.repeat(1_000),
		needle: '(a+)+$|.',
		regex: true,
	});
	assert.equal(result.isError, true);
	assert.match(JSON.stringify(result.content), /timed out/);
	assert.equal(
		(
			await dispatch('text', {
				op: 'count_occurrences',
				text: 'aaa',
				needle: 'aa',
			})
		).structuredContent?.result,
		1,
	);
}, 7_000);
