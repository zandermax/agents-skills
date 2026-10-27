// @ts-check

import { stringify } from "./yaml.mjs";

/** @typedef {import("./history-git.mjs").BranchRecord} BranchRecord */
/** @typedef {import("./history-git.mjs").CommitRecord} CommitRecord */

/** @param {CommitRecord[]} entries */
function serializeEntries(entries) {
	return entries.map((entry) => ({
		committed_at: entry.committedAt,
		subject: entry.subject,
		decisions: entry.decisions ?? [],
	}));
}

/**
 * @param {{
 *   updatedAt: string, mainBranch: string, threshold: number,
 *   branches: BranchRecord[], entries: CommitRecord[],
 *   domainPaths?: string[] | null, hasUnrecordedNote?: boolean
 * }} options
 */
export function formatHistoryDocument({
	updatedAt,
	mainBranch,
	threshold,
	branches,
	entries,
	domainPaths = null,
	hasUnrecordedNote = false,
}) {
	const data = {
		status: {
			updated_at: updatedAt,
			main_branch: mainBranch,
			branch_warning_threshold: threshold,
			branches: branches.map((branch) => ({
				branch_name: branch.branchName,
				committed_at: branch.committedAt,
				subject: branch.subject,
				status: branch.status,
				planning_doc: branch.planningDoc,
				ref: branch.ref,
			})),
		},
		...(domainPaths
			? { domains: domainPaths }
			: { log: serializeEntries(entries) }),
	};
	let content = stringify(data, { lineWidth: 0 });
	if (hasUnrecordedNote) {
		content = content.replace(
			/^(log|domains):/m,
			"# Note: Commits prior to this point do not have recorded historical context.\n$1:",
		);
	}
	return `# Project history\n\n${content}`;
}

/** @param {CommitRecord[]} entries */
export function formatDomainDocument(entries) {
	return stringify({ log: serializeEntries(entries) }, { lineWidth: 0 });
}
