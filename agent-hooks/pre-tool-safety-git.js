/**
 * Git and GitHub mutation policy checker for agent tool use.
 *
 * Identifies mutating MCP/tool operations (such as creating PRs, branches, or modifying files via GitHub MCP tools)
 * and delegates shell command checks to checkCommandForNonReadGit in deny-non-read-git.js.
 *
 * deny-non-read-git.js parses command tokens and strictly enforces that git operations are limited
 * to read-only subcommands (e.g. status, diff, log) unless explicitly confirmed by the user.
 */
import { checkCommandForNonReadGit } from "./deny-non-read-git.js";

export { checkCommandForNonReadGit };

export function checkGitPolicy(command) {
	return checkCommandForNonReadGit(command);
}

export function checkGitHubMutationPolicy(toolName) {
	const mutatingTools = new Set([
		"github-pull-request_create_pull_request",
		"mcp_github_mcp_se_create_branch",
		"mcp_github_mcp_se_create_or_update_file",
		"mcp_github_mcp_se_create_repository",
		"mcp_github_mcp_se_delete_file",
		"mcp_github_mcp_se_push_files",
	]);

	return mutatingTools.has(toolName)
		? `Mutating Git/GitHub tool '${toolName}' requires user confirmation.`
		: null;
}
