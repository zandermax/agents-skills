import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
	lstat,
	mkdir,
	readFile,
	readlink,
	realpath,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { installOmp } from "./install-omp.js";
import { installPi } from "./install-pi.js";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const fishSnippet = path.join(repoRoot, "scripts", "agents-skills.env.fish");
const shSnippet = path.join(repoRoot, "scripts", "agents-skills.env.sh");
const marker = "agents-skills env";

export function expandHome(value: string, home = os.homedir()): string {
	if (value === "~") return home;
	if (value.startsWith("~/")) return path.join(home, value.slice(2));
	return value;
}

export function applyUnsetDefaults(
	env: NodeJS.ProcessEnv = {},
	home = os.homedir(),
): NodeJS.ProcessEnv {
	const next: NodeJS.ProcessEnv = { ...env };
	if (next.MEMORY_DIR === undefined || next.MEMORY_DIR.trim() === "") {
		next.MEMORY_DIR = path.join(home, ".memory");
	}
	if (
		next.DECISION_SHADOW === undefined ||
		next.DECISION_SHADOW.trim() === ""
	) {
		next.DECISION_SHADOW = "1";
	}
	return next;
}

export function upsertManagedBlock(content: string, inner: string): string {
	const start = `# >>> ${marker} >>>`;
	const end = `# <<< ${marker} <<<`;
	const body = `${start}\n${inner.trim()}\n${end}`;
	const pattern = new RegExp(
		`${start.replaceAll(" ", "\\s")}[\\s\\S]*?${end.replaceAll(" ", "\\s")}`,
	);
	if (pattern.test(content)) {
		return content.replace(pattern, body);
	}
	const trimmed = content.trimEnd();
	return trimmed.length === 0 ? `${body}\n` : `${trimmed}\n\n${body}\n`;
}

async function commandExists(command: string): Promise<boolean> {
	const result = spawnSync("which", [command], { encoding: "utf8" });
	return result.status === 0;
}

async function ensureOwnedSymlink(
	sourcePath: string,
	destinationPath: string,
): Promise<"created" | "existing" | "repaired" | "skipped"> {
	await mkdir(path.dirname(destinationPath), { recursive: true });
	const destStat = await lstat(destinationPath).catch((error: unknown) => {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw error;
	});
	if (destStat === undefined) {
		await symlink(sourcePath, destinationPath);
		return "created";
	}
	if (!destStat.isSymbolicLink()) return "skipped";

	const currentTarget = await readlink(destinationPath);
	const absoluteTarget = path.resolve(
		path.dirname(destinationPath),
		currentTarget,
	);
	let actualSource: string | undefined;
	try {
		actualSource = path.normalize(await realpath(absoluteTarget));
	} catch (error: unknown) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			actualSource = undefined;
		} else {
			throw error;
		}
	}
	const expectedSource = path.normalize(await realpath(sourcePath));
	if (actualSource === expectedSource) return "existing";
	if (actualSource !== undefined) return "skipped";
	await rm(destinationPath, { force: true });
	await symlink(sourcePath, destinationPath);
	return "repaired";
}

export async function linkShellEnv(
	options: {
		homeDir?: string;
		isFishInstalled?: boolean | undefined;
		isZshInstalled?: boolean | undefined;
	} = {},
): Promise<{ fish: string; zsh: string }> {
	const home = options.homeDir ?? os.homedir();
	const fishConfig = path.join(home, ".config", "fish");
	const fishInstalled =
		options.isFishInstalled ??
		((await commandExists("fish")) || existsSync(fishConfig));
	let fish = "skipped";
	if (fishInstalled) {
		const destination = path.join(
			fishConfig,
			"conf.d",
			"agents-skills.env.fish",
		);
		fish = await ensureOwnedSymlink(fishSnippet, destination);
	}

	const zshrcPath = path.join(home, ".zshrc");
	const zshInstalled =
		options.isZshInstalled ??
		((await commandExists("zsh")) || existsSync(zshrcPath));
	let zsh = "skipped";
	if (zshInstalled) {
		let content = "";
		try {
			content = await readFile(zshrcPath, "utf8");
		} catch (error: unknown) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
		const inner = `[ -f "${shSnippet}" ] && . "${shSnippet}"`;
		const next = upsertManagedBlock(content, inner);
		if (next !== content) {
			await writeFile(zshrcPath, next, "utf8");
			zsh = content.length === 0 ? "created" : "updated";
		} else {
			zsh = "existing";
		}
	}

	return { fish, zsh };
}

