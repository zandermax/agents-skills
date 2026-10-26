import os from "node:os";
import path from "node:path";

export interface OmpLinkTarget {
	readonly name: string;
	readonly sourcePath: string;
	readonly destinationPath: string;
}

export function getOmpLinkTargets(
	repoRoot: string,
	ompHome: string,
): readonly OmpLinkTarget[] {
	return [
		{
			name: "skills",
			sourcePath: path.resolve(repoRoot, "skills"),
			destinationPath: path.resolve(ompHome, "skills"),
		},
		{
			name: "agents",
			sourcePath: path.resolve(repoRoot, "agents"),
			destinationPath: path.resolve(ompHome, "agents"),
		},
	];
}

export function getLegacyOmpLinkTargets(
	repoRoot: string,
	ompHome: string,
): readonly OmpLinkTarget[] {
	return [
		{
			name: "agent",
			sourcePath: path.resolve(repoRoot, "agents"),
			destinationPath: path.resolve(ompHome, "agent"),
		},
		{
			name: "legacy-agent-claude",
			sourcePath: path.resolve(repoRoot, ".claude/agents"),
			destinationPath: path.resolve(ompHome, "agent"),
		},
		{
			name: "skills-parent",
			sourcePath: path.resolve(repoRoot, "skills"),
			destinationPath: path.resolve(path.dirname(ompHome), "skills"),
		},
		{
			name: "legacy-skills-parent",
			sourcePath: path.resolve(repoRoot, ".agents/skills"),
			destinationPath: path.resolve(path.dirname(ompHome), "skills"),
		},
		{
			name: "agents-parent",
			sourcePath: path.resolve(repoRoot, "agents"),
			destinationPath: path.resolve(path.dirname(ompHome), "agents"),
		},
		{
			name: "legacy-agents-parent",
			sourcePath: path.resolve(repoRoot, ".claude/agents"),
			destinationPath: path.resolve(path.dirname(ompHome), "agents"),
		},
		{
			name: "legacy-skills",
			sourcePath: path.resolve(repoRoot, ".agents/skills"),
			destinationPath: path.resolve(ompHome, "skills"),
		},
		{
			name: "legacy-agents",
			sourcePath: path.resolve(repoRoot, ".claude/agents"),
			destinationPath: path.resolve(ompHome, "agents"),
		},
	];
}

export function resolveOmpHome(baseHome?: string): string {
	const envAgentDir =
		process.env.OMP_CODING_AGENT_DIR ?? process.env.PI_CODING_AGENT_DIR;
	if (envAgentDir && envAgentDir.trim().length > 0) {
		const trimmed = envAgentDir.trim();
		if (trimmed === "~") {
			return os.homedir();
		}
		if (trimmed.startsWith("~/")) {
			return path.normalize(path.resolve(os.homedir(), trimmed.slice(2)));
		}
		return path.normalize(path.resolve(trimmed));
	}
	const home =
		baseHome ??
		process.env.AGENTS_SKILLS_HOME ??
		process.env.OMP_HOME ??
		process.env.PI_HOME ??
		os.homedir();
	return path.join(home, ".omp", "agent");
}
