import { readFile } from "node:fs/promises";

import type { Artifact } from "../lib/artifacts.js";
import type { InstallCatalog } from "../lib/catalog.js";
import { parseFrontmatter } from "../lib/frontmatter.js";
import { listSections } from "../lib/markdown-sections.js";
import { missingAgentBaselineTools, toRelativePath } from "./shared.js";

export async function validateAgents(
	repoRoot: string,
	catalog: InstallCatalog | undefined,
	artifacts: readonly Artifact[],
	skillHeadings: ReadonlyMap<string, ReadonlySet<string>>,
	errors: string[],
): Promise<void> {
	const validationByCollection = new Map(
		catalog?.collections.map((collection) => [
			collection.name,
			collection.validation,
		]),
	);
	for (const artifact of artifacts) {
		if (
			artifact.kind !== "agent" ||
			validationByCollection.get(artifact.collection) !== "copilot-agent"
		) {
			continue;
		}

		const agentFile = artifact.sourcePath;
		const relativePath = toRelativePath(repoRoot, agentFile);
		try {
			const content = await readFile(agentFile, "utf8");
			const parsed = parseFrontmatter(content, relativePath);

			for (const tool of missingAgentBaselineTools(parsed.attributes.tools)) {
				errors.push(
					`${relativePath}: agent tools missing required baseline tool ${tool}`,
				);
			}

			const agentDescription = parsed.attributes.description;
			if (typeof agentDescription === "string") {
				if (agentDescription.length > 80) {
					errors.push(
						`${relativePath}: frontmatter description length ${agentDescription.length} exceeds 80 characters`,
					);
				}
				if (/^(?:use|run|call)\b/i.test(agentDescription)) {
					errors.push(
						`${relativePath}: frontmatter description must be a description of the agent itself, not an instruction starting with Use, Run, or Call`,
					);
				}
				if (/\busers?\b/i.test(agentDescription)) {
					errors.push(
						`${relativePath}: frontmatter description must not mention user or users`,
					);
				}
			}

			const declaredSkills = new Set<string>();
			const declarationPattern =
				/\*\*REQUIRED SKILL:\*\*\s+Use\s+([a-z0-9]+(?:-[a-z0-9]+)*)/g;
			for (const match of parsed.body.matchAll(declarationPattern)) {
				if (match[1] !== undefined) {
					declaredSkills.add(match[1]);
				}
			}

			const declaredHeadings = new Set<string>();
			for (const skillName of declaredSkills) {
				const headings = skillHeadings.get(skillName);
				if (headings === undefined) {
					errors.push(
						`${relativePath}: declared REQUIRED SKILL does not exist: ${skillName}`,
					);
					continue;
				}
				for (const heading of headings) {
					declaredHeadings.add(heading);
				}
			}

			const agentSections = listSections(parsed.body);
			for (const section of agentSections) {
				if (declaredHeadings.has(section.heading)) {
					errors.push(
						`${relativePath}: duplicate canonical heading in thin agent: ${section.heading}`,
					);
				}
			}
		} catch (error) {
			errors.push(
				error instanceof Error
					? `${relativePath}: ${error.message}`
					: `${relativePath}: ${String(error)}`,
			);
		}
	}
}
