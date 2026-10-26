import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Artifact } from "../lib/artifacts.js";
import type { InstallCatalog } from "../lib/catalog.js";
import { parseFrontmatter } from "../lib/frontmatter.js";
import { listSections } from "../lib/markdown-sections.js";
import {
	AGENT_ONLY_FRONTMATTER_KEYS,
	ALLOWED_SKILL_FRONTMATTER_KEYS,
	FORBIDDEN_SKILL_TOKENS,
	toRelativePath,
} from "./shared.js";

export async function validateSkills(
	repoRoot: string,
	catalog: InstallCatalog | undefined,
	artifacts: readonly Artifact[],
	errors: string[],
): Promise<Map<string, Set<string>>> {
	const skillHeadings = new Map<string, Set<string>>();

	for (const artifact of artifacts) {
		if (artifact.kind !== "skill") {
			continue;
		}

		const collection = catalog?.collections.find(
			(candidate) => candidate.name === artifact.collection,
		);
		if (collection?.entry.kind !== "directory") {
			errors.push(
				`${artifact.id}: skill artifact collection must use a directory entry`,
			);
			continue;
		}

		const skillFile = path.join(artifact.sourcePath, collection.entry.marker);
		const relativePath = toRelativePath(repoRoot, skillFile);
		try {
			const content = await readFile(skillFile, "utf8");
			const parsed = parseFrontmatter(content, relativePath);
			const name = parsed.attributes.name;

			if (typeof name !== "string" || name.length === 0) {
				errors.push(
					`${relativePath}: frontmatter name must be a non-empty string`,
				);
			} else {
				const folderName = path.basename(path.dirname(skillFile));
				if (folderName !== name) {
					errors.push(
						`${relativePath}: frontmatter name ${name} must match skill folder ${folderName}`,
					);
				}
			}

			const disableModelInvocation =
				parsed.attributes["disable-model-invocation"];
			if (
				disableModelInvocation !== undefined &&
				disableModelInvocation !== true
			) {
				errors.push(
					`${relativePath}: skill frontmatter disable-model-invocation must be true when present`,
				);
			}

			const description = parsed.attributes.description;
			if (typeof description === "string") {
				if (description.length > 80) {
					errors.push(
						`${relativePath}: frontmatter description length ${description.length} exceeds 80 characters`,
					);
				}
				if (/^(?:use|run|call)\b/i.test(description)) {
					errors.push(
						`${relativePath}: frontmatter description must be a description of the skill itself, not an instruction starting with Use, Run, or Call`,
					);
				}
				if (/\busers?\b/i.test(description)) {
					errors.push(
						`${relativePath}: frontmatter description must not mention user or users`,
					);
				}
			}

			for (const key of Object.keys(parsed.attributes)) {
				if (!ALLOWED_SKILL_FRONTMATTER_KEYS.has(key)) {
					errors.push(
						`${relativePath}: skill frontmatter has forbidden key ${key}`,
					);
				}

				if (AGENT_ONLY_FRONTMATTER_KEYS.has(key)) {
					errors.push(
						`${relativePath}: skill frontmatter must not include agent-only key ${key}`,
					);
				}
			}

			for (const token of FORBIDDEN_SKILL_TOKENS) {
				if (content.includes(token)) {
					errors.push(
						`${relativePath}: forbidden token in skill content: ${token}`,
					);
				}
			}

			const headings = new Set(
				listSections(parsed.body)
					.filter((section) => section.level >= 2)
					.map((section) => section.heading),
			);
			skillHeadings.set(artifact.id, headings);
		} catch (error) {
			errors.push(
				error instanceof Error
					? `${relativePath}: ${error.message}`
					: `${relativePath}: ${String(error)}`,
			);
		}
	}

	return skillHeadings;
}
