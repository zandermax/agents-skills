import {
	lstat,
	mkdir,
	readlink,
	realpath,
	rm,
	symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface PiInstallResult {
	readonly created: readonly string[];
	readonly existing: readonly string[];
	readonly repaired: readonly string[];
}

export interface PiUninstallResult {
	readonly removed: readonly string[];
}

export interface PiLinkTarget {
	readonly name: string;
	readonly sourcePath: string;
	readonly destinationPath: string;
}

export function getPiLinkTargets(
	repoRoot: string,
	piHome: string,
): readonly PiLinkTarget[] {
	return [
		{
			name: "skills",
			sourcePath: path.resolve(repoRoot, ".agents/skills"),
			destinationPath: path.resolve(piHome, "skills"),
		},
		{
			name: "agent",
			sourcePath: path.resolve(repoRoot, ".claude/agents"),
			destinationPath: path.resolve(piHome, "agent"),
		},
	];
}

export function getLegacyPiLinkTargets(
	repoRoot: string,
	piHome: string,
): readonly PiLinkTarget[] {
	return [
		{
			name: "agents",
			sourcePath: path.resolve(repoRoot, ".claude/agents"),
			destinationPath: path.resolve(piHome, "agents"),
		},
	];
}

export function resolvePiHome(homeDir?: string): string {
	const baseHome =
		homeDir ??
		process.env.AGENTS_SKILLS_HOME ??
		process.env.PI_HOME ??
		os.homedir();
	return path.join(baseHome, ".pi");
}

export async function installPi(
	repoRoot: string,
	piHome: string = resolvePiHome(),
): Promise<PiInstallResult> {
	await mkdir(piHome, { recursive: true });

	// Remove legacy ~/.pi/agents symlink if it points to our repository agents
	const legacyTargets = getLegacyPiLinkTargets(repoRoot, piHome);
	for (const legacy of legacyTargets) {
		const stat = await lstat(legacy.destinationPath).catch((err: unknown) => {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
			throw err;
		});
		if (stat?.isSymbolicLink()) {
			const currentTarget = await readlink(legacy.destinationPath);
			const absoluteTarget = path.resolve(
				path.dirname(legacy.destinationPath),
				currentTarget,
			);
			const expectedSource = path.normalize(
				await realpath(legacy.sourcePath).catch(() => legacy.sourcePath),
			);
			const resolvedTarget = path.normalize(
				await realpath(absoluteTarget).catch(() => absoluteTarget),
			);
			if (resolvedTarget === expectedSource) {
				await rm(legacy.destinationPath, { force: true });
			}
		}
	}

	const targets = getPiLinkTargets(repoRoot, piHome);
	const created: string[] = [];
	const existing: string[] = [];
	const repaired: string[] = [];

	for (const target of targets) {
		const sourceStat = await lstat(target.sourcePath).catch(() => undefined);
		if (!sourceStat?.isDirectory()) {
			throw new Error(`Source is not a directory: ${target.sourcePath}`);
		}

		const destStat = await lstat(target.destinationPath).catch(
			(err: unknown) => {
				if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
				throw err;
			},
		);

		if (destStat === undefined) {
			await symlink(target.sourcePath, target.destinationPath, "dir");
			created.push(target.destinationPath);
			continue;
		}

		if (!destStat.isSymbolicLink()) {
			throw new Error(
				`Destination exists and is not a symlink: ${target.destinationPath}`,
			);
		}

		const currentTarget = await readlink(target.destinationPath);
		const absoluteTarget = path.resolve(
			path.dirname(target.destinationPath),
			currentTarget,
		);

		let actualSource: string | undefined;
		try {
			actualSource = path.normalize(await realpath(absoluteTarget));
		} catch (err: unknown) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				actualSource = undefined;
			} else {
				throw err;
			}
		}

		const expectedSource = path.normalize(await realpath(target.sourcePath));
		if (actualSource === expectedSource) {
			existing.push(target.destinationPath);
			continue;
		}

		if (actualSource === undefined) {
			// Broken symlink pointing to missing source: repair it
			await rm(target.destinationPath, { force: true });
			await symlink(target.sourcePath, target.destinationPath, "dir");
			repaired.push(target.destinationPath);
			continue;
		}

		throw new Error(
			`Destination symlink points elsewhere: ${target.destinationPath} -> ${currentTarget}`,
		);
	}

	return {
		created: Object.freeze(created),
		existing: Object.freeze(existing),
		repaired: Object.freeze(repaired),
	};
}

export async function uninstallPi(
	repoRoot: string,
	piHome: string = resolvePiHome(),
): Promise<PiUninstallResult> {
	const targets = [
		...getPiLinkTargets(repoRoot, piHome),
		...getLegacyPiLinkTargets(repoRoot, piHome),
	];
	const removed: string[] = [];

	for (const target of targets) {
		const destStat = await lstat(target.destinationPath).catch(
			(err: unknown) => {
				if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
				throw err;
			},
		);

		if (!destStat?.isSymbolicLink()) {
			continue;
		}

		const currentTarget = await readlink(target.destinationPath);
		const absoluteTarget = path.resolve(
			path.dirname(target.destinationPath),
			currentTarget,
		);

		let matchesSource = false;
		if (path.normalize(absoluteTarget) === path.normalize(target.sourcePath)) {
			matchesSource = true;
		} else {
			try {
				const resolvedTarget = path.normalize(await realpath(absoluteTarget));
				const expectedSource = path.normalize(
					await realpath(target.sourcePath),
				);
				matchesSource = resolvedTarget === expectedSource;
			} catch {
				matchesSource = false;
			}
		}

		if (matchesSource) {
			await rm(target.destinationPath);
			removed.push(target.destinationPath);
		}
	}

	return {
		removed: Object.freeze(removed),
	};
}

export async function runCli(
	operation: "install" | "uninstall" = "install",
): Promise<void> {
	const scriptPath = fileURLToPath(import.meta.url);
	const repoRoot = path.resolve(path.dirname(scriptPath), "..");
	const piHome = resolvePiHome();

	if (operation === "install") {
		const result = await installPi(repoRoot, piHome);
		for (const destination of result.created) {
			console.log(`created ${destination}`);
		}
		for (const destination of result.repaired) {
			console.log(`repaired ${destination}`);
		}
		for (const destination of result.existing) {
			console.log(`existing ${destination}`);
		}
		console.log(
			`summary created=${result.created.length} repaired=${result.repaired.length} existing=${result.existing.length}`,
		);
	} else {
		const result = await uninstallPi(repoRoot, piHome);
		for (const destination of result.removed) {
			console.log(`removed ${destination}`);
		}
		console.log(`summary removed=${result.removed.length}`);
	}
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	runCli("install").catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
