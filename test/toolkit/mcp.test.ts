import { afterAll, beforeAll, test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({ name: 'toolkit-regression', version: '1.0.0' });
const protocolErrors: Error[] = [];
client.onerror = (error) => protocolErrors.push(error);
let temporary: string;
let transport: StdioClientTransport;
beforeAll(async () => {
	temporary = await mkdtemp(
		join(dirname(fileURLToPath(import.meta.url)), '.tmp-mcp-'),
	);
	await writeFile(join(temporary, 'items.csv'), 'name\n"a,b"\n"a,b"\nc\n');
	const config = JSON.parse(
		await readFile(new URL('../../.mcp.json', import.meta.url), 'utf8'),
	);
	const server = config.mcpServers['deterministic-toolkit'];
	assert.equal(server.type, 'stdio');
	transport = new StdioClientTransport({
		command: server.command,
		args: server.args,
		cwd: temporary,
		stderr: 'pipe',
	});
	await client.connect(transport);
});
afterAll(async () => {
	await client.close();
	await rm(temporary, { recursive: true, force: true });
});

test('MCP advertises exactly two object-root tools with read-only hints', async () => {
	const { tools } = await client.listTools();
	assert.deepEqual(tools.map((tool) => tool.name).sort(), [
		'collection',
		'text',
	]);
	for (const tool of tools) {
		assert.equal(tool.inputSchema.type, 'object');
		assert.equal(tool.annotations?.readOnlyHint, true);
		assert.equal(tool.annotations?.destructiveHint, false);
	}
});

test('stdio calls execute all six operations and return structured payloads', async () => {
	for (const [name, args, expected] of [
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
			{ op: 'dedupe', items: ['A', 'a', 'B'], caseSensitive: false },
			['A', 'B'],
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
			{
				op: 'grapheme_count',
				text: 'e\u0301\u{1f469}\u200d\u{1f469}\u200d\u{1f467}\u200d\u{1f466}',
			},
			{ graphemes: 2, utf16Length: 13, codePoints: 9 },
		],
	] as const) {
		const result = await client.callTool({ name, arguments: args });
		assert.notEqual(result.isError, true);
		assert.ok(
			result.structuredContent &&
				typeof result.structuredContent === 'object' &&
				'result' in result.structuredContent,
		);
		assert.deepEqual(result.structuredContent.result, expected);
	}
});

test('stdio file input and truncation keep complete counts', async () => {
	const result = await client.callTool({
		name: 'collection',
		arguments: {
			op: 'frequencies',
			path: relative(
				fileURLToPath(new URL('../../', import.meta.url)),
				join(temporary, 'items.csv'),
			),
			format: 'csv',
			column: 'name',
			maxRows: 1,
		},
	});
	assert.deepEqual(result.structuredContent, {
		result: [['a,b', 2]],
		totalRows: 2,
		returnedRows: 1,
		truncated: true,
		reason: 'row_limit',
	});
});

test('SDK validation errors and oversized values cannot escape response bounds', async () => {
	for (const args of [
		{ op: 'invalid'.repeat(5_000) },
		{ op: 'mode', items: 'x'.repeat(20_000) },
		{ op: 'mode', items: ['x'.repeat(20_000)] },
		{ op: 'mode', items: [], extra: 'x'.repeat(20_000) },
	]) {
		const result = await client.callTool({
			name: 'collection',
			arguments: args,
		});
		assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 16 * 1024);
	}
});

test('MCP cancellation releases the operation slot for later calls', async () => {
	const controller = new AbortController();
	const pending = client.callTool(
		{
			name: 'text',
			arguments: {
				op: 'count_occurrences',
				text: `${'a'.repeat(20)}!`.repeat(1_000),
				needle: '(a+)+$|.',
				regex: true,
			},
		},
		undefined,
		{ signal: controller.signal },
	);
	const rejected = assert.rejects(pending);
	const busy = await client.callTool({
		name: 'text',
		arguments: { op: 'grapheme_count', text: 'a' },
	});
	assert.equal(busy.isError, true);
	controller.abort();
	await rejected;
	let recovered = busy;
	for (let attempt = 0; attempt < 100 && recovered.isError; attempt += 1) {
		recovered = await client.callTool({
			name: 'text',
			arguments: { op: 'grapheme_count', text: 'a' },
		});
	}
	assert.notEqual(recovered.isError, true);
	assert.ok(
		recovered.structuredContent &&
			typeof recovered.structuredContent === 'object' &&
			'result' in recovered.structuredContent,
	);
	assert.deepEqual(recovered.structuredContent.result, {
		graphemes: 1,
		utf16Length: 1,
		codePoints: 1,
	});
	assert.deepEqual(protocolErrors, []);
}, 7_000);
