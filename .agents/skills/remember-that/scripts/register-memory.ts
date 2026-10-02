import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "../../../../src/lib/frontmatter.ts";
import {
	installArtifacts,
	type ResolvedLink,
	uninstallArtifacts,
} from "../../../../src/lib/install-artifacts.ts";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));

function isWithin(root: string, candidate: string): boolean {
	const relative = path.relative(root, candidate);
	return (
		relative === "" ||
		(relative !== ".." &&
			!relative.startsWith(`..${path.sep}`) &&
			!path.isAbsolute(relative))
	);
}

export async function buildMemoryLinks(
	memoryDirectory: string,
	skillsDirectories: readonly string[],
	topic?: string,
): Promise<readonly ResolvedLink[]> {
	const root = await realpath(memoryDirectory).catch((error: unknown) => {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw error;
	});
	if (root === undefined) {
		if (topic !== undefined)
			throw new Error(`Memory directory is missing: ${memoryDirectory}`);
		return [];
	}
	if (isWithin(await realpath(repositoryRoot), root))
		throw new Error("Private memory must be outside the public repository");
	if (topic !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*-notes$/.test(topic))
		throw new Error(`Invalid memory topic: ${topic}`);
	const entries = await readdir(root, { withFileTypes: true });
	const names = entries
		.filter(
			(entry) =>
				entry.isDirectory() && (topic === undefined || entry.name === topic),
		)
		.map((entry) => entry.name)
		.sort();
	if (topic !== undefined && names.length === 0)
		throw new Error(`Memory topic is missing: ${topic}`);
	const links: ResolvedLink[] = [];
	for (const name of names) {
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-notes$/.test(name)) continue;
		const sourcePath = path.join(memoryDirectory, name);
		const skillPath = path.join(sourcePath, "SKILL.md");
		const parsed = parseFrontmatter(
			await readFile(skillPath, "utf8"),
			skillPath,
		);
		if (
			parsed.attributes.name !== name ||
			typeof parsed.attributes.description !== "string" ||
			parsed.attributes.description.trim() === "" ||
			parsed.attributes["disable-model-invocation"] === true
		)
			throw new Error(
				`Memory topic must have matching name, description, and automatic invocation: ${skillPath}`,
			);
		if (!(await lstat(path.join(sourcePath, "test"))).isDirectory())
			throw new Error(`Memory topic has no test directory: ${sourcePath}`);
		if (
			!(await readdir(path.join(sourcePath, "test"))).some((file) =>
				/\.test\.(?:ts|js)$/.test(file),
			)
		)
			throw new Error(`Memory topic has no test file: ${sourcePath}`);
		for (const directory of skillsDirectories)
			links.push({
				kind: "directory",
				sourcePath,
				destinationPath: path.join(directory, name),
			});
	}
	return links;
}

export async function registerMemory(
	arguments_: readonly string[],
): Promise<void> {
	const uninstall = arguments_.includes("--uninstall");
	const topics = arguments_.filter((argument) => argument !== "--uninstall");
	if (topics.length > 1)
		throw new Error("Usage: register-memory.ts [<topic>-notes] [--uninstall]");
	const home = process.env.AGENTS_SKILLS_HOME ?? os.homedir();
	const memory = process.env.MEMORY_DIR ?? path.join(home, ".memory");
	const links = await buildMemoryLinks(
		memory,
		[path.join(home, ".claude", "skills")],
		topics[0],
	);
	if (uninstall) {
		for (const destination of await uninstallArtifacts(links, [repositoryRoot]))
			console.log(`removed ${destination}`);
	} else {
		const result = await installArtifacts(links, [repositoryRoot]);
		console.log(
			`memory created=${result.created.length} existing=${result.existing.length} repaired=${result.repaired.length}`,
		);
	}
}

if (
	process.argv[1] &&
	(await realpath(process.argv[1])) === fileURLToPath(import.meta.url)
) {
	registerMemory(process.argv.slice(2)).catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
