import path from "node:path";

import {
	assertAllowedKeys,
	assertString,
	assertStringArray,
	createManifestError,
	isPlainObject,
	isWithinRepo,
	MANIFEST_KEYS,
	OWNERS,
	parseSectionOwner,
	resolveAndValidateExistingPath,
	SELECTION_KEYS,
} from "./manifest-validation.js";

export type SectionOwner = "core" | "official" | "skill";

export interface SourceSelection {
	readonly source: string;
	readonly owner: SectionOwner;
	readonly headings: readonly string[];
	readonly transforms?: string;
}

export interface SkillManifest {
	readonly name: string;
	readonly title: string;
	readonly description: string;
	readonly disableModelInvocation?: boolean;
	readonly output: string;
	readonly selections: readonly SourceSelection[];
	readonly sectionOwnership: Readonly<Record<string, SectionOwner>>;
	readonly requiredPhrases: readonly string[];
	readonly forbiddenPhrases: readonly string[];
}

export function parseSkillManifest(
	value: unknown,
	manifestPath: string,
	repoRoot: string,
): SkillManifest {
	if (!isPlainObject(value)) {
		throw createManifestError(manifestPath, "manifest must be an object");
	}

	const absoluteRepoRoot = path.resolve(repoRoot);
	const absoluteManifestPath = path.resolve(manifestPath);
	if (!isWithinRepo(absoluteRepoRoot, absoluteManifestPath)) {
		throw createManifestError(
			manifestPath,
			"manifest path must be inside repository root",
		);
	}

	assertAllowedKeys(value, MANIFEST_KEYS, manifestPath, "manifest");

	const name = assertString(value.name, manifestPath, "name");
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
		throw createManifestError(
			manifestPath,
			"name must match kebab-case pattern [a-z0-9-]",
		);
	}

	const title = assertString(value.title, manifestPath, "title");
	if (title.length === 0 || title.trim() !== title || /[\r\n]/.test(title)) {
		throw createManifestError(
			manifestPath,
			"title must be a non-empty trimmed single-line string",
		);
	}

	const description = assertString(
		value.description,
		manifestPath,
		"description",
	);
	if (/^(?:use|run|call)\b/i.test(description)) {
		throw createManifestError(
			manifestPath,
			"description must be a description of the skill itself, not an instruction starting with Use, Run, or Call",
		);
	}
	if (/\busers?\b/i.test(description)) {
		throw createManifestError(
			manifestPath,
			"description must not mention the user or users",
		);
	}

	const disableModelInvocation = value["disable-model-invocation"];
	if (
		disableModelInvocation !== undefined &&
		typeof disableModelInvocation !== "boolean"
	) {
		throw createManifestError(
			manifestPath,
			"disable-model-invocation must be a boolean",
		);
	}
	if (disableModelInvocation !== undefined && disableModelInvocation !== true) {
		throw createManifestError(
			manifestPath,
			"disable-model-invocation must be true when present",
		);
	}

	const output = assertString(value.output, manifestPath, "output");
	const expectedOutput = `skills/${name}/SKILL.md`;
	if (output !== expectedOutput) {
		throw createManifestError(
			manifestPath,
			`output must be exactly ${expectedOutput}`,
		);
	}

	const selectionsValue = value.selections;
	if (!Array.isArray(selectionsValue)) {
		throw createManifestError(manifestPath, "selections must be an array");
	}

	if (selectionsValue.length === 0) {
		throw createManifestError(manifestPath, "selections must be nonempty");
	}

	const requiredPhrases = assertStringArray(
		value.requiredPhrases,
		manifestPath,
		"requiredPhrases",
		{
			nonEmpty: false,
		},
	);
	const forbiddenPhrases = assertStringArray(
		value.forbiddenPhrases,
		manifestPath,
		"forbiddenPhrases",
		{
			nonEmpty: false,
		},
	);

	const ownershipValue = value.sectionOwnership;
	if (!isPlainObject(ownershipValue)) {
		throw createManifestError(
			manifestPath,
			"sectionOwnership must be an object",
		);
	}

	const manifestDir = path.dirname(absoluteManifestPath);
	const selectedHeadings = new Map<string, SectionOwner>();
	const parsedSelections: SourceSelection[] = [];

	for (let index = 0; index < selectionsValue.length; index += 1) {
		const selectionValue = selectionsValue[index];

		if (!isPlainObject(selectionValue)) {
			throw createManifestError(
				manifestPath,
				`selections[${index}] must be an object`,
			);
		}

		assertAllowedKeys(
			selectionValue,
			SELECTION_KEYS,
			manifestPath,
			`selections[${index}]`,
		);

		const source = assertString(
			selectionValue.source,
			manifestPath,
			`selections[${index}].source`,
		);
		resolveAndValidateExistingPath(
			manifestPath,
			absoluteRepoRoot,
			manifestDir,
			source,
			`selections[${index}].source`,
		);

		const owner = parseSectionOwner(
			selectionValue.owner,
			manifestPath,
			`selections[${index}].owner`,
		);

		const headings = assertStringArray(
			selectionValue.headings,
			manifestPath,
			`selections[${index}].headings`,
			{ nonEmpty: true },
		);

		for (const heading of headings) {
			if (selectedHeadings.has(heading)) {
				throw createManifestError(
					manifestPath,
					`duplicate selected heading: ${heading}`,
				);
			}

			selectedHeadings.set(heading, owner);
		}

		Object.freeze(headings);

		const transformsValue = selectionValue.transforms;
		if (transformsValue !== undefined) {
			if (owner !== "official") {
				throw createManifestError(
					manifestPath,
					`selections[${index}].transforms is only allowed for official selections`,
				);
			}

			if (typeof transformsValue !== "string") {
				throw createManifestError(
					manifestPath,
					`selections[${index}].transforms must be a string`,
				);
			}

			resolveAndValidateExistingPath(
				manifestPath,
				absoluteRepoRoot,
				manifestDir,
				transformsValue,
				`selections[${index}].transforms`,
			);
		}

		const parsedSelection: SourceSelection =
			transformsValue === undefined
				? {
						source,
						owner,
						headings,
					}
				: {
						source,
						owner,
						headings,
						transforms: transformsValue,
					};

		Object.freeze(parsedSelection);
		parsedSelections.push(parsedSelection);
	}

	const sectionOwnership: Record<string, SectionOwner> = {};

	for (const heading of Object.keys(ownershipValue)) {
		const ownerValue = ownershipValue[heading];
		if (!OWNERS.has(ownerValue as SectionOwner)) {
			throw createManifestError(
				manifestPath,
				`sectionOwnership.${heading} must be one of: core, official, skill`,
			);
		}

		sectionOwnership[heading] = ownerValue as SectionOwner;
	}

	for (const [heading, owner] of selectedHeadings) {
		const assignedOwner = sectionOwnership[heading];
		if (assignedOwner === undefined) {
			throw createManifestError(
				manifestPath,
				`sectionOwnership is missing selected heading: ${heading}`,
			);
		}

		if (assignedOwner !== owner) {
			throw createManifestError(
				manifestPath,
				`sectionOwnership owner mismatch for heading ${heading}; expected ${owner} but found ${assignedOwner}`,
			);
		}
	}

	for (const heading of Object.keys(sectionOwnership)) {
		if (!selectedHeadings.has(heading)) {
			throw createManifestError(
				manifestPath,
				`sectionOwnership heading is not selected: ${heading}`,
			);
		}
	}

	Object.freeze(sectionOwnership);
	Object.freeze(parsedSelections);

	const parsed: SkillManifest = {
		name,
		title,
		description,
		...(disableModelInvocation !== undefined ? { disableModelInvocation } : {}),
		output,
		selections: parsedSelections,
		sectionOwnership,
		requiredPhrases,
		forbiddenPhrases,
	};

	Object.freeze(parsed.requiredPhrases);
	Object.freeze(parsed.forbiddenPhrases);

	return Object.freeze(parsed);
}
