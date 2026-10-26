import { lstat, readlink, realpath } from "node:fs/promises";
import path from "node:path";

export interface ResolvedLink {
	readonly kind: "file" | "directory";
	readonly sourcePath: string;
	readonly destinationPath: string;
}

export type DestinationAction = "create" | "existing" | "repair";

export function normalizePath(targetPath: string): string {
	return path.normalize(path.resolve(targetPath));
}

export async function resolveParent(directory: string): Promise<string> {
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

export async function validateDestinationParent(
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

export function isWithin(root: string, candidate: string): boolean {
	const relative = path.relative(root, candidate);
	return (
		relative === "" ||
		(relative !== ".." &&
			!relative.startsWith(`..${path.sep}`) &&
			!path.isAbsolute(relative))
	);
}

export function deduplicateLinks(
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

export async function validateSource(link: ResolvedLink): Promise<void> {
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

export async function classifyDestination(
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

export function symlinkType(kind: ResolvedLink["kind"]): "file" | "dir" {
	return kind === "directory" ? "dir" : "file";
}
