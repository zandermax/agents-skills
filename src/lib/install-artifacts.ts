import { lstat, mkdir, readlink, rm, symlink } from "node:fs/promises";
import path from "node:path";
import {
	classifyDestination,
	type DestinationAction,
	deduplicateLinks,
	isWithin,
	normalizePath,
	type ResolvedLink,
	resolveParent,
	symlinkType,
	validateDestinationParent,
	validateSource,
} from "./artifact-link-validation.ts";
import type { ArtifactRequest } from "./artifact-selection.js";

export type { ResolvedLink } from "./artifact-link-validation.ts";

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
		if (
			normalizePath(await resolveParent(target)) !==
			normalizePath(await resolveParent(link.sourcePath))
		)
			continue;
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
