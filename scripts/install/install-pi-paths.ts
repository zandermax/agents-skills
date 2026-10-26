import os from "node:os";
import path from "node:path";

export interface PiLinkTarget {
	readonly name: string;
	readonly sourcePath: string;
	readonly destinationPath: string;
}

export function getPiLinkTargets(
	repoRoot: string,
	piHome: string,
): readonly PiLinkTarget[] {
	return [
		{
			name: "skills",
			sourcePath: path.resolve(repoRoot, "skills"),
			destinationPath: path.resolve(piHome, "skills"),
		},
		{
			name: "agents",
			sourcePath: path.resolve(repoRoot, "agents"),
			destinationPath: path.resolve(piHome, "agents"),
		},
	];
}

export function getLegacyPiLinkTargets(
	repoRoot: string,
	piHome: string,
): readonly PiLinkTarget[] {
	return [
		{
			name: "agent",
			sourcePath: path.resolve(repoRoot, "agents"),
			destinationPath: path.resolve(piHome, "agent"),
		},
		{
			name: "legacy-agent-claude",
			sourcePath: path.resolve(repoRoot, ".claude/agents"),
			destinationPath: path.resolve(piHome, "agent"),
		},
		{
			name: "skills-parent",
			sourcePath: path.resolve(repoRoot, "skills"),
			destinationPath: path.resolve(path.dirname(piHome), "skills"),
		},
		{
			name: "legacy-skills-parent",
			sourcePath: path.resolve(repoRoot, ".agents/skills"),
			destinationPath: path.resolve(path.dirname(piHome), "skills"),
		},
		{
			name: "agents-parent",
			sourcePath: path.resolve(repoRoot, "agents"),
			destinationPath: path.resolve(path.dirname(piHome), "agents"),
		},
		{
			name: "legacy-agents-parent",
			sourcePath: path.resolve(repoRoot, ".claude/agents"),
			destinationPath: path.resolve(path.dirname(piHome), "agents"),
		},
		{
			name: "legacy-skills",
			sourcePath: path.resolve(repoRoot, ".agents/skills"),
			destinationPath: path.resolve(piHome, "skills"),
		},
		{
			name: "legacy-agents",
			sourcePath: path.resolve(repoRoot, ".claude/agents"),
			destinationPath: path.resolve(piHome, "agents"),
		},
	];
}

export function resolvePiHome(baseHome?: string): string {
	const envAgentDir = process.env.PI_CODING_AGENT_DIR;
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
		process.env.PI_HOME ??
		os.homedir();
	return path.join(home, ".pi", "agent");
}
