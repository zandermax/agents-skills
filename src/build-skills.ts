import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "./lib/frontmatter.js";
import { parseSkillManifest } from "./lib/manifests.js";
import { requireSection } from "./lib/markdown-sections.js";
import { type OwnedSection, renderSkill } from "./lib/render-skill.js";
import { applyExactTransforms, loadTransforms } from "./lib/transforms.js";

export interface BuildOptions {
	readonly repoRoot: string;
	readonly mode: "check" | "write";
}

export interface BuildArtifact {
	readonly path: string;
	readonly content: string;
	readonly changed: boolean;
}

type PreparedArtifact = BuildArtifact & {
	readonly missing: boolean;
	readonly absolutePath: string;
};

function formatAggregateError(
	prefix: string,
	errors: readonly string[],
): Error {
	const lines = errors.map((message) => `- ${message}`);
	return new Error(`${prefix}\n${lines.join("\n")}`);
}

function compareByCodePoint(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function isInsideRepo(repoRoot: string, targetPath: string): boolean {
	const relativePath = path.relative(repoRoot, targetPath);
	return (
		relativePath === "" ||
		(!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
	);
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		const fileStat = await stat(filePath);
		return fileStat.isFile();
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ENOENT") {
			return false;
		}

		throw error;
	}
}

async function discoverManifestPaths(
	repoRoot: string,
): Promise<readonly string[]> {
	const sourcesRoot = path.join(repoRoot, "sources");
	let entries: readonly import("node:fs").Dirent[];

	try {
		entries = await readdir(sourcesRoot, { withFileTypes: true });
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ENOENT") {
			return [];
		}

		throw error;
	}

	const manifestPaths: string[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		const manifestPath = path.join(sourcesRoot, entry.name, "skill.json");
		if (await fileExists(manifestPath)) {
			manifestPaths.push(manifestPath);
		}
	}

	manifestPaths.sort(compareByCodePoint);
	return manifestPaths;
}

async function loadJsonFile(filePath: string): Promise<unknown> {
	const source = await readFile(filePath, "utf8");
	try {
		return JSON.parse(source) as unknown;
	} catch (error) {
		const details = error instanceof Error ? error.message : String(error);
		throw new Error(`${filePath}: invalid JSON: ${details}`);
	}
}

async function prepareArtifact(
	repoRoot: string,
	manifestPath: string,
): Promise<PreparedArtifact> {
	const manifestValue = await loadJsonFile(manifestPath);
	const manifest = parseSkillManifest(manifestValue, manifestPath, repoRoot);
	const manifestDir = path.dirname(manifestPath);

	const sections: OwnedSection[] = [];
	for (const selection of manifest.selections) {
		const sourcePath = path.resolve(manifestDir, selection.source);
		const source = await readFile(sourcePath, "utf8");

		let selectedSource =
			selection.owner === "official"
				? parseFrontmatter(source, sourcePath).body
				: source;

		if (selection.transforms !== undefined) {
			const transformPath = path.resolve(manifestDir, selection.transforms);
			const transformsValue = await loadJsonFile(transformPath);
			const transforms = loadTransforms(transformsValue, transformPath);
			selectedSource = applyExactTransforms(selectedSource, transforms);
		}

		for (const heading of selection.headings) {
			const section = requireSection(selectedSource, heading, sourcePath);
			sections.push({
				owner: selection.owner,
				heading,
				content: section.content,
				sourceName: sourcePath,
			});
		}
	}

	const rendered = renderSkill(manifest, sections);
	const absoluteOutput = path.resolve(repoRoot, rendered.path);

	if (!isInsideRepo(repoRoot, absoluteOutput)) {
		throw new Error(`${manifestPath}: output resolves outside repository`);
	}

	let existingContent: string | undefined;
	try {
		existingContent = await readFile(absoluteOutput, "utf8");
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code !== "ENOENT") {
			throw error;
		}
	}

	const missing = existingContent === undefined;
	const changed = missing || existingContent !== rendered.content;

	return {
		path: rendered.path,
		content: rendered.content,
		changed,
		missing,
		absolutePath: absoluteOutput,
	};
}

export async function buildSkills(
	options: BuildOptions,
): Promise<readonly BuildArtifact[]> {
	const repoRoot = path.resolve(options.repoRoot);
	const manifestPaths = await discoverManifestPaths(repoRoot);

	const errors: string[] = [];
	const artifacts: PreparedArtifact[] = [];

	for (const manifestPath of manifestPaths) {
		try {
			artifacts.push(await prepareArtifact(repoRoot, manifestPath));
		} catch (error) {
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}

	if (errors.length > 0) {
		throw formatAggregateError("buildSkills: validation failed", errors);
	}

	if (options.mode === "check") {
		const driftMessages = artifacts
			.filter((artifact) => artifact.changed)
			.map((artifact) =>
				artifact.missing
					? `${artifact.path}: missing output`
					: `${artifact.path}: changed output`,
			);

		if (driftMessages.length > 0) {
			throw formatAggregateError("buildSkills: drift detected", driftMessages);
		}

		return artifacts;
	}

	for (const artifact of artifacts) {
		if (!artifact.changed) {
			continue;
		}

		await mkdir(path.dirname(artifact.absolutePath), { recursive: true });
		await writeFile(artifact.absolutePath, artifact.content, "utf8");
	}

	return artifacts;
}

function parseMode(argv: readonly string[]): BuildOptions["mode"] {
	const hasCheck = argv.includes("--check");
	const hasWrite = argv.includes("--write");

	if (hasCheck && hasWrite) {
		throw new Error("build-skills: --check and --write are mutually exclusive");
	}

	if (hasCheck) {
		return "check";
	}

	return "write";
}

async function main(): Promise<void> {
	const mode = parseMode(process.argv.slice(2));
	await buildSkills({
		repoRoot: process.cwd(),
		mode,
	});
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
