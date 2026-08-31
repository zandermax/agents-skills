import {
	lstat,
	mkdir,
	readdir,
	readlink,
	realpath,
	symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Artifact } from "../src/lib/artifacts.js";
import { discoverArtifacts } from "../src/lib/artifacts.js";
import { loadInstallCatalog } from "../src/lib/catalog.js";

export type ClientName = "copilot" | "claude" | "agents";

export interface InstallOptions {
	readonly clients: readonly ClientName[];
	readonly skillDirectories?: readonly string[];
	readonly repoRoot: string;
	readonly homeDirectory: string;
}

export interface InstallArguments {
	readonly clients: readonly ClientName[];
	readonly skillDirectories: readonly string[];
}

export interface InstallResult {
	readonly created: readonly string[];
	readonly existing: readonly string[];
}

const CLIENT_ORDER: readonly ClientName[] = ["copilot", "claude", "agents"];
const CLIENT_VALUES = new Set<ClientName>(CLIENT_ORDER);
const USAGE =
	"Usage: npm run install:clients -- [--client all|copilot|claude|agents] [--skills-dir <path>]";

function normalizeClientSelection(
	clients: readonly ClientName[],
): readonly ClientName[] {
	const selected = new Set<ClientName>(clients);
	return CLIENT_ORDER.filter((client) => selected.has(client));
}

export function parseClientArguments(
	arguments_: readonly string[],
): readonly ClientName[] {
	if (arguments_.length === 0) {
		return CLIENT_ORDER;
	}

	const selected = new Set<ClientName>();

	for (let index = 0; index < arguments_.length; index += 1) {
		const argument = arguments_[index];
		if (argument !== "--client") {
			throw new Error(USAGE);
		}

		const value = arguments_[index + 1];
		if (!value) {
			throw new Error(USAGE);
		}

		if (value === "all") {
			for (const client of CLIENT_ORDER) {
				selected.add(client);
			}
		} else if (CLIENT_VALUES.has(value as ClientName)) {
			selected.add(value as ClientName);
		} else {
			throw new Error(USAGE);
		}

		index += 1;
	}

	if (selected.size === 0) {
		return CLIENT_ORDER;
	}

	return CLIENT_ORDER.filter((client) => selected.has(client));
}

export function parseInstallArguments(
	arguments_: readonly string[],
): InstallArguments {
	if (arguments_.length === 0) {
		return { clients: CLIENT_ORDER, skillDirectories: [] };
	}

	const clientArguments: string[] = [];
	const skillDirectories: string[] = [];
	let hasClientSelection = false;

	for (let index = 0; index < arguments_.length; index += 1) {
		const argument = arguments_[index];
		const value = arguments_[index + 1];

		if (argument === "--client") {
			if (!value) {
				throw new Error(USAGE);
			}
			hasClientSelection = true;
			clientArguments.push(argument, value);
			index += 1;
			continue;
		}

		if (argument === "--skills-dir") {
			if (!value) {
				throw new Error(USAGE);
			}
			skillDirectories.push(value);
			index += 1;
			continue;
		}

		throw new Error(USAGE);
	}

	return {
		clients: hasClientSelection ? parseClientArguments(clientArguments) : [],
		skillDirectories,
	};
}

type ResolvedLink = {
	readonly kind: "file" | "directory";
	readonly sourcePath: string;
	readonly destinationPath: string;
};

function resolveHomeRelativePath(
	homeDirectory: string,
	destination: string,
): string {
	if (!destination.startsWith("~/")) {
		throw new Error(`Invalid destination mapping: ${destination}`);
	}
	return path.resolve(homeDirectory, destination.slice(2));
}

function normalizeForComparison(target: string): string {
	return path.normalize(path.resolve(target));
}

