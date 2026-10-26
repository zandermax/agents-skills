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
		hookDirectories: [],
		skills: [],
		agents: [],
		hooks: [],
		listOnly: false,
		hasDestinationArguments: false,
		...overrides,
	};
}

const options = { cwd: "/current", homeDirectory: "/home/tester" };

export type { Artifact, InstallCatalog, ParsedArtifactArguments };
export {
	artifacts,
	assert,
	catalog,
	formatArtifactListing,
	options,
	parsed,
	path,
	resolveArtifactRequest,
	test,
};
