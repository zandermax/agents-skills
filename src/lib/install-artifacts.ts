import {
	lstat,
	mkdir,
	readlink,
	realpath,
	rm,
	symlink,
} from "node:fs/promises";
import path from "node:path";

import type { ArtifactRequest } from "./artifact-selection.js";

export interface ResolvedLink {
	readonly kind: "file" | "directory";
	readonly sourcePath: string;
	readonly destinationPath: string;
}

export interface InstallResult {
	readonly created: readonly string[];
	readonly existing: readonly string[];
	readonly repaired: readonly string[];
	readonly removed: readonly string[];
}

export async function uninstallArtifacts(
	links: readonly ResolvedLink[],
	protectedDirectories: readonly string[] = [],
): Promise<readonly string[]> {
	const removed: string[] = [];
	for (const link of deduplicateLinks(links)) {
		const stats = await lstat(link.destinationPath).catch((error: unknown) => {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
			throw error;
		});
		if (!stats?.isSymbolicLink()) continue;
		const target = path.resolve(
			path.dirname(link.destinationPath),
			await readlink(link.destinationPath),
		);
		if (normalizePath(target) !== normalizePath(link.sourcePath)) continue;
		const sourceParent = await resolveParent(
			link.kind === "directory"
				? link.sourcePath
				: path.dirname(link.sourcePath),
		);
		await validateDestinationParent(link, [
			sourceParent,
			...(await Promise.all(protectedDirectories.map(resolveParent))),
		]);
		await rm(link.destinationPath);
		removed.push(link.destinationPath);
	}
	return Object.freeze(removed);
}

type DestinationAction = "create" | "existing" | "repair";

function normalizePath(targetPath: string): string {
	return path.normalize(path.resolve(targetPath));
}

async function resolveParent(directory: string): Promise<string> {
	try {
		return await realpath(directory);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
			throw error;
		}
		return path.join(
			await resolveParent(path.dirname(directory)),
			path.basename(directory),
		);
	}
}

async function validateDestinationParent(
	link: ResolvedLink,
	sourceDirectories: readonly string[],
	migrations: readonly ResolvedLink[] = [],
): Promise<void> {
	const directory = path.dirname(link.destinationPath);
	const migration = migrations.find((candidate) =>
		isWithin(candidate.destinationPath, directory),
	);
	const parent =
		migration === undefined
			? await resolveParent(directory)
			: path.join(
					await resolveParent(path.dirname(migration.destinationPath)),
					path.basename(migration.destinationPath),
					path.relative(migration.destinationPath, directory),
				);
	for (const sourceDirectory of sourceDirectories) {
		const relative = path.relative(sourceDirectory, parent);
		if (
			relative === "" ||
			(relative !== ".." &&
				!relative.startsWith(`..${path.sep}`) &&
				!path.isAbsolute(relative))
		) {
			throw new Error(
				`Destination parent resolves inside an artifact source: ${link.destinationPath}`,
			);
		}
	}
}

function isWithin(root: string, candidate: string): boolean {
	const relative = path.relative(root, candidate);
	return (
		relative === "" ||
		(relative !== ".." &&
			!relative.startsWith(`..${path.sep}`) &&
			!path.isAbsolute(relative))
	);
}

function deduplicateLinks(
	links: readonly ResolvedLink[],
): readonly ResolvedLink[] {
	const linksByDestination = new Map<string, ResolvedLink>();
	for (const link of links) {
		const destination = normalizePath(link.destinationPath);
		const existing = linksByDestination.get(destination);
		if (existing === undefined) {
			linksByDestination.set(destination, link);
			continue;
		}
		if (
			existing.kind !== link.kind ||
			normalizePath(existing.sourcePath) !== normalizePath(link.sourcePath)
		) {
			throw new Error(`Conflicting destination mappings: ${destination}`);
		}
	}
	return Array.from(linksByDestination.values());
}

