import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadInstallCatalog, parseInstallCatalog } from "../src/lib/catalog.js";

const fixtureRepoRoot = path.resolve("test/fixtures/catalog/repo");
const testFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(testFilePath), "..");

function createValidCatalog(): Record<string, unknown> {
	return {
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
			{
				name: "custom-directory",
				artifactKind: "agent",
				source: ".custom-directory",
				entry: { kind: "directory", marker: "AGENT.md" },
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
			{
				name: "custom-directory",
				destinations: [
					{
						collection: "custom-directory",
						path: "~/.directory-client/agents",
					},
				],
			},
		],
	};
}

function expectCatalogError(
	value: unknown,
	...patterns: readonly RegExp[]
): void {
	assert.throws(
		() => {
			parseInstallCatalog(value, "install-catalog.json", fixtureRepoRoot);
		},
		(error: unknown) => {
			const message = String(error);
			for (const pattern of patterns) {
				assert.match(message, pattern);
			}
			return true;
		},
	);
}

test("parseInstallCatalog preserves order and returns immutable values", () => {
	const catalog = parseInstallCatalog(
		createValidCatalog(),
		"install-catalog.json",
		fixtureRepoRoot,
	);

	assert.deepEqual(
		catalog.collections.map((collection) => collection.name),
		["skills", "copilot", "custom-directory"],
	);
	assert.deepEqual(
		catalog.clients.map((client) => client.name),
		["copilot", "custom-directory"],
	);
	assert.deepEqual(catalog.collections[0]?.entry, {
		kind: "directory",
		marker: "SKILL.md",
	});
	assert.deepEqual(catalog.collections[1]?.entry, {
		kind: "file",
		suffix: ".agent.md",
	});
	assert.equal(catalog.collections[1]?.validation, "copilot-agent");
	assert.ok(Object.isFrozen(catalog));
	assert.ok(Object.isFrozen(catalog.collections));
	assert.ok(Object.isFrozen(catalog.collections[0]));
	assert.ok(Object.isFrozen(catalog.collections[0]?.entry));
	assert.ok(Object.isFrozen(catalog.clients));
	assert.ok(Object.isFrozen(catalog.clients[0]?.destinations));
	assert.ok(Object.isFrozen(catalog.clients[0]?.destinations[0]));
});

test("parseInstallCatalog aggregates closed-schema and primitive errors", () => {
	const catalog = createValidCatalog();
	catalog.unexpected = true;
	const collections = catalog.collections as Array<Record<string, unknown>>;
	collections[0] = { ...collections[0], extra: true };
	const clients = catalog.clients as Array<Record<string, unknown>>;
	clients[0] = { ...clients[0], name: 42 };

	expectCatalogError(
		catalog,
		/install-catalog\.json/,
		/catalog\.unexpected/,
		/collections\[0\]\.extra/,
		/clients\[0\]\.name.*string/i,
	);
});

test("parseInstallCatalog requires unique kebab-case collection and client names", () => {
	const catalog = createValidCatalog();
	const collections = catalog.collections as Array<Record<string, unknown>>;
	collections[1] = { ...collections[1], name: "skills" };
	collections[2] = { ...collections[2], name: "Directory Agents" };
	const clients = catalog.clients as Array<Record<string, unknown>>;
	clients.push({ name: "copilot", destinations: [] });

	expectCatalogError(
		catalog,
		/collections\[1\]\.name.*duplicate/i,
		/collections\[2\]\.name.*kebab/i,
		/clients\[2\]\.name.*duplicate/i,
	);
});

test("parseInstallCatalog closes artifact, entry, and validation strategies", () => {
	const catalog = createValidCatalog();
	const collections = catalog.collections as Array<Record<string, unknown>>;
	collections[0] = {
		...collections[0],
		artifactKind: "plugin",
		entry: { kind: "directory", marker: "OTHER.md", suffix: ".bad" },
	};
	collections[1] = {
		...collections[1],
		entry: { kind: "archive", suffix: ".agent.md" },
		validation: "unknown-agent",
	};

	expectCatalogError(
		catalog,
		/collections\[0\]\.artifactKind.*skill.*agent/i,
		/collections\[0\]\.entry\.suffix.*unknown/i,
		/collections\[1\]\.entry\.kind.*directory.*file/i,
		/collections\[1\]\.validation.*copilot-agent/i,
	);
});

test("parseInstallCatalog enforces the Agent Skills collection rule", () => {
	const catalog = createValidCatalog();
	const collections = catalog.collections as Array<Record<string, unknown>>;
	collections[0] = {
		...collections[0],
		entry: { kind: "directory", marker: "skill.md" },
	};

	expectCatalogError(catalog, /collections\[0\]\.entry.*SKILL\.md/);
});

test("parseInstallCatalog requires confined existing collection sources", () => {
	const catalog = createValidCatalog();
	const collections = catalog.collections as Array<Record<string, unknown>>;
	collections[0] = { ...collections[0], source: "../outside" };
	collections[1] = { ...collections[1], source: ".github/missing" };

	expectCatalogError(
		catalog,
		/collections\[0\]\.source.*inside/i,
		/collections\[1\]\.source.*exist|missing/i,
	);
});

test("parseInstallCatalog validates destinations and collection references", () => {
	const catalog = createValidCatalog();
	const clients = catalog.clients as Array<Record<string, unknown>>;
	clients[0] = {
		...clients[0],
		destinations: [
			{ collection: "missing", path: "/tmp/agents" },
			{ collection: "skills", path: "~/.same" },
			{ collection: "copilot", path: "~/.same" },
		],
	};

	expectCatalogError(
		catalog,
		/clients\[0\]\.destinations\[0\]\.collection.*unknown/i,
		/clients\[0\]\.destinations\[0\]\.path.*~\//,
		/clients\[0\]\.destinations\[2\]\.path.*duplicate/i,
	);
});

test("parseInstallCatalog rejects duplicate destinations across clients", () => {
	const catalog = createValidCatalog();
	const clients = catalog.clients as Array<Record<string, unknown>>;
	clients[1] = {
		...clients[1],
		destinations: [
			{ collection: "custom-directory", path: "~/.copilot/skills" },
		],
	};

	expectCatalogError(
		catalog,
		/clients\[1\]\.destinations\[0\]\.path.*duplicate/i,
	);
});

test("parseInstallCatalog rejects agent collections mapped to another client format", () => {
	const catalog = createValidCatalog();
	const clients = catalog.clients as Array<Record<string, unknown>>;
	const firstClient = clients[0];
	assert.ok(firstClient);
	clients[0] = {
		...firstClient,
		destinations: [
			...(firstClient.destinations as readonly unknown[]),
			{
				collection: "custom-directory",
				path: "~/.copilot/directory-agents",
			},
		],
	};

	expectCatalogError(
		catalog,
		/clients\[0\]\.destinations\[2\]\.collection.*format.*copilot/i,
	);
});

test("loadInstallCatalog reads and validates the repository catalog", async () => {
	const catalog = await loadInstallCatalog(fixtureRepoRoot);

	assert.equal(catalog.collections.length, 3);
	assert.equal(catalog.clients.length, 2);
});

test("loadInstallCatalog validates the real repository catalog", async () => {
	const catalog = await loadInstallCatalog(repoRoot);

	assert.deepEqual(
		catalog.collections.map((collection) => collection.name),
		["skills", "copilot"],
	);
	assert.deepEqual(
		catalog.clients.map((client) => client.name),
		["copilot", "claude", "agents"],
	);
});