export async function linkDetectedAgentDirs(
	root: string,
	env: NodeJS.ProcessEnv,
): Promise<readonly string[]> {
	const linked: string[] = [];
	const explicitOmp = env.OMP_CODING_AGENT_DIR || env.PI_CODING_AGENT_DIR;
	if (explicitOmp && explicitOmp.trim().length > 0) {
		const ompHome = expandHome(explicitOmp.trim());
		await installOmp(root, ompHome);
		linked.push(ompHome);
	} else {
		const fromConfig =
			env.CONFIG_REPO && env.CONFIG_REPO.trim().length > 0
				? path.join(expandHome(env.CONFIG_REPO.trim()), ".omp")
				: undefined;
		const sibling = path.resolve(root, "../config-stuff/.omp");
		const detected = [fromConfig, sibling].find(
			(dir) => dir !== undefined && existsSync(dir),
		);
		if (detected !== undefined) {
			await installOmp(root, detected);
			linked.push(detected);
		}
	}

	const explicitPi = env.PI_CODING_AGENT_DIR?.trim();
	if (explicitPi && explicitPi.length > 0) {
		const piHome = expandHome(explicitPi);
		if (!linked.includes(piHome)) {
			await installPi(root, piHome);
			linked.push(piHome);
		}
	}
	return linked;
}

function runCommand(
	command: string,
	args: readonly string[],
	env: NodeJS.ProcessEnv,
	cwd: string,
): void {
	const result = spawnSync(command, [...args], {
		cwd,
		env: { ...process.env, ...env },
		stdio: "inherit",
	});
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed`);
	}
}

export async function setupRepo(
	options: {
		homeDir?: string;
		env?: NodeJS.ProcessEnv;
		repoRoot?: string;
		skipDependencies?: boolean;
		skipBuild?: boolean;
		skipArtifacts?: boolean;
		skipAgentLinks?: boolean;
		skipShell?: boolean;
		isFishInstalled?: boolean;
		isZshInstalled?: boolean;
		run?: (
			command: string,
			args: readonly string[],
			env: NodeJS.ProcessEnv,
		) => void;
		linkAgentDirs?: (
			root: string,
			env: NodeJS.ProcessEnv,
		) => Promise<readonly string[]>;
	} = {},
): Promise<{
	env: NodeJS.ProcessEnv;
	shell: { fish: string; zsh: string } | undefined;
	commands: readonly string[];
	agentDirs: readonly string[];
}> {
	const root = options.repoRoot ?? repoRoot;
	const home = options.homeDir ?? os.homedir();
	const env = applyUnsetDefaults(options.env ?? process.env, home);
	const commands: string[] = [];
	const run =
		options.run ??
		((
			command: string,
			args: readonly string[],
			commandEnv: NodeJS.ProcessEnv,
		) => {
			runCommand(command, args, commandEnv, root);
		});
	const record = (command: string, args: readonly string[]) => {
		commands.push([command, ...args].join(" "));
		run(command, args, env);
	};

	if (!options.skipDependencies) record("npm", ["install"]);
	if (!options.skipBuild) record("npm", ["run", "build"]);
	if (!options.skipArtifacts) {
		record("npx", ["tsx", "scripts/install-artifacts.ts", "--client", "all"]);
	}

	const shell = options.skipShell
		? undefined
		: await linkShellEnv({
				homeDir: home,
				isFishInstalled: options.isFishInstalled,
				isZshInstalled: options.isZshInstalled,
			});
	const agentDirs = options.skipAgentLinks
		? []
		: await (options.linkAgentDirs ?? linkDetectedAgentDirs)(root, env);
	return { env, shell, commands, agentDirs };
}

async function main(): Promise<void> {
	const skip = new Set(process.argv.slice(2));
	const env = applyUnsetDefaults(process.env);
	for (const [key, value] of Object.entries(env)) {
		if (process.env[key] === undefined || process.env[key]?.trim() === "") {
			process.env[key] = value;
		}
	}
	const result = await setupRepo({
		env: process.env,
		skipDependencies: skip.has("--skip-deps"),
		skipBuild: skip.has("--skip-build"),
		skipArtifacts: skip.has("--skip-artifacts"),
		skipAgentLinks: skip.has("--skip-agent-links"),
		skipShell: skip.has("--skip-shell"),
	});
	if (result.shell) {
		console.log(`fish: ${result.shell.fish}`);
		console.log(`zsh: ${result.shell.zsh}`);
	}
	console.log(`agent dirs: ${result.agentDirs.join(", ") || "none"}`);
	console.log("setup complete");
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