async function validateSource(link: ResolvedLink): Promise<void> {
	try {
		const stats = await lstat(link.sourcePath);
		if (link.kind === "file" && !stats.isFile()) {
			throw new Error(`Source is not a file: ${link.sourcePath}`);
		}
		if (link.kind === "directory" && !stats.isDirectory()) {
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

async function classifyDestination(
	link: ResolvedLink,
): Promise<DestinationAction> {
	const stats = await lstat(link.destinationPath).catch((error: unknown) => {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return undefined;
		}
		throw error;
	});
	if (stats === undefined) {
		return "create";
	}
	if (!stats.isSymbolicLink()) {
		throw new Error(
			`Destination exists and is not a symlink: ${link.destinationPath}`,
		);
	}

	const currentTarget = await readlink(link.destinationPath);
	const absoluteTarget = path.resolve(
		path.dirname(link.destinationPath),
		currentTarget,
	);
	let actualSource: string;
	try {
		actualSource = normalizePath(await realpath(absoluteTarget));
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return "repair";
		}
		throw error;
	}

	const expectedSource = normalizePath(await realpath(link.sourcePath));
	if (actualSource !== expectedSource) {
		throw new Error(
			`Destination symlink points elsewhere: ${link.destinationPath} -> ${currentTarget}`,
		);
	}
	return "existing";
}

function symlinkType(kind: ResolvedLink["kind"]): "file" | "dir" {
	return kind === "directory" ? "dir" : "file";
}

export function buildArtifactLinks(
	request: ArtifactRequest,
): readonly ResolvedLink[] {
	const links: ResolvedLink[] = [];
	for (const target of request.targets) {
		const targetArtifacts = request.artifacts.filter(
			(artifact) => artifact.collection === target.collection,
		);
		if (targetArtifacts.length === 0) {
			continue;
		}
		if (target.linkMode === "directory") {
			const firstArtifact = targetArtifacts[0];
			const sourcePath =
				target.sourceDirectory ??
				(firstArtifact !== undefined
					? path.dirname(firstArtifact.sourcePath)
					: "");
			if (sourcePath.length === 0) {
				continue;
			}
			links.push(
				Object.freeze({
					kind: "directory",
					sourcePath,
					destinationPath: target.directory,
				}),
			);
			continue;
		}
		for (const artifact of targetArtifacts) {
			links.push(
				Object.freeze({
					kind: artifact.entryKind,
					sourcePath: artifact.sourcePath,
					destinationPath: path.join(
						target.directory,
						artifact.destinationName,
					),
				}),
			);
		}
	}
	return Object.freeze(links);
}

export async function installArtifacts(
	links: readonly ResolvedLink[],
	protectedDirectories: readonly string[] = [],
	directoryMigrations: readonly ResolvedLink[] = [],
): Promise<InstallResult> {
	const deduplicatedLinks = deduplicateLinks(links);
	const errors: string[] = [];
	const actions: Array<{ link: ResolvedLink; action: DestinationAction }> = [];
	const migrations: ResolvedLink[] = [];
	for (const migration of directoryMigrations) {
		const stats = await lstat(migration.destinationPath).catch(
			(error: unknown) => {
				if ((error as NodeJS.ErrnoException).code === "ENOENT")
					return undefined;
				throw error;
			},
		);
		if (
			stats?.isSymbolicLink() &&
			normalizePath(
				path.resolve(
					path.dirname(migration.destinationPath),
					await readlink(migration.destinationPath),
				),
			) === normalizePath(migration.sourcePath)
		)
			migrations.push(migration);
	}
	const sourceDirectories = await Promise.all(
		[
			...deduplicatedLinks.map((link) => path.dirname(link.sourcePath)),
			...protectedDirectories,
		].map(resolveParent),
	);

	for (const link of deduplicatedLinks) {
		try {
			await validateSource(link);
			await validateDestinationParent(link, sourceDirectories, migrations);
			actions.push({
				link,
				action: migrations.some((migration) =>
					isWithin(migration.destinationPath, link.destinationPath),
				)
					? "create"
					: await classifyDestination(link),
			});
		} catch (error) {
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}
	if (errors.length > 0) {
		throw new Error(`Install validation failed:\n- ${errors.join("\n- ")}`);
	}

	const removed = await uninstallArtifacts(migrations);
	const created: string[] = [];
	const existing: string[] = [];
	const repaired: string[] = [];
	for (const { link, action } of actions) {
		if (action === "existing") {
			existing.push(link.destinationPath);
			continue;
		}
		if (action === "repair") {
			await rm(link.destinationPath, { force: true });
		}
		await mkdir(path.dirname(link.destinationPath), { recursive: true });
		try {
			await symlink(
				link.sourcePath,
				link.destinationPath,
				symlinkType(link.kind),
			);
		} catch (error) {
			if (
				process.platform === "win32" &&
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "EPERM"
			) {
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(
					`${message}. On Windows, enable Developer Mode or grant symlink permission.`,
				);
			}
			throw error;
		}
		if (action === "repair") {
			repaired.push(link.destinationPath);
			continue;
		}
		created.push(link.destinationPath);
	}
	return Object.freeze({
		created: Object.freeze(created),
		existing: Object.freeze(existing),
		repaired: Object.freeze(repaired),
		removed,
	});
}
