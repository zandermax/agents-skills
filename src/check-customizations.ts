import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { discoverArtifacts } from "./lib/artifacts.js";
import type { InstallCatalog } from "./lib/catalog.js";
import { loadInstallCatalog } from "./lib/catalog.js";
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

const ALLOWED_SKILL_FRONTMATTER_KEYS = new Set([
	"name",
	"description",
	"disable-model-invocation",
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

async function discoverPlanPaths(
	plansRoot: string,
): Promise<readonly string[]> {
	const planPaths: string[] = [];

	async function visit(directory: string): Promise<void> {
		let entries: readonly import("node:fs").Dirent[];
		try {
			entries = await readdir(directory, { withFileTypes: true });
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code === "ENOENT") {
				return;
			}

			throw error;
		}

		for (const entry of entries) {
			const entryPath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				await visit(entryPath);
			} else if (entry.isFile() && entry.name.endsWith(".md")) {
				planPaths.push(entryPath);
			}
		}
	}

	await visit(plansRoot);
	planPaths.sort(compareByCodePoint);
	return planPaths;
}

async function validatePlanStatuses(
	repoRoot: string,
	plansRoot: string,
	errors: string[],
): Promise<void> {
	for (const planPath of await discoverPlanPaths(plansRoot)) {
		const relativePath = toRelativePath(repoRoot, planPath);
		try {
			const parsed = parseFrontmatter(
				await readFile(planPath, "utf8"),
				relativePath,
			);
			const status = parsed.attributes.status;
			const relativeToPlans = path.relative(plansRoot, planPath);
			const isArchived =
				relativeToPlans === "archive" ||
				relativeToPlans.startsWith(`archive${path.sep}`);

			if (typeof status !== "string" || status.length === 0) {
				errors.push(
					`${relativePath}: plan frontmatter status must be a non-empty string`,
				);
			} else if (
				isArchived &&
				status !== "completed" &&
				status !== "abandoned"
			) {
				errors.push(
					`${relativePath}: archived plan status must be completed or abandoned`,
				);
			} else if (
				!isArchived &&
				(status === "completed" || status === "abandoned")
			) {
				errors.push(
					`${relativePath}: ${status} plans must be moved to docs/plans/archive/`,
				);
			}
		} catch (error) {
			errors.push(
				error instanceof Error
					? `${relativePath}: ${error.message}`
					: `${relativePath}: ${String(error)}`,
			);
		}
	}
}