function deduplicateResolvedLinks(
	links: readonly ResolvedLink[],
): readonly ResolvedLink[] {
	const linksByDestination = new Map<string, ResolvedLink>();

	for (const link of links) {
		const destination = normalizeForComparison(link.destinationPath);
		const existing = linksByDestination.get(destination);
		if (existing === undefined) {
			linksByDestination.set(destination, link);
			continue;
		}

		if (
			existing.kind !== link.kind ||
			normalizeForComparison(existing.sourcePath) !==
			normalizeForComparison(link.sourcePath)
		) {
			throw new Error(`Conflicting destination mappings: ${destination}`);
		}
	}

	return Array.from(linksByDestination.values());
}

async function canonicalizeExistingPath(target: string): Promise<string> {
	return normalizeForComparison(await realpath(target));
}

function formatWindowsEperm(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return `${message}. On Windows, enable Developer Mode or grant symlink permission.`;
}

function nodeSymlinkType(kind: ResolvedLink["kind"]): "file" | "dir" {
	return kind === "directory" ? "dir" : "file";
}

async function resolveCatalogClientLinks(
	repoRoot: string,
	homeDirectory: string,
	selectedClients: ReadonlySet<ClientName>,
): Promise<readonly ResolvedLink[]> {
	if (selectedClients.size === 0) {
		return [];
	}

	const catalog = await loadInstallCatalog(repoRoot);
	const artifacts = await discoverArtifacts(catalog, repoRoot);
	const artifactsByCollection = new Map<string, Artifact[]>();
	for (const artifact of artifacts) {
		const existing = artifactsByCollection.get(artifact.collection);
		if (existing === undefined) {
			artifactsByCollection.set(artifact.collection, [artifact]);
		} else {
			existing.push(artifact);
		}
	}

	const links: ResolvedLink[] = [];
	for (const client of catalog.clients) {
		if (!selectedClients.has(client.name as ClientName)) {
			continue;
		}
		for (const destination of client.destinations) {
			const collectionArtifacts =
				artifactsByCollection.get(destination.collection) ?? [];
			for (const artifact of collectionArtifacts) {
				links.push({
					kind: artifact.entryKind,
					sourcePath: artifact.sourcePath,
					destinationPath: resolveHomeRelativePath(
						homeDirectory,
						`${destination.path}/${artifact.destinationName}`,
					),
				});
			}
		}
	}

	return links;
}

async function resolveCustomSkillLinks(
	repoRoot: string,
	skillDirectories: readonly string[],
): Promise<readonly ResolvedLink[]> {
	if (skillDirectories.length === 0) {
		return [];
	}

	const skillsRoot = path.join(repoRoot, ".agents", "skills");
	let entries: readonly import("node:fs").Dirent[];
	try {
		entries = await readdir(skillsRoot, { withFileTypes: true });
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			throw new Error(`No built skills found: ${skillsRoot}`);
		}
		throw error;
	}

	const skillNames: string[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		try {
			const skillFile = await lstat(
				path.join(skillsRoot, entry.name, "SKILL.md"),
			);
			if (skillFile.isFile()) {
				skillNames.push(entry.name);
			}
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "ENOENT"
			) {
				continue;
			}
			throw error;
		}
	}
	skillNames.sort();
	if (skillNames.length === 0) {
		throw new Error(`No built skills found: ${skillsRoot}`);
	}

	const destinationRoots = Array.from(
		new Set(skillDirectories.map((directory) => path.resolve(directory))),
	);

	return destinationRoots.flatMap((destinationRoot) =>
		skillNames.map((skillName) => ({
			kind: "directory" as const,
			sourcePath: path.join(skillsRoot, skillName),
			destinationPath: path.join(destinationRoot, skillName),
		})),
	);
}

