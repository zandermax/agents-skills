import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseInstallCatalog } from "./catalog-validation.js";

export type ArtifactKind = "skill" | "agent" | "hook";
export type ValidationStrategy = "copilot-agent";
export type CollectionLinkMode = "entries" | "directory";

export type CollectionEntryRule =
	| { readonly kind: "directory"; readonly marker: string }
	| { readonly kind: "file"; readonly suffix: string };

export interface ArtifactCollection {
	readonly name: string;
	readonly artifactKind: ArtifactKind;
	readonly source: string;
	readonly entry: CollectionEntryRule;
	readonly validation?: ValidationStrategy;
	readonly linkMode?: CollectionLinkMode;
}

export interface ClientDestination {
	readonly collection: string;
	readonly path: string;
}

export interface CatalogClient {
	readonly name: string;
	readonly destinations: readonly ClientDestination[];
}

export interface InstallCatalog {
	readonly collections: readonly ArtifactCollection[];
	readonly clients: readonly CatalogClient[];
}

export { parseInstallCatalog };

export async function loadInstallCatalog(
	repoRoot: string,
): Promise<InstallCatalog> {
	const catalogPath = path.join(repoRoot, "install-catalog.json");
	let value: unknown;
	try {
		value = JSON.parse(await readFile(catalogPath, "utf8"));
	} catch (error) {
		throw new Error(`${catalogPath}: unable to read catalog`, { cause: error });
	}

	return parseInstallCatalog(value, catalogPath, repoRoot);
}