export async function checkCustomizations(repoRoot: string): Promise<void> {
	const absoluteRepoRoot = path.resolve(repoRoot);
	const errors: string[] = [];

	await validatePlanStatuses(
		absoluteRepoRoot,
		path.join(absoluteRepoRoot, "docs", "plans"),
		errors,
	);

	const manifests = await discoverManifestPaths(absoluteRepoRoot);

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

			if (parsed.description.length > 80) {
				errors.push(
					`${toRelativePath(absoluteRepoRoot, manifestPath)}: description length ${parsed.description.length} exceeds 80 characters`,
				);
			}

			if (/^(?:use|run|call)\b/i.test(parsed.description)) {
				errors.push(
					`${toRelativePath(absoluteRepoRoot, manifestPath)}: description must be a description of the skill itself, not an instruction starting with Use, Run, or Call`,
				);
			}

			if (/\busers?\b/i.test(parsed.description)) {
				errors.push(
					`${toRelativePath(absoluteRepoRoot, manifestPath)}: description must not mention user or users`,
				);
			}

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

	const skillHeadings = new Map<string, Set<string>>();

	for (const artifact of artifacts) {
		if (artifact.kind !== "skill") {
			continue;
		}

		const collection = catalog?.collections.find(
			(candidate) => candidate.name === artifact.collection,
		);
		if (collection?.entry.kind !== "directory") {
			errors.push(
				`${artifact.id}: skill artifact collection must use a directory entry`,
			);
			continue;
		}

		const skillFile = path.join(artifact.sourcePath, collection.entry.marker);
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

			const disableModelInvocation =
				parsed.attributes["disable-model-invocation"];
			if (
				disableModelInvocation !== undefined &&
				disableModelInvocation !== true
			) {
				errors.push(
					`${relativePath}: skill frontmatter disable-model-invocation must be true when present`,
				);
			}

			const description = parsed.attributes.description;
			if (typeof description === "string") {
				if (description.length > 80) {
					errors.push(
						`${relativePath}: frontmatter description length ${description.length} exceeds 80 characters`,
					);
				}
				if (/^(?:use|run|call)\b/i.test(description)) {
					errors.push(
						`${relativePath}: frontmatter description must be a description of the skill itself, not an instruction starting with Use, Run, or Call`,
					);
				}
				if (/\busers?\b/i.test(description)) {
					errors.push(
						`${relativePath}: frontmatter description must not mention user or users`,
					);
				}
			}

			for (const key of Object.keys(parsed.attributes)) {
				if (!ALLOWED_SKILL_FRONTMATTER_KEYS.has(key)) {
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

			const headings = new Set(
				listSections(parsed.body)
					.filter((section) => section.level >= 2)
					.map((section) => section.heading),
			);
			skillHeadings.set(artifact.id, headings);
		} catch (error) {
			errors.push(
				error instanceof Error
					? `${relativePath}: ${error.message}`
					: `${relativePath}: ${String(error)}`,
			);
		}
	}

	const validationByCollection = new Map(
		catalog?.collections.map((collection) => [
			collection.name,
			collection.validation,
		]),
	);
	for (const artifact of artifacts) {
		if (
			artifact.kind !== "agent" ||
			validationByCollection.get(artifact.collection) !== "copilot-agent"
		) {
			continue;
		}

		const agentFile = artifact.sourcePath;
		const relativePath = toRelativePath(absoluteRepoRoot, agentFile);
		try {
			const content = await readFile(agentFile, "utf8");
			const parsed = parseFrontmatter(content, relativePath);

			const agentDescription = parsed.attributes.description;
			if (typeof agentDescription === "string") {
				if (agentDescription.length > 80) {
					errors.push(
						`${relativePath}: frontmatter description length ${agentDescription.length} exceeds 80 characters`,
					);
				}
				if (/^(?:use|run|call)\b/i.test(agentDescription)) {
					errors.push(
						`${relativePath}: frontmatter description must be a description of the agent itself, not an instruction starting with Use, Run, or Call`,
					);
				}
				if (/\busers?\b/i.test(agentDescription)) {
					errors.push(
						`${relativePath}: frontmatter description must not mention user or users`,
					);
				}
			}

			const declaredSkills = new Set<string>();
			const declarationPattern =
				/\*\*REQUIRED SKILL:\*\*\s+Use\s+([a-z0-9]+(?:-[a-z0-9]+)*)/g;
			for (const match of parsed.body.matchAll(declarationPattern)) {
				if (match[1] !== undefined) {
					declaredSkills.add(match[1]);
				}
			}

			const declaredHeadings = new Set<string>();
			for (const skillName of declaredSkills) {
				const headings = skillHeadings.get(skillName);
				if (headings === undefined) {
					errors.push(
						`${relativePath}: declared REQUIRED SKILL does not exist: ${skillName}`,
					);
					continue;
				}
				for (const heading of headings) {
					declaredHeadings.add(heading);
				}
			}

			const agentSections = listSections(parsed.body);
			for (const section of agentSections) {
				if (declaredHeadings.has(section.heading)) {
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
			"npm run install:artifacts",
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

	const prePushPath = path.join(absoluteRepoRoot, ".githooks", "pre-push");
	const relativePrePushPath = toRelativePath(absoluteRepoRoot, prePushPath);
	let prePushContent = "";
	try {
		prePushContent = await readFile(prePushPath, "utf8");
	} catch {
		errors.push(`${relativePrePushPath}: file is missing`);
	}

	if (prePushContent.length > 0 && !prePushContent.includes("npm run check")) {
		errors.push(
			`${relativePrePushPath}: missing required marker: npm run check`,
		);
	}

	const packageJsonPath = path.join(absoluteRepoRoot, "package.json");
	const relativePackageJsonPath = toRelativePath(
		absoluteRepoRoot,
		packageJsonPath,
	);
	let packageJsonContent = "";
	try {
		packageJsonContent = await readFile(packageJsonPath, "utf8");
	} catch {
		errors.push(`${relativePackageJsonPath}: file is missing`);
	}

	if (packageJsonContent.length > 0) {
		try {
			const parsedPackage = JSON.parse(packageJsonContent) as {
				scripts?: Record<string, string>;
			};
			const prepareScript = parsedPackage.scripts?.prepare;
			if (
				typeof prepareScript !== "string" ||
				!prepareScript.includes("git config core.hooksPath .githooks")
			) {
				errors.push(
					`${relativePackageJsonPath}: prepare script must configure git core.hooksPath .githooks`,
				);
			}
		} catch {
			errors.push(`${relativePackageJsonPath}: invalid JSON`);
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
