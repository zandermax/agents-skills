import {
	assert,
	checkCustomizations,
	checkerCliPath,
	createFixtureRepo,
	path,
	projectRoot,
	rm,
	spawnSync,
	test,
	tsxCliPath,
	writeFile,
} from "./check-customizations.shared.js";

test("checkCustomizations rejects missing README command and client instructions", async () => {
	const repoRoot = await createFixtureRepo({
		readmeOverride:
			"# Executable Planning\n\nThis README omits install and check commands.",
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(String(error), /README\.md:/);
				assert.match(String(error), /npm run check/);
				assert.match(String(error), /install:artifacts/);
				assert.match(String(error), /copilot/i);
				assert.match(String(error), /claude/i);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects broken repository-relative source paths", async () => {
	const repoRoot = await createFixtureRepo({
		manifestSourceOverride: "missing.md",
	});

	try {
		await assert.rejects(
			async () => checkCustomizations(repoRoot),
			(error: unknown) => {
				assert.match(
					String(error),
					/sources\/executable-planning\/skill\.json:/,
				);
				assert.match(String(error), /missing\.md/);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations CLI exits nonzero with stable path-prefixed errors", async () => {
	const repoRoot = await createFixtureRepo({
		manifestSourceOverride: "missing.md",
	});

	try {
		const result = spawnSync(
			process.execPath,
			[tsxCliPath, checkerCliPath, repoRoot],
			{
				cwd: projectRoot,
				encoding: "utf8",
			},
		);

		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /sources\/executable-planning\/skill\.json:/);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test("checkCustomizations rejects missing or invalid pre-push hook or prepare script", async () => {
	const repoRoot = await createFixtureRepo();

	try {
		await rm(path.join(repoRoot, ".githooks", "pre-push"));
		await assert.rejects(
			async () => {
				await checkCustomizations(repoRoot);
			},
			(error: unknown) => {
				assert.match(String(error), /\.githooks\/pre-push: file is missing/);
				return true;
			},
		);

		await writeFile(
			path.join(repoRoot, ".githooks", "pre-push"),
			"#!/bin/sh\necho hello\n",
		);
		await assert.rejects(
			async () => {
				await checkCustomizations(repoRoot);
			},
			(error: unknown) => {
				assert.match(
					String(error),
					/\.githooks\/pre-push: missing required marker: npm run check/,
				);
				return true;
			},
		);

		await writeFile(
			path.join(repoRoot, ".githooks", "pre-push"),
			"#!/bin/sh\nnpm run check\n",
		);
		await writeFile(path.join(repoRoot, "package.json"), "{}");
		await assert.rejects(
			async () => {
				await checkCustomizations(repoRoot);
			},
			(error: unknown) => {
				assert.match(
					String(error),
					/package\.json: prepare script must configure git core\.hooksPath \.githooks/,
				);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});
