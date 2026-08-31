import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

import type { ArtifactKind, InstallCatalog } from "./catalog.js";

export interface Artifact {
	readonly kind: ArtifactKind;
	readonly id: string;
	readonly name: string;
	readonly collection: string;
	readonly sourcePath: string;
	readonly destinationName: string;
	readonly entryKind: "directory" | "file";
}

function compareByCodePoint(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function isInsideRoot(root: string, targetPath: string): boolean {
	const relativePath = path.relative(root, targetPath);
	return (
		relativePath === "" ||
		(!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
	);
}

export async function discoverArtifacts(
	catalog: InstallCatalog,
	repoRoot: string,
): Promise<readonly Artifact[]> {
	const artifacts: Artifact[] = [];
	const ids = new Set<string>();

	for (const collection of catalog.collections) {
		const collectionRoot = path.resolve(repoRoot, collection.source);
		let entries: import("node:fs").Dirent[];
		try {
			entries = await readdir(collectionRoot, { withFileTypes: true });
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "ENOENT"
			) {
				throw new Error(
					`discoverArtifacts: collection root is missing for ${collection.name}: ${collectionRoot}`,
				);
			}
			throw error;
		}
		entries.sort((left, right) => compareByCodePoint(left.name, right.name));

		for (const entry of entries) {
			const sourcePath = path.join(collectionRoot, entry.name);
			if (!isInsideRoot(collectionRoot, sourcePath)) {
				throw new Error(
					`discoverArtifacts: entry resolves outside collection ${collection.name}: ${entry.name}`,
				);
			}

			let name: string | undefined;
			if (collection.entry.kind === "file") {
				if (!entry.isFile() || !entry.name.endsWith(collection.entry.suffix)) {
					continue;
				}
				name = entry.name.slice(0, -collection.entry.suffix.length);
			} else {
				if (!entry.isDirectory()) {
					continue;
				}
				const markerPath = path.join(sourcePath, collection.entry.marker);
				const marker = await lstat(markerPath).catch((error: unknown) => {
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
				if (marker === undefined || !marker.isFile()) {
					continue;
				}
				name = entry.name;
			}

			if (name.length === 0) {
				throw new Error(
					`discoverArtifacts: artifact name is empty in collection ${collection.name}: ${entry.name}`,
				);
			}

			const id =
				collection.artifactKind === "skill"
					? name
					: `${collection.name}:${name}`;
			if (ids.has(id)) {
				throw new Error(`discoverArtifacts: duplicate artifact ID: ${id}`);
			}
			ids.add(id);
			artifacts.push(
				Object.freeze({
					kind: collection.artifactKind,
					id,
					name,
					collection: collection.name,
					sourcePath,
					destinationName: entry.name,
					entryKind: collection.entry.kind,
				}),
			);
		}
	}

	return Object.freeze(artifacts);
}
