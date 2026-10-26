import { readFile } from "node:fs/promises";
import path from "node:path";

import { toRelativePath } from "./shared.js";

export async function validateRepositoryFiles(
	repoRoot: string,
	errors: string[],
): Promise<void> {
	const readmePath = path.join(repoRoot, "README.md");
	const relativeReadmePath = toRelativePath(repoRoot, readmePath);
	let readme = "";
	try {
		readme = await readFile(readmePath, "utf8");
	} catch {
		errors.push(`${relativeReadmePath}: file is missing`);
	}

	if (readme.length > 0) {
		const requiredReadmeMarkers = [
			"npm run build",
			"npm run check",
			"npm run install:artifacts",
		];

		for (const marker of requiredReadmeMarkers) {
			if (!readme.includes(marker)) {
				errors.push(
					`${relativeReadmePath}: missing required marker: ${marker}`,
				);
			}
		}

		const lowerReadme = readme.toLowerCase();
		const requiredClientMarkers = ["copilot", "claude", ".agents/skills"];
		for (const marker of requiredClientMarkers) {
			if (!lowerReadme.includes(marker.toLowerCase())) {
				errors.push(
					`${relativeReadmePath}: missing required client instruction marker: ${marker}`,
				);
			}
		}
	}

	const prePushPath = path.join(repoRoot, ".githooks", "pre-push");
	const relativePrePushPath = toRelativePath(repoRoot, prePushPath);
	let prePushContent = "";
	try {
		prePushContent = await readFile(prePushPath, "utf8");
	} catch {
		errors.push(`${relativePrePushPath}: file is missing`);
	}

	if (prePushContent.length > 0 && !prePushContent.includes("npm run check")) {
		errors.push(
			`${relativePrePushPath}: missing required marker: npm run check`,
		);
	}

	const packageJsonPath = path.join(repoRoot, "package.json");
	const relativePackageJsonPath = toRelativePath(repoRoot, packageJsonPath);
	let packageJsonContent = "";
	try {
		packageJsonContent = await readFile(packageJsonPath, "utf8");
	} catch {
		errors.push(`${relativePackageJsonPath}: file is missing`);
	}

	if (packageJsonContent.length > 0) {
		try {
			const parsedPackage = JSON.parse(packageJsonContent) as {
				scripts?: Record<string, string>;
			};
			const prepareScript = parsedPackage.scripts?.prepare;
			if (
				typeof prepareScript !== "string" ||
				!prepareScript.includes("git config core.hooksPath .githooks")
			) {
				errors.push(
					`${relativePackageJsonPath}: prepare script must configure git core.hooksPath .githooks`,
				);
			}
		} catch {
			errors.push(`${relativePackageJsonPath}: invalid JSON`);
		}
	}
}
