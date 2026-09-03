import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Artifact } from "../../src/lib/artifacts.js";
import type { InstallCatalog } from "../../src/lib/catalog.js";
import { loadInstallCatalog } from "../../src/lib/catalog.js";

const helperFilePath = fileURLToPath(import.meta.url);

export const repositoryRoot = path.resolve(
	path.dirname(helperFilePath),
	"..",
	"..",
);

export function loadRepositoryCatalog(): Promise<InstallCatalog> {
	return loadInstallCatalog(repositoryRoot);
}

/**
 * Independent filesystem scan so artifact discovery is checked against the
 * repository contents rather than a hand-maintained list.
 */
export async function scanArtifactIds(
	catalog: InstallCatalog,
): Promise<readonly string[]> {
	const ids: string[] = [];
	for (const collection of catalog.collections) {
		const collectionRoot = path.resolve(repositoryRoot, collection.source);
		const entries = await readdir(collectionRoot, { withFileTypes: true });
		const names: string[] = [];
		for (const entry of entries) {
			if (collection.entry.kind === "file") {
				if (entry.isFile() && entry.name.endsWith(collection.entry.suffix)) {
					names.push(entry.name.slice(0, -collection.entry.suffix.length));
				}
				continue;
			}
			if (!entry.isDirectory()) {
				continue;
			}
			const marker = await lstat(
				path.join(collectionRoot, entry.name, collection.entry.marker),
			).catch(() => undefined);
			if (marker?.isFile()) {
				names.push(entry.name);
			}
		}
		names.sort();
		for (const name of names) {
			ids.push(
				collection.artifactKind === "skill"
					? name
					: `${collection.name}:${name}`,
			);
		}
	}
	return ids;
}

export function requireArtifact(
	artifacts: readonly Artifact[],
	kind: Artifact["kind"],
): Artifact {
	const artifact = artifacts.find((candidate) => candidate.kind === kind);
	if (artifact === undefined) {
		throw new Error(`repository has no ${kind} artifact to exercise`);
	}
	return artifact;
}

/** Unique destination directories each collection receives for the given clients. */
export function destinationCountsForClients(
	catalog: InstallCatalog,
	clientNames: readonly string[],
): ReadonlyMap<string, number> {
	const directoriesByCollection = new Map<string, Set<string>>();
	for (const clientName of clientNames) {
		const client = catalog.clients.find(
			(candidate) => candidate.name === clientName,
		);
		if (client === undefined) {
			throw new Error(`unknown client: ${clientName}`);
		}
		for (const destination of client.destinations) {
			const directories =
				directoriesByCollection.get(destination.collection) ?? new Set();
			directories.add(destination.path);
			directoriesByCollection.set(destination.collection, directories);
		}
	}
	return new Map(
		Array.from(directoriesByCollection, ([collection, directories]) => [
			collection,
			directories.size,
		]),
	);
}

export function expectedLinkCount(
	artifacts: readonly Artifact[],
	destinationCounts: ReadonlyMap<string, number>,
): number {
	return artifacts.reduce(
		(total, artifact) =>
			total + (destinationCounts.get(artifact.collection) ?? 0),
		0,
	);
}

export function clientsForCollection(
	catalog: InstallCatalog,
	collection: string,
): readonly string[] {
	return catalog.clients
		.filter((client) =>
			client.destinations.some(
				(destination) => destination.collection === collection,
			),
		)
		.map((client) => client.name);
}

export function requireClientForCollection(
	catalog: InstallCatalog,
	collection: string,
): string {
	const [client] = clientsForCollection(catalog, collection);
	if (client === undefined) {
		throw new Error(`no client installs collection: ${collection}`);
	}
	return client;
}
