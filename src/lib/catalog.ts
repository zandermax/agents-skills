import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type ArtifactKind = "skill" | "agent";
export type ValidationStrategy = "copilot-agent";

export type CollectionEntryRule =
	| { readonly kind: "directory"; readonly marker: string }
	| { readonly kind: "file"; readonly suffix: string };

export interface ArtifactCollection {
	readonly name: string;
	readonly artifactKind: ArtifactKind;
	readonly source: string;
	readonly entry: CollectionEntryRule;
	readonly validation?: ValidationStrategy;
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

const CATALOG_KEYS = new Set(["collections", "clients"]);
const COLLECTION_KEYS = new Set([
	"name",
	"artifactKind",
	"source",
	"entry",
	"validation",
]);
const DIRECTORY_ENTRY_KEYS = new Set(["kind", "marker"]);
const FILE_ENTRY_KEYS = new Set(["kind", "suffix"]);
const ENTRY_KEYS = new Set(["kind", "marker", "suffix"]);
const CLIENT_KEYS = new Set(["name", "destinations"]);
const DESTINATION_KEYS = new Set(["collection", "path"]);
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && !Array.isArray(value) && typeof value === "object";
}

function isWithinRepo(repoRoot: string, targetPath: string): boolean {
	const relativePath = path.relative(repoRoot, targetPath);
	return (
		relativePath === "" ||
		(!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
	);
}

function addUnknownKeyErrors(
	value: Record<string, unknown>,
	allowed: ReadonlySet<string>,
	label: string,
	errors: string[],
): void {
	for (const key of Object.keys(value)) {
		if (!allowed.has(key)) {
			errors.push(`${label}.${key}: unknown key`);
		}
	}
}

function parseName(
	value: unknown,
	label: string,
	seen: Set<string>,
	errors: string[],
): string | undefined {
	if (typeof value !== "string") {
		errors.push(`${label}: must be a string`);
		return undefined;
	}

	if (!KEBAB_CASE.test(value)) {
		errors.push(`${label}: must be a nonempty kebab-case name`);
		return undefined;
	}

	if (seen.has(value)) {
		errors.push(`${label}: duplicate name: ${value}`);
		return undefined;
	}

	seen.add(value);
	return value;
}

function parseEntryRule(
	value: unknown,
	label: string,
	errors: string[],
): CollectionEntryRule | undefined {
	if (!isPlainObject(value)) {
		errors.push(`${label}: must be an object`);
		return undefined;
	}

	const kind = value.kind;
	const allowed =
		kind === "directory"
			? DIRECTORY_ENTRY_KEYS
			: kind === "file"
				? FILE_ENTRY_KEYS
				: ENTRY_KEYS;
	addUnknownKeyErrors(value, allowed, label, errors);

	if (kind === "directory") {
		if (typeof value.marker !== "string") {
			errors.push(`${label}.marker: must be a string`);
			return undefined;
		}
		if (value.marker.length === 0) {
			errors.push(`${label}.marker: must be nonempty`);
			return undefined;
		}
		if (path.basename(value.marker) !== value.marker) {
			errors.push(`${label}.marker: must be a file name`);
			return undefined;
		}

		return Object.freeze({ kind, marker: value.marker });
	}

	if (kind === "file") {
		if (typeof value.suffix !== "string") {
			errors.push(`${label}.suffix: must be a string`);
			return undefined;
		}
		if (value.suffix.length === 0) {
			errors.push(`${label}.suffix: must be nonempty`);
			return undefined;
		}

		return Object.freeze({ kind, suffix: value.suffix });
	}

	errors.push(`${label}.kind: must be one of: directory, file`);
	return undefined;
}

function parseCollection(
	value: unknown,
	index: number,
	repoRoot: string,
	seenNames: Set<string>,
	errors: string[],
): ArtifactCollection | undefined {
	const label = `catalog.collections[${index}]`;
	if (!isPlainObject(value)) {
		errors.push(`${label}: must be an object`);
		return undefined;
	}

	addUnknownKeyErrors(value, COLLECTION_KEYS, label, errors);
	const name = parseName(value.name, `${label}.name`, seenNames, errors);

	let artifactKind: ArtifactKind | undefined;
	if (value.artifactKind === "skill" || value.artifactKind === "agent") {
		artifactKind = value.artifactKind;
	} else {
		errors.push(`${label}.artifactKind: must be one of: skill, agent`);
	}

	let source: string | undefined;
	if (typeof value.source !== "string") {
		errors.push(`${label}.source: must be a string`);
	} else if (value.source.length === 0) {
		errors.push(`${label}.source: must be nonempty`);
	} else {
		source = value.source;
		const resolvedSource = path.resolve(repoRoot, source);
		if (!isWithinRepo(repoRoot, resolvedSource)) {
			errors.push(`${label}.source: must resolve inside repository`);
		} else {
			try {
				if (!fs.statSync(resolvedSource).isDirectory()) {
					errors.push(`${label}.source: must be an existing directory`);
				}
			} catch {
				errors.push(`${label}.source: does not exist: ${source}`);
			}
		}
	}

	const entry = parseEntryRule(value.entry, `${label}.entry`, errors);
	if (
		artifactKind === "skill" &&
		(entry?.kind !== "directory" || entry.marker !== "SKILL.md")
	) {
		errors.push(
			`${label}.entry: skill collections must use directory marker SKILL.md`,
		);
	}

	let validation: ValidationStrategy | undefined;
	if (value.validation !== undefined) {
		if (value.validation === "copilot-agent") {
			validation = value.validation;
		} else {
			errors.push(
				`${label}.validation: must be the supported strategy copilot-agent`,
			);
		}
	}

	if (
		name === undefined ||
		artifactKind === undefined ||
		source === undefined ||
		entry === undefined
	) {
		return undefined;
	}

	const collection: ArtifactCollection =
		validation === undefined
			? { name, artifactKind, source, entry }
			: { name, artifactKind, source, entry, validation };
	return Object.freeze(collection);
}

function parseDestination(
	value: unknown,
	label: string,
	clientName: string | undefined,
	collectionsByName: ReadonlyMap<string, ArtifactCollection>,
	seenPaths: Set<string>,
	errors: string[],
): ClientDestination | undefined {
	if (!isPlainObject(value)) {
		errors.push(`${label}: must be an object`);
		return undefined;
	}

	addUnknownKeyErrors(value, DESTINATION_KEYS, label, errors);

	let collection: string | undefined;
	if (typeof value.collection !== "string") {
		errors.push(`${label}.collection: must be a string`);
	} else if (!collectionsByName.has(value.collection)) {
		errors.push(`${label}.collection: unknown collection: ${value.collection}`);
	} else {
		collection = value.collection;
		const collectionEntry = collectionsByName.get(collection);
		if (
			collectionEntry?.artifactKind === "agent" &&
			clientName !== undefined &&
			collectionEntry.name !== clientName
		) {
			errors.push(
				`${label}.collection: agent format ${collectionEntry.name} does not match client ${clientName}`,
			);
		}
	}

	let destinationPath: string | undefined;
	if (typeof value.path !== "string") {
		errors.push(`${label}.path: must be a string`);
	} else {
		destinationPath = value.path;
		if (!destinationPath.startsWith("~/") || destinationPath.length === 2) {
			errors.push(`${label}.path: must begin with ~/`);
		}
		if (seenPaths.has(destinationPath)) {
			errors.push(`${label}.path: duplicate destination: ${destinationPath}`);
		} else {
			seenPaths.add(destinationPath);
		}
	}

	if (collection === undefined || destinationPath === undefined) {
		return undefined;
	}

	return Object.freeze({ collection, path: destinationPath });
}

function parseClient(
	value: unknown,
	index: number,
	collectionsByName: ReadonlyMap<string, ArtifactCollection>,
	seenNames: Set<string>,
	seenPaths: Set<string>,
	errors: string[],
): CatalogClient | undefined {
	const label = `catalog.clients[${index}]`;
	if (!isPlainObject(value)) {
		errors.push(`${label}: must be an object`);
		return undefined;
	}

	addUnknownKeyErrors(value, CLIENT_KEYS, label, errors);
	const name = parseName(value.name, `${label}.name`, seenNames, errors);

	if (!Array.isArray(value.destinations)) {
		errors.push(`${label}.destinations: must be an array`);
		return undefined;
	}

	const destinations: ClientDestination[] = [];
	for (
		let destinationIndex = 0;
		destinationIndex < value.destinations.length;
		destinationIndex += 1
	) {
		const destination = parseDestination(
			value.destinations[destinationIndex],
			`${label}.destinations[${destinationIndex}]`,
			name,
			collectionsByName,
			seenPaths,
			errors,
		);
		if (destination !== undefined) {
			destinations.push(destination);
		}
	}

	if (name === undefined) {
		return undefined;
	}

	return Object.freeze({ name, destinations: Object.freeze(destinations) });
}

export function parseInstallCatalog(
	value: unknown,
	sourceName: string,
	repoRoot: string,
): InstallCatalog {
	const errors: string[] = [];
	if (!isPlainObject(value)) {
		throw new Error(`${sourceName}: catalog must be an object`);
	}

	addUnknownKeyErrors(value, CATALOG_KEYS, "catalog", errors);
	const absoluteRepoRoot = path.resolve(repoRoot);

	const collections: ArtifactCollection[] = [];
	const collectionNames = new Set<string>();
	if (!Array.isArray(value.collections)) {
		errors.push("catalog.collections: must be an array");
	} else {
		for (let index = 0; index < value.collections.length; index += 1) {
			const collection = parseCollection(
				value.collections[index],
				index,
				absoluteRepoRoot,
				collectionNames,
				errors,
			);
			if (collection !== undefined) {
				collections.push(collection);
			}
		}
	}

	const clients: CatalogClient[] = [];
	const clientNames = new Set<string>();
	const destinationPaths = new Set<string>();
	const collectionsByName = new Map(
		collections.map((collection) => [collection.name, collection] as const),
	);
	if (!Array.isArray(value.clients)) {
		errors.push("catalog.clients: must be an array");
	} else {
		for (let index = 0; index < value.clients.length; index += 1) {
			const client = parseClient(
				value.clients[index],
				index,
				collectionsByName,
				clientNames,
				destinationPaths,
				errors,
			);
			if (client !== undefined) {
				clients.push(client);
			}
		}
	}

	if (errors.length > 0) {
		throw new Error(
			`${sourceName}: catalog validation failed\n${errors.map((error) => `- ${error}`).join("\n")}`,
		);
	}

	return Object.freeze({
		collections: Object.freeze(collections),
		clients: Object.freeze(clients),
	});
}

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
