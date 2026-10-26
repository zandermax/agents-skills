import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export const AGENT_ONLY_FRONTMATTER_KEYS = new Set([
	"target",
	"tools",
	"agents",
	"handoffs",
	"model",
]);

export const REQUIRED_AGENT_BASELINE_TOOLS = [
	"read",
	"search",
	"web",
	"vscode/askQuestions",
] as const;

export const ALLOWED_SKILL_FRONTMATTER_KEYS = new Set([
	"name",
	"description",
	"disable-model-invocation",
]);

export const FORBIDDEN_SKILL_TOKENS = [
	"/memories/session/plan.md",
	"run_in_terminal",
	"vscode_askQuestions",
	"vscode/askQuestions",
	"read_file",
	"apply_patch",
];

export function missingAgentBaselineTools(tools: unknown): readonly string[] {
	if (!Array.isArray(tools) || tools.some((tool) => typeof tool !== "string")) {
		return REQUIRED_AGENT_BASELINE_TOOLS;
	}

	const aliases: Readonly<Record<string, string>> = {
		Read: "read",
		Glob: "search",
		Grep: "search",
		WebFetch: "web",
		WebSearch: "web",
		AskUserQuestion: "vscode/askQuestions",
	};
	const declared = new Set(tools.map((tool) => aliases[tool] ?? tool));
	return REQUIRED_AGENT_BASELINE_TOOLS.filter((tool) => !declared.has(tool));
}

function toPosixPath(filePath: string): string {
	return filePath.split(path.sep).join("/");
}

export function toRelativePath(repoRoot: string, filePath: string): string {
	return toPosixPath(path.relative(repoRoot, filePath));
}

export function formatErrorList(errors: readonly string[]): Error {
	const lines = errors.map((message) => `- ${message}`).join("\n");
	return new Error(`checkCustomizations: validation failed\n${lines}`);
}

function compareByCodePoint(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

export function relativizeMessage(repoRoot: string, message: string): string {
	const rootPrefix = `${toPosixPath(repoRoot)}/`;
	return toPosixPath(message).split(rootPrefix).join("");
}

export async function fileExists(filePath: string): Promise<boolean> {
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

export async function discoverManifestPaths(
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

export async function discoverPlanPaths(
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
