import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseFrontmatter } from "./lib/frontmatter.js";
import { parseSkillManifest } from "./lib/manifests.js";
import { listSections } from "./lib/markdown-sections.js";

const AGENT_ONLY_FRONTMATTER_KEYS = new Set([
	"target",
	"tools",
	"agents",
	"handoffs",
	"model",
]);

const FORBIDDEN_SKILL_TOKENS = [
	"/memories/session/plan.md",
	"run_in_terminal",
	"vscode_askQuestions",
	"read_file",
	"apply_patch",
];

function toPosixPath(filePath: string): string {
	return filePath.split(path.sep).join("/");
}

function toRelativePath(repoRoot: string, filePath: string): string {
	return toPosixPath(path.relative(repoRoot, filePath));
}

function formatErrorList(errors: readonly string[]): Error {
	const lines = errors.map((message) => `- ${message}`).join("\n");
	return new Error(`checkCustomizations: validation failed\n${lines}`);
}

function compareByCodePoint(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function relativizeMessage(repoRoot: string, message: string): string {
	const rootPrefix = `${toPosixPath(repoRoot)}/`;
	return toPosixPath(message).split(rootPrefix).join("");
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

	const manifests: string[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		const manifestPath = path.join(sourcesRoot, entry.name, "skill.json");
		if (await fileExists(manifestPath)) {
			manifests.push(manifestPath);
		}
	}

	manifests.sort(compareByCodePoint);
	return manifests;
}

async function discoverSkillFiles(
	repoRoot: string,
): Promise<readonly string[]> {
	const skillsRoot = path.join(repoRoot, ".agents", "skills");
	let entries: readonly import("node:fs").Dirent[];

	try {
		entries = await readdir(skillsRoot, { withFileTypes: true });
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ENOENT") {
			return [];
		}

		throw error;
	}

	const files: string[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		const skillPath = path.join(skillsRoot, entry.name, "SKILL.md");
		if (await fileExists(skillPath)) {
			files.push(skillPath);
		}
	}

	files.sort(compareByCodePoint);
	return files;
}

async function discoverAgentFiles(
	repoRoot: string,
): Promise<readonly string[]> {
	const agentsRoot = path.join(repoRoot, ".github", "agents");
	let entries: readonly import("node:fs").Dirent[];

	try {
		entries = await readdir(agentsRoot, { withFileTypes: true });
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === "ENOENT") {
			return [];
		}

		throw error;
	}

	const files: string[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".agent.md")) {
			continue;
		}

		files.push(path.join(agentsRoot, entry.name));
	}

	files.sort(compareByCodePoint);
	return files;
}

export async function checkCustomizations(repoRoot: string): Promise<void> {
	const absoluteRepoRoot = path.resolve(repoRoot);
	const errors: string[] = [];

	const manifests = await discoverManifestPaths(absoluteRepoRoot);
	const requiredSkillNames = new Set<string>();

	for (const manifestPath of manifests) {
		try {
			const raw = await readFile(manifestPath, "utf8");
			let manifestValue: unknown;
			try {
				manifestValue = JSON.parse(raw) as unknown;
			} catch (error) {
				const details = error instanceof Error ? error.message : String(error);
				throw new Error(`${manifestPath}: invalid JSON: ${details}`);
			}

			const parsed = parseSkillManifest(
				manifestValue,
				manifestPath,
				absoluteRepoRoot,
			);

			requiredSkillNames.add(parsed.name);

			const folderName = path.basename(path.dirname(manifestPath));
			if (folderName !== parsed.name) {
				errors.push(
					`${toRelativePath(absoluteRepoRoot, manifestPath)}: manifest folder name ${folderName} must match skill name ${parsed.name}`,
				);
			}
		} catch (error) {
			errors.push(
				relativizeMessage(
					absoluteRepoRoot,
					error instanceof Error ? error.message : String(error),
				),
			);
		}
	}

	const skillFiles = await discoverSkillFiles(absoluteRepoRoot);
	const canonicalHeadings = new Set<string>();

	for (const skillFile of skillFiles) {
		const relativePath = toRelativePath(absoluteRepoRoot, skillFile);
		try {
			const content = await readFile(skillFile, "utf8");
			const parsed = parseFrontmatter(content, relativePath);
			const name = parsed.attributes.name;

			if (typeof name !== "string" || name.length === 0) {
				errors.push(
					`${relativePath}: frontmatter name must be a non-empty string`,
				);
			} else {
				const folderName = path.basename(path.dirname(skillFile));
				if (folderName !== name) {
					errors.push(
						`${relativePath}: frontmatter name ${name} must match skill folder ${folderName}`,
					);
				}
			}

			for (const key of Object.keys(parsed.attributes)) {
				if (key !== "name" && key !== "description") {
					errors.push(
						`${relativePath}: skill frontmatter has forbidden key ${key}`,
					);
				}

				if (AGENT_ONLY_FRONTMATTER_KEYS.has(key)) {
					errors.push(
						`${relativePath}: skill frontmatter must not include agent-only key ${key}`,
					);
				}
			}

			for (const token of FORBIDDEN_SKILL_TOKENS) {
				if (content.includes(token)) {
					errors.push(
						`${relativePath}: forbidden token in skill content: ${token}`,
					);
				}
			}

			const sections = listSections(parsed.body);
			for (const section of sections) {
				if (section.level >= 2) {
					canonicalHeadings.add(section.heading);
				}
			}
		} catch (error) {
			errors.push(
				error instanceof Error
					? `${relativePath}: ${error.message}`
					: `${relativePath}: ${String(error)}`,
			);
		}
	}

	const agentFiles = await discoverAgentFiles(absoluteRepoRoot);
	for (const agentFile of agentFiles) {
		const relativePath = toRelativePath(absoluteRepoRoot, agentFile);
		try {
			const content = await readFile(agentFile, "utf8");
			const parsed = parseFrontmatter(content, relativePath);

			for (const skillName of requiredSkillNames) {
				const marker = `**REQUIRED SKILL:** Use ${skillName}`;
				if (!parsed.body.includes(marker)) {
					errors.push(
						`${relativePath}: missing REQUIRED SKILL declaration for ${skillName}`,
					);
				}
			}

			const agentSections = listSections(parsed.body);
			for (const section of agentSections) {
				if (canonicalHeadings.has(section.heading)) {
					errors.push(
						`${relativePath}: duplicate canonical heading in thin agent: ${section.heading}`,
					);
				}
			}
		} catch (error) {
			errors.push(
				error instanceof Error
					? `${relativePath}: ${error.message}`
					: `${relativePath}: ${String(error)}`,
			);
		}
	}

	const readmePath = path.join(absoluteRepoRoot, "README.md");
	const relativeReadmePath = toRelativePath(absoluteRepoRoot, readmePath);
	let readme = "";
	try {
		readme = await readFile(readmePath, "utf8");
	} catch {
		errors.push(`${relativeReadmePath}: file is missing`);
	}

	if (readme.length > 0) {
		const requiredReadmeMarkers = [
			"npm run build",
			"npm run check",
			"npm run install:clients",
		];

		for (const marker of requiredReadmeMarkers) {
			if (!readme.includes(marker)) {
				errors.push(
					`${relativeReadmePath}: missing required marker: ${marker}`,
				);
			}
		}

		const lowerReadme = readme.toLowerCase();
		const requiredClientMarkers = ["copilot", "claude", ".agents/skills"];
		for (const marker of requiredClientMarkers) {
			if (!lowerReadme.includes(marker.toLowerCase())) {
				errors.push(
					`${relativeReadmePath}: missing required client instruction marker: ${marker}`,
				);
			}
		}
	}

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
