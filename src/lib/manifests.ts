import fs from "node:fs";
import path from "node:path";

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
	readonly output: string;
	readonly selections: readonly SourceSelection[];
	readonly sectionOwnership: Readonly<Record<string, SectionOwner>>;
	readonly requiredPhrases: readonly string[];
	readonly forbiddenPhrases: readonly string[];
}

const MANIFEST_KEYS = new Set([
	"name",
	"title",
	"description",
	"output",
	"selections",
	"sectionOwnership",
	"requiredPhrases",
	"forbiddenPhrases",
]);

const SELECTION_KEYS = new Set(["source", "owner", "headings", "transforms"]);
const OWNERS = new Set<SectionOwner>(["core", "official", "skill"]);

function createManifestError(manifestPath: string, message: string): Error {
	return new Error(`${manifestPath}: ${message}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && !Array.isArray(value) && typeof value === "object";
}

function assertAllowedKeys(
	value: Record<string, unknown>,
	allowed: ReadonlySet<string>,
	manifestPath: string,
	label: string,
): void {
	for (const key of Object.keys(value)) {
		if (!allowed.has(key)) {
			throw createManifestError(
				manifestPath,
				`${label} has unknown key: ${key}`,
			);
		}
	}
}

function assertString(
	value: unknown,
	manifestPath: string,
	label: string,
): string {
	if (typeof value !== "string") {
		throw createManifestError(manifestPath, `${label} must be a string`);
	}

	return value;
}

function assertStringArray(
	value: unknown,
	manifestPath: string,
	label: string,
	options: { readonly nonEmpty: boolean },
): readonly string[] {
	if (!Array.isArray(value)) {
		throw createManifestError(manifestPath, `${label} must be an array`);
	}

	if (options.nonEmpty && value.length === 0) {
		throw createManifestError(manifestPath, `${label} must be nonempty`);
	}

	const strings: string[] = [];

	for (let index = 0; index < value.length; index += 1) {
		const item = value[index];
		if (typeof item !== "string") {
			throw createManifestError(
				manifestPath,
				`${label}[${index}] must be a string`,
			);
		}

		if (item.length === 0) {
			throw createManifestError(
				manifestPath,
				`${label}[${index}] must be non-empty`,
			);
		}

		strings.push(item);
	}

	return strings;
}

function isWithinRepo(repoRoot: string, targetPath: string): boolean {
	const relativePath = path.relative(repoRoot, targetPath);
	return (
		relativePath === "" ||
		(!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
	);
}

function resolveAndValidateExistingPath(
	manifestPath: string,
	repoRoot: string,
	baseDir: string,
	relativePath: string,
	label: string,
): void {
	const resolved = path.resolve(baseDir, relativePath);

	if (!isWithinRepo(repoRoot, resolved)) {
		throw createManifestError(
			manifestPath,
			`${label} must resolve inside repository: ${relativePath}`,
		);
	}

	if (!fs.existsSync(resolved)) {
		throw createManifestError(
			manifestPath,
			`${label} does not exist: ${relativePath}`,
		);
	}
}

function parseSectionOwner(
	value: unknown,
	manifestPath: string,
	label: string,
): SectionOwner {
	if (value !== "core" && value !== "official" && value !== "skill") {
		throw createManifestError(
			manifestPath,
			`${label} must be one of: core, official, skill`,
		);
	}

	return value;
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
	if (!description.startsWith("Use when")) {
		throw createManifestError(
			manifestPath,
			"description must begin with Use when",
		);
	}

	const output = assertString(value.output, manifestPath, "output");
	const expectedOutput = `.agents/skills/${name}/SKILL.md`;
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
