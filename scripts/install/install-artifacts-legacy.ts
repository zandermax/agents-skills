import path from "node:path";

import type { ArtifactRequest } from "../../src/lib/artifacts/artifact-selection.js";
import type { ResolvedLink } from "../../src/lib/artifacts/install-artifacts.js";

export interface LegacyArtifactLinks {
	readonly roots: readonly ResolvedLink[];
	readonly artifacts: readonly ResolvedLink[];
}

export function buildLegacyLinks(
	request: ArtifactRequest,
	repoRoot: string,
	homeDirectory: string,
	includeMemory: boolean,
	cleanLegacyDiscovery: boolean,
): LegacyArtifactLinks {
	const roots: ResolvedLink[] = [
		...request.targets
			.filter((target) => includeMemory && target.collection !== "hooks")
			.flatMap((target) => {
				const sources =
					target.collection === "skills"
						? [".agents/skills", "skills"]
						: [".github/agents", ".claude/agents", "agents"];
				return sources.map((source) => ({
					kind: "directory" as const,
					sourcePath: path.join(repoRoot, source),
					destinationPath: target.directory,
				}));
			}),
		...(cleanLegacyDiscovery
			? [
					{
						kind: "directory" as const,
						sourcePath: path.join(repoRoot, ".agents/skills"),
						destinationPath: path.join(homeDirectory, ".copilot/skills"),
					},
					{
						kind: "directory" as const,
						sourcePath: path.join(repoRoot, "skills"),
						destinationPath: path.join(homeDirectory, ".copilot/skills"),
					},
					{
						kind: "directory" as const,
						sourcePath: path.join(repoRoot, ".github/agents"),
						destinationPath: path.join(homeDirectory, ".copilot/agents"),
					},
					{
						kind: "directory" as const,
						sourcePath: path.join(repoRoot, ".claude/agents"),
						destinationPath: path.join(homeDirectory, ".copilot/agents"),
					},
					{
						kind: "directory" as const,
						sourcePath: path.join(repoRoot, "agents"),
						destinationPath: path.join(homeDirectory, ".copilot/agents"),
					},
					{
						kind: "directory" as const,
						sourcePath: path.join(repoRoot, ".agents/skills"),
						destinationPath: path.join(homeDirectory, ".agents/skills"),
					},
					{
						kind: "directory" as const,
						sourcePath: path.join(repoRoot, "skills"),
						destinationPath: path.join(homeDirectory, ".agents/skills"),
					},
				]
			: []),
	];
	const artifacts: ResolvedLink[] = [];
	for (const target of request.targets) {
		const targetArtifacts = request.artifacts.filter(
			(artifact) => artifact.collection === target.collection,
		);
		if (target.linkMode === "directory") {
			if (target.collection === "hooks") {
				for (const source of [
					".github/hooks",
					".agents/hooks",
					"agent-hooks",
				]) {
					artifacts.push({
						kind: "directory",
						sourcePath: path.join(repoRoot, source),
						destinationPath: target.directory,
					});
				}
			}
		} else {
			for (const artifact of targetArtifacts) {
				const legacySources =
					artifact.kind === "skill"
						? [path.join(repoRoot, ".agents/skills", artifact.name)]
						: artifact.kind === "agent"
							? [
									path.join(
										repoRoot,
										".claude/agents",
										artifact.destinationName,
									),
									path.join(
										repoRoot,
										".github/agents",
										artifact.destinationName,
									),
								]
							: [];
				for (const sourcePath of legacySources) {
					artifacts.push({
						kind: artifact.entryKind,
						sourcePath,
						destinationPath: path.join(
							target.directory,
							artifact.destinationName,
						),
					});
				}
			}
		}
	}
	return { roots, artifacts };
}
