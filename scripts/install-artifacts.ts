import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
} from "../src/lib/install-artifacts.js";
import { promptClientSelection } from "../src/lib/interactive-menu.js";

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

export async function runCli(arguments_: readonly string[]): Promise<void> {
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

	const request = resolveArtifactRequest(effectiveParsed, catalog, artifacts, {
		cwd: process.cwd(),
		homeDirectory:
			process.env.AGENTS_SKILLS_HOME ??
			process.env.EXECUTABLE_PLANNING_HOME ??
			os.homedir(),
		repoRoot,
	});
	const legacyMemoryLinks = request.targets
		.filter(
			(target) =>
				target.collection === "skills" && target.linkMode !== "directory",
		)
		.map((target) => path.join(target.directory, "memory"));
	printResult(
		await installArtifacts(buildArtifactLinks(request), legacyMemoryLinks),
	);
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
