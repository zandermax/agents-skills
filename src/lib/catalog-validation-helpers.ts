import path from "node:path";

export const CATALOG_KEYS = new Set(["collections", "clients"]);
export const COLLECTION_KEYS = new Set([
	"name",
	"artifactKind",
	"source",
	"entry",
	"validation",
	"linkMode",
]);
export const DIRECTORY_ENTRY_KEYS = new Set(["kind", "marker"]);
export const FILE_ENTRY_KEYS = new Set(["kind", "suffix"]);
export const ENTRY_KEYS = new Set(["kind", "marker", "suffix"]);
export const CLIENT_KEYS = new Set(["name", "destinations"]);
export const DESTINATION_KEYS = new Set(["collection", "path"]);
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	return value !== null && !Array.isArray(value) && typeof value === "object";
}

export function isWithinRepo(repoRoot: string, targetPath: string): boolean {
	const relativePath = path.relative(repoRoot, targetPath);
	return (
		relativePath === "" ||
		(!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
	);
}

export function addUnknownKeyErrors(
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

export function parseName(
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
