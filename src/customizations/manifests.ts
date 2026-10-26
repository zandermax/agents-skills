import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseSkillManifest } from "../lib/skills/manifests.js";
import {
	discoverManifestPaths,
	relativizeMessage,
	toRelativePath,
} from "./shared.js";

export async function validateManifests(
	repoRoot: string,
	errors: string[],
): Promise<void> {
	const manifests = await discoverManifestPaths(repoRoot);

	for (const manifestPath of manifests) {
		try {
			const raw = await readFile(manifestPath, "utf8");
			let manifestValue: unknown;
			try {
				manifestValue = JSON.parse(raw) as unknown;
			} catch (error) {
				const details = error instanceof Error ? error.message : String(error);
				throw new Error(`${manifestPath}: invalid JSON: ${details}`);
			}

			const parsed = parseSkillManifest(manifestValue, manifestPath, repoRoot);

			if (parsed.description.length > 80) {
				errors.push(
					`${toRelativePath(repoRoot, manifestPath)}: description length ${parsed.description.length} exceeds 80 characters`,
				);
			}

			if (/^(?:use|run|call)\b/i.test(parsed.description)) {
				errors.push(
					`${toRelativePath(repoRoot, manifestPath)}: description must be a description of the skill itself, not an instruction starting with Use, Run, or Call`,
				);
			}

			if (/\busers?\b/i.test(parsed.description)) {
				errors.push(
					`${toRelativePath(repoRoot, manifestPath)}: description must not mention user or users`,
				);
			}

			const folderName = path.basename(path.dirname(manifestPath));
			if (folderName !== parsed.name) {
				errors.push(
					`${toRelativePath(repoRoot, manifestPath)}: manifest folder name ${folderName} must match skill name ${parsed.name}`,
				);
			}
		} catch (error) {
			errors.push(
				relativizeMessage(
					repoRoot,
					error instanceof Error ? error.message : String(error),
				),
			);
		}
	}
}
