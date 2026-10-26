import {
	assert,
	checkCustomizations,
	createFixtureRepo,
	mkdir,
	path,
	rm,
	test,
	writeFile,
} from "./check-customizations.shared.js";

test("checkCustomizations accepts valid repository fixtures", async () => {
	const repoRoot = await createFixtureRepo();

	try {
		await checkCustomizations(repoRoot);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations requires completed plans to be archived", async () => {
	const repoRoot = await createFixtureRepo({ planStatus: "completed" });
	try {
		await assert.rejects(
			checkCustomizations(repoRoot),
			/plans must be moved to docs\/plans\/archive/,
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations requires archived plans to be terminal", async () => {
	const repoRoot = await createFixtureRepo({
		planStatus: "in-progress",
		planArchived: true,
	});
	try {
		await assert.rejects(
			checkCustomizations(repoRoot),
			/archived plan status must be completed or abandoned/,
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects active plans that duplicate an archived plan", async () => {
	const repoRoot = await createFixtureRepo({
		planStatus: "in-progress",
		planArchived: false,
	});
	try {
		const archiveDir = path.join(repoRoot, "docs", "plans", "archive");
		await mkdir(archiveDir, { recursive: true });
		await writeFile(
			path.join(archiveDir, "fixture.md"),
			"---\nstatus: completed\n---\n# Archived Fixture Plan\n",
			"utf8",
		);

		await assert.rejects(
			checkCustomizations(repoRoot),
			/duplicate plan exists in archive at docs\/plans\/archive\/fixture\.md/,
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});
