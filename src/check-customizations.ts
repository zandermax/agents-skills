import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateAgents } from "./customizations/agents.js";
import { validateManifests } from "./customizations/manifests.js";
import { validatePlanStatuses } from "./customizations/plan-status.js";
import { validateRepositoryFiles } from "./customizations/repository.js";
import { formatErrorList, relativizeMessage } from "./customizations/shared.js";
import { validateSkills } from "./customizations/skills.js";
import { discoverArtifacts } from "./lib/artifacts/artifacts.js";
import type { InstallCatalog } from "./lib/artifacts/catalog.js";
import { loadInstallCatalog } from "./lib/artifacts/catalog.js";

export async function checkCustomizations(repoRoot: string): Promise<void> {
	const absoluteRepoRoot = path.resolve(repoRoot);
	const errors: string[] = [];

	await validatePlanStatuses(
		absoluteRepoRoot,
		path.join(absoluteRepoRoot, "docs", "plans"),
		errors,
	);
	await validateManifests(absoluteRepoRoot, errors);

	let catalog: InstallCatalog | undefined;
	let artifacts: Awaited<ReturnType<typeof discoverArtifacts>> = [];
	try {
		catalog = await loadInstallCatalog(absoluteRepoRoot);
		artifacts = await discoverArtifacts(catalog, absoluteRepoRoot);
	} catch (error) {
		errors.push(
			relativizeMessage(
				absoluteRepoRoot,
				error instanceof Error ? error.message : String(error),
			),
		);
	}

	const skillHeadings = await validateSkills(
		absoluteRepoRoot,
		catalog,
		artifacts,
		errors,
	);
	await validateAgents(
		absoluteRepoRoot,
		catalog,
		artifacts,
		skillHeadings,
		errors,
	);
	await validateRepositoryFiles(absoluteRepoRoot, errors);

	if (errors.length > 0) {
		throw formatErrorList(errors);
	}
}

async function main(): Promise<void> {
	const repoRoot = process.argv[2] ?? process.cwd();
	await checkCustomizations(repoRoot);
}

if (
	process.argv[1] !== undefined &&
	fileURLToPath(import.meta.url) === process.argv[1]
) {
	main().catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error(message);
		process.exitCode = 1;
	});
}
