import { lstat, mkdir, readlink, realpath, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type ClientName = "copilot" | "claude" | "agents";

export interface ClientLink {
	readonly client: ClientName;
	readonly source: string;
	readonly destination: string;
	readonly kind: "file" | "directory";
}

export interface InstallOptions {
	readonly clients: readonly ClientName[];
	readonly repoRoot: string;
	readonly homeDirectory: string;
}

export interface InstallResult {
	readonly created: readonly string[];
	readonly existing: readonly string[];
}

const CLIENT_ORDER: readonly ClientName[] = ["copilot", "claude", "agents"];
const CLIENT_VALUES = new Set<ClientName>(CLIENT_ORDER);
const USAGE =
	"Usage: npm run install:clients -- [--client all|copilot|claude|agents]";

export const CLIENT_LINKS: readonly ClientLink[] = [
	{
		client: "copilot",
		source: ".github/agents/executable-planner.agent.md",
		destination: "~/.copilot/agents/executable-planner.agent.md",
		kind: "file",
	},
	{
		client: "copilot",
		source: ".agents/skills/executable-planning",
		destination: "~/.copilot/skills/executable-planning",
		kind: "directory",
	},
	{
		client: "claude",
		source: ".agents/skills/executable-planning",
		destination: "~/.claude/skills/executable-planning",
		kind: "directory",
	},
	{
		client: "agents",
		source: ".agents/skills/executable-planning",
		destination: "~/.agents/skills/executable-planning",
		kind: "directory",
	},
];

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

type ResolvedLink = {
	readonly spec: ClientLink;
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

async function canonicalizeExistingPath(target: string): Promise<string> {
	return normalizeForComparison(await realpath(target));
}

function formatWindowsEperm(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return `${message}. On Windows, enable Developer Mode or grant symlink permission.`;
}

function nodeSymlinkType(kind: ClientLink["kind"]): "file" | "dir" {
	return kind === "directory" ? "dir" : "file";
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
		if (link.spec.kind === "file" && !stats.isFile()) {
			throw new Error(`Source is not a file: ${link.sourcePath}`);
		}
		if (link.spec.kind === "directory" && !stats.isDirectory()) {
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
	const selectedLinks = CLIENT_LINKS.filter((link) =>
		selectedClientSet.has(link.client),
	);

	const resolvedLinks: readonly ResolvedLink[] = selectedLinks.map((spec) => ({
		spec,
		sourcePath: path.resolve(options.repoRoot, spec.source),
		destinationPath: resolveHomeRelativePath(
			options.homeDirectory,
			spec.destination,
		),
	}));

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
				nodeSymlinkType(link.spec.kind),
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
	const clients = parseClientArguments(process.argv.slice(2));
	const scriptPath = fileURLToPath(import.meta.url);
	const repoRoot = path.resolve(path.dirname(scriptPath), "..");
	const homeDirectory = process.env.EXECUTABLE_PLANNING_HOME ?? os.homedir();
	const result = await installClients({ clients, repoRoot, homeDirectory });
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
