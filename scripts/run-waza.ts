import { spawn } from "node:child_process";
import fs from "node:fs";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WAZA_DOCS_URL = "https://microsoft.github.io/waza/";
const WAZA_WORKSPACE_PREFIX = "agents-skills-waza-";
const EXCLUDED_WORKSPACE_ENTRIES = new Set([
	".git",
	".waza-cache",
	"node_modules",
	"results",
]);

function isExcludedWorkspacePath(
	repoRoot: string,
	sourcePath: string,
): boolean {
	const relativePath = path.relative(repoRoot, sourcePath);
	if (relativePath === "") {
		return false;
	}
	const firstSegment = relativePath.split(path.sep)[0];
	return (
		firstSegment !== undefined && EXCLUDED_WORKSPACE_ENTRIES.has(firstSegment)
	);
}

export async function createWazaWorkspace(repoRoot: string): Promise<string> {
	const workspaceDirectory = await mkdtemp(
		path.join(os.tmpdir(), WAZA_WORKSPACE_PREFIX),
	);
	try {
		await cp(repoRoot, workspaceDirectory, {
			recursive: true,
			filter: (sourcePath) => !isExcludedWorkspacePath(repoRoot, sourcePath),
		});
		return workspaceDirectory;
	} catch (error) {
		await rm(workspaceDirectory, { force: true, recursive: true });
		throw error;
	}
}

export function findWazaBinary(): string | null {
	const pathEnv = process.env.PATH ?? "";
	const extensions =
		process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
	for (const dir of pathEnv.split(path.delimiter)) {
		if (!dir) {
			continue;
		}
		for (const extension of extensions) {
			const fullPath = path.join(dir, `waza${extension}`);
			try {
				fs.accessSync(fullPath, fs.constants.X_OK);
				return fullPath;
			} catch {
				// Continue search
			}
		}
	}
	return null;
}

export async function runWaza(arguments_: readonly string[]): Promise<number> {
	const wazaPath = findWazaBinary();
	if (!wazaPath) {
		console.error(
			`Error: Waza CLI is not installed or not found on PATH.\nTo install Waza, visit: ${WAZA_DOCS_URL}`,
		);
		return 1;
	}

	const scriptPath = fileURLToPath(import.meta.url);
	const repoRoot = path.resolve(path.dirname(scriptPath), "..");
	const workspaceDirectory = await createWazaWorkspace(repoRoot);
	const keepWorkspace = arguments_.includes("--keep-workspace");

	try {
		const exitCode = await new Promise<number>((resolve) => {
			const child = spawn(wazaPath, arguments_, {
				cwd: workspaceDirectory,
				stdio: "inherit",
			});

			child.on("error", (error) => {
				console.error(`Failed to start waza process: ${error.message}`);
				resolve(1);
			});

			child.on("close", (code) => {
				resolve(code ?? 0);
			});
		});
		return exitCode;
	} finally {
		if (keepWorkspace) {
			console.log(`Waza workspace preserved at ${workspaceDirectory}`);
		} else {
			await rm(workspaceDirectory, { force: true, recursive: true });
		}
	}
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	runWaza(process.argv.slice(2)).then((code) => {
		process.exitCode = code;
	});
}
