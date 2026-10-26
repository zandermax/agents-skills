import path from "node:path";

import type {
	ArtifactCollection,
	CatalogClient,
	ClientDestination,
	InstallCatalog,
} from "./catalog.js";
import { parseCollection } from "./catalog-collections.js";
import {
	addUnknownKeyErrors,
	CATALOG_KEYS,
	CLIENT_KEYS,
	DESTINATION_KEYS,
	isPlainObject,
	parseName,
} from "./catalog-validation-helpers.js";

function parseDestination(
	value: unknown,
	label: string,
	collectionsByName: ReadonlyMap<string, ArtifactCollection>,
	seenPaths: Map<string, string>,
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
	}

	let destinationPath: string | undefined;
	if (typeof value.path !== "string") {
		errors.push(`${label}.path: must be a string`);
	} else {
		destinationPath = value.path;
		if (!destinationPath.startsWith("~/") || destinationPath.length === 2) {
			errors.push(`${label}.path: must begin with ~/`);
		}
		if (
			seenPaths.has(destinationPath) &&
			seenPaths.get(destinationPath) !== collection
		) {
			errors.push(`${label}.path: duplicate destination: ${destinationPath}`);
		} else if (collection !== undefined) {
			seenPaths.set(destinationPath, collection);
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
	seenPaths: Map<string, string>,
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
	const destinationPaths = new Map<string, string>();
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
