import fs from "node:fs";
import path from "node:path";

import type {
	ArtifactCollection,
	ArtifactKind,
	CollectionEntryRule,
	CollectionLinkMode,
	ValidationStrategy,
} from "./catalog.js";
import {
	addUnknownKeyErrors,
	COLLECTION_KEYS,
	DIRECTORY_ENTRY_KEYS,
	ENTRY_KEYS,
	FILE_ENTRY_KEYS,
	isPlainObject,
	isWithinRepo,
	parseName,
} from "./catalog-validation-helpers.js";

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

export function parseCollection(
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
	if (
		value.artifactKind === "skill" ||
		value.artifactKind === "agent" ||
		value.artifactKind === "hook"
	) {
		artifactKind = value.artifactKind;
	} else {
		errors.push(`${label}.artifactKind: must be one of: skill, agent, hook`);
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

	let linkMode: CollectionLinkMode | undefined;
	if (value.linkMode !== undefined) {
		if (value.linkMode === "entries" || value.linkMode === "directory") {
			linkMode = value.linkMode;
		} else {
			errors.push(`${label}.linkMode: must be one of: entries, directory`);
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

	const collection: ArtifactCollection = {
		name,
		artifactKind,
		source,
		entry,
		...(validation !== undefined ? { validation } : {}),
		...(linkMode !== undefined ? { linkMode } : {}),
	};
	return Object.freeze(collection);
}
