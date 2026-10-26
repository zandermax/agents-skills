import fs from "node:fs";
import path from "node:path";

import type { SectionOwner } from "./manifests.js";

export const MANIFEST_KEYS = new Set([
	"name",
	"title",
	"description",
	"disable-model-invocation",
	"output",
	"selections",
	"sectionOwnership",
	"requiredPhrases",
	"forbiddenPhrases",
]);

export const SELECTION_KEYS = new Set([
	"source",
	"owner",
	"headings",
	"transforms",
]);
export const OWNERS = new Set<SectionOwner>(["core", "official", "skill"]);

export function createManifestError(
	manifestPath: string,
	message: string,
): Error {
	return new Error(`${manifestPath}: ${message}`);
}

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	return value !== null && !Array.isArray(value) && typeof value === "object";
}

export function assertAllowedKeys(
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

export function assertString(
	value: unknown,
	manifestPath: string,
	label: string,
): string {
	if (typeof value !== "string") {
		throw createManifestError(manifestPath, `${label} must be a string`);
	}

	return value;
}

export function assertStringArray(
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

export function isWithinRepo(repoRoot: string, targetPath: string): boolean {
	const relativePath = path.relative(repoRoot, targetPath);
	return (
		relativePath === "" ||
		(!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
	);
}

export function resolveAndValidateExistingPath(
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

export function parseSectionOwner(
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
