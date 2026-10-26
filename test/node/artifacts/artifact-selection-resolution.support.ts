import type { InstallCatalog } from "./artifact-selection.shared.js";
import {
	artifacts,
	assert,
	catalog,
	options,
	parsed,
	path,
	resolveArtifactRequest,
	test,
} from "./artifact-selection.shared.js";

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

test("resolveArtifactRequest supports directory linkMode collections", () => {
	const directoryCatalog: InstallCatalog = {
		collections: [
			{
				name: "copilot",
				artifactKind: "agent",
				source: ".github/agents",
				linkMode: "directory",
				entry: { kind: "file", suffix: ".agent.md" },
			},
		],
		clients: [
			{
				name: "copilot",
				destinations: [{ collection: "copilot", path: "~/.copilot/agents" }],
			},
		],
	};
	const result = resolveArtifactRequest(
		parsed(),
		directoryCatalog,
		artifacts.filter((a) => a.collection === "copilot"),
		{ cwd: "/current", homeDirectory: "/home/tester", repoRoot: "/repo" },
	);
	assert.deepEqual(result.targets, [
		{
			collection: "copilot",
			directory: "/home/tester/.copilot/agents",
			linkMode: "directory",
			sourceDirectory: "/repo/.github/agents",
		},
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
				{ collection: "copilot", directory: "/agents/../../../agents" },
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
