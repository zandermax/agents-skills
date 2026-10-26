import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter } from "../lib/frontmatter.js";
import { discoverPlanPaths, toRelativePath } from "./shared.js";

export async function validatePlanStatuses(
	repoRoot: string,
	plansRoot: string,
	errors: string[],
): Promise<void> {
	const activePlans = new Map<string, string>();
	const archivedPlans = new Map<string, string>();

	for (const planPath of await discoverPlanPaths(plansRoot)) {
		const relativePath = toRelativePath(repoRoot, planPath);
		const relativeToPlans = path.relative(plansRoot, planPath);
		const isArchived =
			relativeToPlans === "archive" ||
			relativeToPlans.startsWith(`archive${path.sep}`);
		const basename = path.basename(planPath);

		if (isArchived) {
			archivedPlans.set(basename, relativePath);
		} else {
			activePlans.set(basename, relativePath);
		}

		try {
			const parsed = parseFrontmatter(
				await readFile(planPath, "utf8"),
				relativePath,
			);
			const status = parsed.attributes.status;

			if (typeof status !== "string" || status.length === 0) {
				errors.push(
					`${relativePath}: plan frontmatter status must be a non-empty string`,
				);
			} else if (
				isArchived &&
				status !== "completed" &&
				status !== "abandoned"
			) {
				errors.push(
					`${relativePath}: archived plan status must be completed or abandoned`,
				);
			} else if (
				!isArchived &&
				(status === "completed" || status === "abandoned")
			) {
				errors.push(
					`${relativePath}: ${status} plans must be moved to docs/plans/archive/`,
				);
			}
		} catch (error) {
			errors.push(
				error instanceof Error
					? `${relativePath}: ${error.message}`
					: `${relativePath}: ${String(error)}`,
			);
		}
	}

	for (const [basename, activeRelative] of activePlans) {
		const archivedRelative = archivedPlans.get(basename);
		if (archivedRelative) {
			errors.push(
				`${activeRelative}: duplicate plan exists in archive at ${archivedRelative}`,
			);
		}
	}
}
