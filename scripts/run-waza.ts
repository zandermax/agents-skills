import { spawn } from "node:child_process";
import fs from "node:fs";
import { cp, mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WAZA_DOCS_URL = "https://microsoft.github.io/waza/";
const WAZA_WORKSPACE_PREFIX = "agents-skills-waza-";
const MACOS_SANDBOX_EXEC = "/usr/bin/sandbox-exec";
const EXCLUDED_WORKSPACE_ENTRIES = new Set([
	".git",
	".waza-cache",
	"node_modules",
	"results",
]);

const COPILOT_SDK_CACHE_DIRECTORY = path.join(
	os.homedir(),
	"Library",
	"Caches",
	"copilot-sdk",
);
const WAZA_STATE_DIRECTORY = path.join(os.homedir(), ".waza");
const COPILOT_STATE_DIRECTORY = path.join(os.homedir(), ".copilot");

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
	const temporaryDirectory = await mkdtemp(
		path.join(os.tmpdir(), WAZA_WORKSPACE_PREFIX),
	);
	const workspaceDirectory = await realpath(temporaryDirectory);
	try {
		await cp(repoRoot, workspaceDirectory, {
			recursive: true,
			filter: (sourcePath) => !isExcludedWorkspacePath(repoRoot, sourcePath),
		});
		return workspaceDirectory;
	} catch (error) {
		await rm(temporaryDirectory, { force: true, recursive: true });
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

function escapeSandboxPath(filePath: string): string {
	return filePath.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function createMacosWazaSandboxProfile(
	workspaceDirectory: string,
): string {
	return [
		"(version 1)",
		"(allow default)",
		"(deny file-write*)",
		`(allow file-write* (subpath "${escapeSandboxPath(workspaceDirectory)}"))`,
		`(allow file-write* (subpath "${escapeSandboxPath(COPILOT_SDK_CACHE_DIRECTORY)}"))`,
		`(allow file-write* (subpath "${escapeSandboxPath(WAZA_STATE_DIRECTORY)}"))`,
		`(allow file-write* (subpath "${escapeSandboxPath(COPILOT_STATE_DIRECTORY)}"))`,
	].join("\n");
}

function findMacosSandboxExec(): string | undefined {
	if (process.platform !== "darwin") {
		return undefined;
	}
	try {
		fs.accessSync(MACOS_SANDBOX_EXEC, fs.constants.X_OK);
		return MACOS_SANDBOX_EXEC;
	} catch {
		return undefined;
	}
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
	const runtimeTemporaryDirectory = path.join(
		workspaceDirectory,
		".waza-runtime",
	);
	await mkdir(runtimeTemporaryDirectory);
	const keepWorkspace = arguments_.includes("--keep-workspace");
	const sandboxExec = findMacosSandboxExec();
	const command = sandboxExec ?? wazaPath;
	const commandArguments = sandboxExec
		? [
				"-p",
				createMacosWazaSandboxProfile(workspaceDirectory),
				wazaPath,
				...arguments_,
			]
		: arguments_;

	try {
		const exitCode = await new Promise<number>((resolve) => {
			const child = spawn(command, commandArguments, {
				cwd: workspaceDirectory,
				env: { ...process.env, TMPDIR: runtimeTemporaryDirectory },
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
