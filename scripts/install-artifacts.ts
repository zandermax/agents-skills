import { realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildMemoryLinks } from "../skills/remember-that/scripts/register-memory.js";
import { parseArtifactArguments } from "../src/lib/artifact-arguments.js";
import {
	formatArtifactListing,
	resolveArtifactRequest,
} from "../src/lib/artifact-selection.js";
import { discoverArtifacts } from "../src/lib/artifacts.js";
import { loadInstallCatalog } from "../src/lib/catalog.js";
import {
	buildArtifactLinks,
	installArtifacts,
	uninstallArtifacts,
} from "../src/lib/install-artifacts.js";
import { promptClientSelection } from "../src/lib/interactive-menu.js";
import { buildLegacyLinks } from "./install-artifacts-legacy.js";

function printResult(
	result: Awaited<ReturnType<typeof installArtifacts>>,
): void {
	for (const destination of result.created) {
		console.log(`created ${destination}`);
	}
	for (const destination of result.repaired) {
		console.log(`repaired ${destination}`);
	}
	for (const destination of result.removed) {
		console.log(`removed ${destination}`);
	}
	for (const destination of result.existing) {
		console.log(`existing ${destination}`);
	}
	console.log(
		`summary created=${result.created.length} repaired=${result.repaired.length} removed=${result.removed.length} existing=${result.existing.length}`,
	);
}

export async function runCli(
	arguments_: readonly string[],
	operation: "install" | "uninstall" = "install",
): Promise<void> {
	const scriptPath = fileURLToPath(import.meta.url);
	const repoRoot = path.resolve(path.dirname(scriptPath), "..");
	const catalog = await loadInstallCatalog(repoRoot);
	const artifacts = await discoverArtifacts(catalog, repoRoot);
	const parsed = parseArtifactArguments(arguments_);

	if (parsed.listOnly) {
		console.log(formatArtifactListing(catalog, artifacts));
		return;
	}

	let parsedClients = parsed.clients;
	const isInteractive =
		operation === "install" &&
		!parsed.listOnly &&
		parsed.clients.length === 0 &&
		!parsed.hasDestinationArguments &&
		parsed.skills.length === 0 &&
		parsed.agents.length === 0 &&
		parsed.hooks.length === 0 &&
		Boolean(process.stdin.isTTY && process.stdout.isTTY);

	if (isInteractive) {
		parsedClients = await promptClientSelection();
	}

	const effectiveParsed =
		parsedClients.length > 0 && parsed.clients.length === 0
			? {
					...parsed,
					clients: parsedClients,
					hasDestinationArguments: true,
				}
			: parsed;

	const homeDirectory =
		process.env.AGENTS_SKILLS_HOME ??
		process.env.EXECUTABLE_PLANNING_HOME ??
		os.homedir();
	const request = resolveArtifactRequest(effectiveParsed, catalog, artifacts, {
		cwd: process.cwd(),
		homeDirectory,
		repoRoot,
	});
	const includeMemory =
		parsed.skills.length === 0 &&
		parsed.agents.length === 0 &&
		parsed.hooks.length === 0;
	const memoryRoot =
		process.env.MEMORY_DIR ?? path.join(homeDirectory, ".memory");
	const memoryLinks = includeMemory
		? await buildMemoryLinks(
				memoryRoot,
				request.targets
					.filter((target) => target.collection === "skills")
					.map((target) => target.directory),
			)
		: [];
	const links = [...buildArtifactLinks(request), ...memoryLinks];
	const cleanLegacyDiscovery =
		includeMemory &&
		(!parsed.hasDestinationArguments ||
			parsed.clients.includes("all") ||
			["skills", "agents"].every((directory) =>
				request.targets.some(
					(target) =>
						target.directory === path.join(homeDirectory, ".claude", directory),
				),
			));
	const { roots: legacyRoots, artifacts: legacyArtifactLinks } =
		buildLegacyLinks(
			request,
			repoRoot,
			homeDirectory,
			includeMemory,
			cleanLegacyDiscovery,
		);
	const result =
		operation === "install"
			? await installArtifacts(links, [repoRoot], legacyRoots)
			: undefined;
	const removed: string[] = [...(result?.removed ?? [])];
	if (operation === "uninstall") {
		for (const legacy of legacyRoots)
			removed.push(...(await uninstallArtifacts([legacy], [repoRoot])));
		for (const legacy of legacyArtifactLinks)
			removed.push(...(await uninstallArtifacts([legacy], [repoRoot])));
	}
	if (cleanLegacyDiscovery) {
		const legacyEntries = [
			...request.artifacts.flatMap((artifact) =>
				artifact.kind === "skill"
					? [".copilot/skills", ".agents/skills"].flatMap((directory) => [
							{
								kind: artifact.entryKind,
								sourcePath: artifact.sourcePath,
								destinationPath: path.join(
									homeDirectory,
									directory,
									artifact.destinationName,
								),
							},
							{
								kind: artifact.entryKind,
								sourcePath: path.join(
									repoRoot,
									".agents/skills",
									artifact.name,
								),
								destinationPath: path.join(
									homeDirectory,
									directory,
									artifact.destinationName,
								),
							},
						])
					: artifact.kind === "agent"
						? [".github/agents", ".claude/agents", "agents"].map(
								(directory) => ({
									kind: artifact.entryKind,
									sourcePath: path.join(
										repoRoot,
										directory,
										artifact.destinationName,
									),
									destinationPath: path.join(
										homeDirectory,
										".copilot/agents",
										artifact.destinationName,
									),
								}),
							)
						: [],
			),
			...memoryLinks.flatMap((link) =>
				[".copilot/skills", ".agents/skills"].map((directory) => ({
					...link,
					destinationPath: path.join(
						homeDirectory,
						directory,
						path.basename(link.sourcePath),
					),
				})),
			),
		];
		const activeDirectories = await Promise.all(
			request.targets.map((target) =>
				realpath(target.directory).catch((error: unknown) => {
					if ((error as NodeJS.ErrnoException).code === "ENOENT")
						return undefined;
					throw error;
				}),
			),
		);
		for (const legacy of legacyEntries) {
			const legacyDirectory = await realpath(
				path.dirname(legacy.destinationPath),
			).catch((error: unknown) => {
				if ((error as NodeJS.ErrnoException).code === "ENOENT")
					return undefined;
				throw error;
			});
			if (
				legacyDirectory !== undefined &&
				activeDirectories.includes(legacyDirectory)
			)
				continue;
			removed.push(...(await uninstallArtifacts([legacy], [repoRoot])));
		}
	}
	if (operation === "uninstall") {
		removed.push(...(await uninstallArtifacts(links, [repoRoot])));
		console.log(`summary removed=${removed.length}`);
		return;
	}
	if (result !== undefined) printResult({ ...result, removed });
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	runCli(process.argv.slice(2)).catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
