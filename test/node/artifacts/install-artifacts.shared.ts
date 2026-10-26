import assert from "node:assert/strict";
import {
	lstat,
	mkdir,
	mkdtemp,
	readlink,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { ArtifactRequest } from "../../../src/lib/artifacts/artifact-selection.js";
import {
	buildArtifactLinks,
	installArtifacts,
	type ResolvedLink,
	uninstallArtifacts,
} from "../../../src/lib/artifacts/install-artifacts.js";

async function createFixture(label: string): Promise<{
	root: string;
	sources: { skill: string; agent: string };
	cleanup: () => Promise<void>;
}> {
	const root = await mkdtemp(path.join(os.tmpdir(), `${label}-`));
	const skill = path.join(root, "sources", "planning");
	const agent = path.join(root, "sources", "planner.agent.md");
	await mkdir(skill, { recursive: true });
	await writeFile(path.join(skill, "SKILL.md"), "# Planning\n", "utf8");
	await writeFile(agent, "# Planner\n", "utf8");
	return {
		root,
		sources: { skill, agent },
		cleanup: () => rm(root, { recursive: true, force: true }),
	};
}

async function assertLinkPointsTo(
	destination: string,
	source: string,
): Promise<void> {
	assert.equal((await lstat(destination)).isSymbolicLink(), true);
	const target = await readlink(destination);
	assert.equal(path.resolve(path.dirname(destination), target), source);
}

function request(
	root: string,
	sources: { skill: string; agent: string },
): ArtifactRequest {
	return {
		listOnly: false,
		artifacts: [
			{
				kind: "skill",
				id: "planning",
				name: "planning",
				collection: "skills",
				sourcePath: sources.skill,
				destinationName: "planning",
				entryKind: "directory",
			},
			{
				kind: "agent",
				id: "copilot:planner",
				name: "planner",
				collection: "copilot",
				sourcePath: sources.agent,
				destinationName: "planner.agent.md",
				entryKind: "file",
			},
		],
		targets: [
			{ collection: "skills", directory: path.join(root, "skills") },
			{ collection: "copilot", directory: path.join(root, "agents") },
		],
	};
}

export type { ArtifactRequest, ResolvedLink };
export {
	assert,
	assertLinkPointsTo,
	buildArtifactLinks,
	createFixture,
	installArtifacts,
	lstat,
	mkdir,
	mkdtemp,
	os,
	path,
	readlink,
	request,
	rm,
	symlink,
	test,
	uninstallArtifacts,
	writeFile,
};
