import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import type { ParsedArtifactArguments } from "../src/lib/artifact-arguments.js";
import {
	formatArtifactListing,
	resolveArtifactRequest,
} from "../src/lib/artifact-selection.js";
import type { Artifact } from "../src/lib/artifacts.js";
import type { InstallCatalog } from "../src/lib/catalog.js";

const catalog: InstallCatalog = {
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
		},
		{
			name: "claude",
			artifactKind: "agent",
			source: ".claude/agents",
			entry: { kind: "file", suffix: ".md" },
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
			name: "claude",
			destinations: [
				{ collection: "skills", path: "~/.claude/skills" },
				{ collection: "claude", path: "~/.claude/agents" },
			],
		},
	],
};

const artifacts: readonly Artifact[] = [
	{
		kind: "skill",
		id: "planning",
		name: "planning",
		collection: "skills",
		sourcePath: "/repo/.agents/skills/planning",
		destinationName: "planning",
		entryKind: "directory",
	},
	{
		kind: "skill",
		id: "reviewing",
		name: "reviewing",
		collection: "skills",
		sourcePath: "/repo/.agents/skills/reviewing",
		destinationName: "reviewing",
		entryKind: "directory",
	},
	{
		kind: "agent",
		id: "copilot:planner",
		name: "planner",
		collection: "copilot",
		sourcePath: "/repo/.github/agents/planner.agent.md",
		destinationName: "planner.agent.md",
		entryKind: "file",
	},
	{
		kind: "agent",
		id: "claude:reviewer",
		name: "reviewer",
		collection: "claude",
		sourcePath: "/repo/.claude/agents/reviewer.md",
		destinationName: "reviewer.md",
		entryKind: "file",
	},
];

function parsed(
	overrides: Partial<ParsedArtifactArguments> = {},
): ParsedArtifactArguments {
	return {
		clients: [],
		skillDirectories: [],
		agentDirectories: [],
		skills: [],
		agents: [],
		listOnly: false,
		hasDestinationArguments: false,
		...overrides,
	};
}

const options = { cwd: "/current", homeDirectory: "/home/tester" };

test("resolveArtifactRequest defaults to all artifacts and catalog targets", () => {
	const result = resolveArtifactRequest(parsed(), catalog, artifacts, options);

	assert.deepEqual(result.artifacts, artifacts);
	assert.deepEqual(result.targets, [
		{ collection: "skills", directory: "/home/tester/.copilot/skills" },
		{ collection: "copilot", directory: "/home/tester/.copilot/agents" },
		{ collection: "skills", directory: "/home/tester/.claude/skills" },
		{ collection: "claude", directory: "/home/tester/.claude/agents" },
	]);
});

test("resolveArtifactRequest custom destinations suppress catalog defaults", () => {
	const result = resolveArtifactRequest(
		parsed({
			skillDirectories: ["relative-skills"],
			agentDirectories: [
				{ collection: "copilot", directory: "/custom/agents" },
			],
			hasDestinationArguments: true,
		}),
		catalog,
		artifacts,
		options,
	);

	assert.deepEqual(result.targets, [
		{ collection: "skills", directory: "/current/relative-skills" },
		{ collection: "copilot", directory: "/custom/agents" },
	]);
});

test("resolveArtifactRequest combines explicit clients and custom targets", () => {
	const result = resolveArtifactRequest(
		parsed({
			clients: ["claude"],
			skillDirectories: ["~/shared-skills"],
			hasDestinationArguments: true,
		}),
		catalog,
		artifacts,
		options,
	);

	assert.deepEqual(result.targets, [
		{ collection: "skills", directory: "/home/tester/.claude/skills" },
		{ collection: "claude", directory: "/home/tester/.claude/agents" },
		{ collection: "skills", directory: "/home/tester/shared-skills" },
	]);
});

