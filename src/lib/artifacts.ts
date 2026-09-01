import { lstat, readdir } from 'node:fs/promises';
import path from 'node:path';

import type {
	ArtifactCollection,
	ArtifactKind,
	InstallCatalog,
} from './catalog.js';

export interface Artifact {
	readonly kind: ArtifactKind;
	readonly id: string;
	readonly name: string;
	readonly collection: string;
	readonly sourcePath: string;
	readonly destinationName: string;
	readonly entryKind: 'file' | 'directory';
}

function compareCodePoints(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function isWithinRoot(root: string, targetPath: string): boolean {
	const relativePath = path.relative(root, targetPath);
	return (
		relativePath === '' ||
		(!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
	);
}

async function isRegularFile(filePath: string): Promise<boolean> {
	try {
		return (await lstat(filePath)).isFile();
	} catch {
		return false;
	}
}

async function discoverCollection(
	collection: ArtifactCollection,
	repoRoot: string,
): Promise<readonly Artifact[]> {
	const collectionRoot = path.resolve(repoRoot, collection.source);
	if (!isWithinRoot(repoRoot, collectionRoot)) {
		throw new Error(
			`discoverArtifacts: collection ${collection.name} source is outside repository`,
		);
	}

	let entries: import('node:fs').Dirent<string>[];
	try {
		entries = await readdir(collectionRoot, {
			withFileTypes: true,
			encoding: 'utf8',
		});
	} catch (error) {
		throw new Error(
			`discoverArtifacts: unable to read collection ${collection.name}: ${collection.source}`,
			{ cause: error },
		);
	}

	entries.sort((left, right) => compareCodePoints(left.name, right.name));
	const artifacts: Artifact[] = [];

	for (const entry of entries) {
		const sourcePath = path.resolve(collectionRoot, entry.name);
		if (!isWithinRoot(collectionRoot, sourcePath)) {
			throw new Error(
				`discoverArtifacts: entry is outside collection ${collection.name}: ${entry.name}`,
			);
		}

		let name: string;
		let destinationName: string;
		if (collection.entry.kind === 'directory') {
			if (!entry.isDirectory()) {
				continue;
			}

			const markerPath = path.resolve(sourcePath, collection.entry.marker);
			if (
				!isWithinRoot(sourcePath, markerPath) ||
				!(await isRegularFile(markerPath))
			) {
				continue;
			}

			name = entry.name;
			destinationName = entry.name;
		} else {
			if (!entry.isFile() || !entry.name.endsWith(collection.entry.suffix)) {
				continue;
			}

			name = entry.name.slice(0, -collection.entry.suffix.length);
			if (name.length === 0) {
				continue;
			}
			destinationName = entry.name;
		}

		const id =
			collection.artifactKind === 'skill' ? name : `${collection.name}:${name}`;
		artifacts.push(
			Object.freeze({
				kind: collection.artifactKind,
				id,
				name,
				collection: collection.name,
				sourcePath,
				destinationName,
				entryKind: collection.entry.kind,
			}),
		);
	}

	return artifacts;
}

export async function discoverArtifacts(
	catalog: InstallCatalog,
	repoRoot: string,
): Promise<readonly Artifact[]> {
	const absoluteRepoRoot = path.resolve(repoRoot);
	const artifacts: Artifact[] = [];
	const ids = new Set<string>();

	for (const collection of catalog.collections) {
		for (const artifact of await discoverCollection(
			collection,
			absoluteRepoRoot,
		)) {
			if (ids.has(artifact.id)) {
				throw new Error(
					`discoverArtifacts: duplicate artifact ID: ${artifact.id}`,
				);
			}

			ids.add(artifact.id);
			artifacts.push(artifact);
		}
	}

	return Object.freeze(artifacts);
}