async function classifyDestination(
	resolvedLink: ResolvedLink,
): Promise<"create" | "existing"> {
	const stats = await lstat(resolvedLink.destinationPath).catch((error) => {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return null;
		}
		throw error;
	});

	if (stats === null) {
		return "create";
	}

	if (!stats.isSymbolicLink()) {
		throw new Error(
			`Destination exists and is not a symlink: ${resolvedLink.destinationPath}`,
		);
	}

	const currentTarget = await readlink(resolvedLink.destinationPath);
	const absoluteTargetPath = path.resolve(
		path.dirname(resolvedLink.destinationPath),
		currentTarget,
	);

	let destinationCanonical: string;
	try {
		destinationCanonical = await canonicalizeExistingPath(absoluteTargetPath);
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			throw new Error(
				`Destination symlink is broken: ${resolvedLink.destinationPath} -> ${currentTarget}`,
			);
		}
		throw error;
	}

	const expectedCanonical = await canonicalizeExistingPath(
		resolvedLink.sourcePath,
	);
	if (destinationCanonical !== expectedCanonical) {
		throw new Error(
			`Destination symlink points elsewhere: ${resolvedLink.destinationPath} -> ${currentTarget}`,
		);
	}

	return "existing";
}

async function validateSource(link: ResolvedLink): Promise<void> {
	try {
		const stats = await lstat(link.sourcePath);
		if (link.kind === "file" && !stats.isFile()) {
			throw new Error(`Source is not a file: ${link.sourcePath}`);
		}
		if (link.kind === "directory" && !stats.isDirectory()) {
			throw new Error(`Source is not a directory: ${link.sourcePath}`);
		}
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			throw new Error(`Source is missing: ${link.sourcePath}`);
		}
		throw error;
	}
}

export async function installClients(
	options: InstallOptions,
): Promise<InstallResult> {
	const selectedClients = normalizeClientSelection(options.clients);
	const selectedClientSet = new Set<ClientName>(selectedClients);
	const clientLinks = await resolveCatalogClientLinks(
		options.repoRoot,
		options.homeDirectory,
		selectedClientSet,
	);
	const customSkillLinks = await resolveCustomSkillLinks(
		options.repoRoot,
		options.skillDirectories ?? [],
	);
	const resolvedLinks = deduplicateResolvedLinks([
		...clientLinks,
		...customSkillLinks,
	]);

	const created: string[] = [];
	const existing: string[] = [];
	const errors: string[] = [];
	const actions: Array<{ link: ResolvedLink; action: "create" | "existing" }> =
		[];

	for (const link of resolvedLinks) {
		try {
			await validateSource(link);
			const action = await classifyDestination(link);
			actions.push({ link, action });
		} catch (error) {
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}

	if (errors.length > 0) {
		throw new Error(`Install validation failed:\n- ${errors.join("\n- ")}`);
	}

	for (const { link, action } of actions) {
		if (action === "existing") {
			existing.push(link.destinationPath);
			continue;
		}

		await mkdir(path.dirname(link.destinationPath), { recursive: true });
		try {
			await symlink(
				link.sourcePath,
				link.destinationPath,
				nodeSymlinkType(link.kind),
			);
		} catch (error) {
			if (
				typeof process !== "undefined" &&
				process.platform === "win32" &&
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "EPERM"
			) {
				throw new Error(formatWindowsEperm(error));
			}
			throw error;
		}
		created.push(link.destinationPath);
	}

	return {
		created,
		existing,
	};
}

function printResult(result: InstallResult): void {
	for (const destination of result.created) {
		console.log(`created ${destination}`);
	}
	for (const destination of result.existing) {
		console.log(`existing ${destination}`);
	}
	console.log(
		`summary created=${result.created.length} existing=${result.existing.length}`,
	);
}

async function runCli(): Promise<void> {
	const parsedArguments = parseInstallArguments(process.argv.slice(2));
	const scriptPath = fileURLToPath(import.meta.url);
	const repoRoot = path.resolve(path.dirname(scriptPath), "..");
	const homeDirectory = process.env.EXECUTABLE_PLANNING_HOME ?? os.homedir();
	const skillDirectories = parsedArguments.skillDirectories.map((directory) =>
		path.resolve(process.cwd(), directory),
	);
	const result = await installClients({
		clients: parsedArguments.clients,
		skillDirectories,
		repoRoot,
		homeDirectory,
	});
	printResult(result);
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	runCli().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