test("resolveArtifactRequest --client all selects all catalog targets", () => {
	const result = resolveArtifactRequest(
		parsed({ clients: ["all"], hasDestinationArguments: true }),
		catalog,
		artifacts,
		options,
	);

	assert.deepEqual(result.targets, [
		{ collection: "skills", directory: "/home/tester/.copilot/skills" },
		{ collection: "copilot", directory: "/home/tester/.copilot/agents" },
		{ collection: "skills", directory: "/home/tester/.claude/skills" },
		{ collection: "claude", directory: "/home/tester/.claude/agents" },
	]);
});

test("resolveArtifactRequest applies skill and agent selectors", () => {
	const result = resolveArtifactRequest(
		parsed({ skills: ["reviewing"], agents: ["copilot:planner"] }),
		catalog,
		artifacts,
		options,
	);

	assert.deepEqual(result.artifacts, [artifacts[1], artifacts[2]]);
});

test("resolveArtifactRequest rejects unknown selected IDs", () => {
	assert.throws(
		() =>
			resolveArtifactRequest(
				parsed({ skills: ["unknown"] }),
				catalog,
				artifacts,
				options,
			),
		/unknown skill: unknown/,
	);
	assert.throws(
		() =>
			resolveArtifactRequest(
				parsed({ agents: ["copilot:unknown"] }),
				catalog,
				artifacts,
				options,
			),
		/unknown agent: copilot:unknown/,
	);
});

test("resolveArtifactRequest rejects unknown clients and agent directory collections", () => {
	assert.throws(
		() =>
			resolveArtifactRequest(
				parsed({ clients: ["unknown"], hasDestinationArguments: true }),
				catalog,
				artifacts,
				options,
			),
		/unknown client: unknown/,
	);
	assert.throws(
		() =>
			resolveArtifactRequest(
				parsed({
					agentDirectories: [{ collection: "unknown", directory: "/agents" }],
					hasDestinationArguments: true,
				}),
				catalog,
				artifacts,
				options,
			),
		/unknown agent collection: unknown/,
	);
});

test("resolveArtifactRequest rejects selected agent without an exact format target", () => {
	assert.throws(
		() =>
			resolveArtifactRequest(
				parsed({
					clients: ["claude"],
					agents: ["copilot:planner"],
					hasDestinationArguments: true,
				}),
				catalog,
				artifacts,
				options,
			),
		/copilot:planner.*copilot/i,
	);
});

test("resolveArtifactRequest deduplicates normalized targets", () => {
	const result = resolveArtifactRequest(
		parsed({
			skillDirectories: ["./skills", "skills"],
			agentDirectories: [
				{ collection: "copilot", directory: "/agents/../agents" },
			],
			hasDestinationArguments: true,
		}),
		catalog,
		artifacts,
		options,
	);

	assert.deepEqual(result.targets, [
		{ collection: "skills", directory: path.normalize("/current/skills") },
		{ collection: "copilot", directory: "/agents" },
	]);
});

test("resolveArtifactRequest rejects two collections mapped to one directory", () => {
	assert.throws(
		() =>
			resolveArtifactRequest(
				parsed({
					skillDirectories: ["/shared"],
					agentDirectories: [{ collection: "copilot", directory: "/shared" }],
					hasDestinationArguments: true,
				}),
				catalog,
				artifacts,
				options,
			),
		/conflicting.*\/shared/i,
	);
});

test("resolveArtifactRequest listOnly produces no targets", () => {
	const result = resolveArtifactRequest(
		parsed({ listOnly: true }),
		catalog,
		artifacts,
		options,
	);
	assert.deepEqual(result.artifacts, artifacts);
	assert.deepEqual(result.targets, []);
});

test("formatArtifactListing lists each artifact once with compatible clients in catalog order", () => {
	assert.strictEqual(
		formatArtifactListing(catalog, artifacts),
		[
			"skill planning [copilot, claude]",
			"skill reviewing [copilot, claude]",
			"agent copilot:planner [copilot]",
			"agent claude:reviewer [claude]",
		].join("\n"),
	);
});
