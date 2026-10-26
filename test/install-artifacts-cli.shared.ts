import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	lstat,
	mkdir,
	mkdtemp,
	readFile,
	readlink,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { type Artifact, discoverArtifacts } from "../src/lib/artifacts.js";
import {
	clientsForCollection,
	destinationCountsForClients,
	expectedLinkCount,
	loadRepositoryCatalog,
	requireArtifact,
	requireClientForCollection,
} from "./helpers/repository-artifacts.js";

const testFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(testFilePath), "..");
const tsxCliPath = path.join(
	projectRoot,
	"node_modules",
	"tsx",
	"dist",
	"cli.mjs",
);
const installerCliPath = path.join(
	projectRoot,
	"scripts",
	"install-artifacts.ts",
);

async function createFixture(label: string): Promise<{
	homeDirectory: string;
	customSkillsDirectory: string;
	customAgentsDirectory: string;
	cleanup: () => Promise<void>;
}> {
	const root = await mkdtemp(path.join(os.tmpdir(), `${label}-`));
	return {
		homeDirectory: path.join(root, "home"),
		customSkillsDirectory: path.join(root, "custom", "skills"),
		customAgentsDirectory: path.join(root, "custom", "agents"),
		cleanup: () => rm(root, { recursive: true, force: true }),
	};
}

function runCli(
	arguments_: readonly string[],
	homeDirectory: string,
	variableName = "AGENTS_SKILLS_HOME",
	operation: "install" | "uninstall" = "install",
) {
	return spawnSync(
		process.execPath,
		[
			tsxCliPath,
			operation === "install"
				? installerCliPath
				: path.join(projectRoot, "scripts", "uninstall-artifacts.ts"),
			...arguments_,
		],
		{
			cwd: projectRoot,
			env: {
				...process.env,
				[variableName]: homeDirectory,
				MEMORY_DIR: path.join(homeDirectory, ".memory"),
			},
			encoding: "utf8",
		},
	);
}

const catalog = await loadRepositoryCatalog();
const repositoryArtifacts = await discoverArtifacts(catalog, projectRoot);
const sampleSkill = requireArtifact(repositoryArtifacts, "skill");
const sampleAgent = requireArtifact(repositoryArtifacts, "agent");
const allClientNames = catalog.clients.map((client) => client.name);

function expectedListingPattern(artifact: Artifact): RegExp {
	const clients = clientsForCollection(catalog, artifact.collection).join(", ");
	const listing = `${artifact.kind} ${artifact.id} [${clients}]`;
	return new RegExp(listing.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

function runNpm(arguments_: readonly string[], homeDirectory: string) {
	return spawnSync("npm", arguments_, {
		cwd: projectRoot,
		env: { ...process.env, EXECUTABLE_PLANNING_HOME: homeDirectory },
		encoding: "utf8",
	});
}

const defaultLinkCount = expectedLinkCount(
	repositoryArtifacts,
	destinationCountsForClients(catalog, allClientNames),
	catalog,
);

export type { Artifact };
export {
	allClientNames,
	assert,
	catalog,
	clientsForCollection,
	createFixture,
	defaultLinkCount,
	destinationCountsForClients,
	discoverArtifacts,
	expectedLinkCount,
	expectedListingPattern,
	fileURLToPath,
	installerCliPath,
	loadRepositoryCatalog,
	lstat,
	mkdir,
	mkdtemp,
	os,
	path,
	projectRoot,
	readFile,
	readlink,
	repositoryArtifacts,
	requireArtifact,
	requireClientForCollection,
	rm,
	runCli,
	runNpm,
	sampleAgent,
	sampleSkill,
	spawnSync,
	symlink,
	test,
	testFilePath,
	tsxCliPath,
	writeFile,
};
