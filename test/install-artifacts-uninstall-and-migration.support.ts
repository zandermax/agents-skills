import type { ResolvedLink } from "./install-artifacts.shared.js";
import {
	assert,
	assertLinkPointsTo,
	buildArtifactLinks,
	createFixture,
	installArtifacts,
	lstat,
	path,
	request,
	symlink,
	test,
	uninstallArtifacts,
	writeFile,
} from "./install-artifacts.shared.js";

test("uninstallArtifacts removes an explicitly owned legacy link", async () => {
	const fixture = await createFixture("install-artifacts-legacy");
	const legacyLink = path.join(fixture.root, "legacy-link");
	try {
		await symlink(fixture.sources.skill, legacyLink, "dir");
		const removed = await uninstallArtifacts([
			{
				kind: "directory",
				sourcePath: fixture.sources.skill,
				destinationPath: legacyLink,
			},
		]);
		assert.deepEqual(removed, [legacyLink]);
		await assert.rejects(lstat(legacyLink), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});

test("uninstallArtifacts matches owned links through symlinked source paths", async () => {
	const fixture = await createFixture("install-artifacts-aliased-source");
	const sourceAliasDirectory = path.join(fixture.root, "source-alias");
	const destination = path.join(fixture.root, "legacy-alias");
	try {
		await symlink(
			path.dirname(fixture.sources.skill),
			sourceAliasDirectory,
			"dir",
		);
		await symlink(fixture.sources.skill, destination, "dir");

		const removed = await uninstallArtifacts([
			{
				kind: "directory",
				sourcePath: path.join(
					sourceAliasDirectory,
					path.basename(fixture.sources.skill),
				),
				destinationPath: destination,
			},
		]);

		assert.deepEqual(removed, [destination]);
		await assert.rejects(lstat(destination), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});

test("uninstallArtifacts removes dangling links through symlinked source paths", async () => {
	const fixture = await createFixture(
		"install-artifacts-aliased-dangling-source",
	);
	const sourceAliasDirectory = path.join(fixture.root, "source-alias");
	const missingSource = path.join(sourceAliasDirectory, "missing-skill");
	const destination = path.join(fixture.root, "legacy-dangling-alias");
	try {
		await symlink(
			path.dirname(fixture.sources.skill),
			sourceAliasDirectory,
			"dir",
		);
		await symlink(
			path.join(path.dirname(fixture.sources.skill), "missing-skill"),
			destination,
			"dir",
		);

		const removed = await uninstallArtifacts([
			{
				kind: "directory",
				sourcePath: missingSource,
				destinationPath: destination,
			},
		]);

		assert.deepEqual(removed, [destination]);
		await assert.rejects(lstat(destination), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});

test("installArtifacts validates collisions before migrating owned directory links", async () => {
	const fixture = await createFixture("install-artifacts-preflight");
	try {
		const directory = path.join(fixture.root, "skills");
		const migration: ResolvedLink = {
			kind: "directory",
			sourcePath: path.dirname(fixture.sources.skill),
			destinationPath: directory,
		};
		await symlink(migration.sourcePath, directory, "dir");
		const collision = path.join(fixture.root, "collision");
		await writeFile(collision, "preserve");
		const link: ResolvedLink = {
			kind: "directory",
			sourcePath: fixture.sources.skill,
			destinationPath: path.join(directory, "planning"),
		};
		await assert.rejects(
			installArtifacts(
				[link, { ...link, destinationPath: collision }],
				[],
				[migration],
			),
			/not a symlink/,
		);
		await assertLinkPointsTo(directory, migration.sourcePath);
		const result = await installArtifacts([link], [], [migration]);
		assert.deepEqual(result.removed, [directory]);
		assert.equal((await lstat(directory)).isSymbolicLink(), false);
		await assertLinkPointsTo(link.destinationPath, fixture.sources.skill);
	} finally {
		await fixture.cleanup();
	}
});

test("uninstallArtifacts removes owned links only, preserving sources and unrelated entries", async () => {
	const fixture = await createFixture("uninstall-artifacts-owned");
	try {
		const links = buildArtifactLinks(request(fixture.root, fixture.sources));
		await installArtifacts(links);
		const unrelated = path.join(fixture.root, "skills", "unrelated");
		await symlink(fixture.root, unrelated, "dir");
		const removed = await uninstallArtifacts([
			...links,
			{
				kind: "directory",
				sourcePath: fixture.sources.skill,
				destinationPath: unrelated,
			},
		]);
		assert.deepEqual(
			removed,
			links.map((link) => link.destinationPath),
		);
		assert.equal((await lstat(unrelated)).isSymbolicLink(), true);
		assert.equal((await lstat(fixture.sources.skill)).isDirectory(), true);
		assert.deepEqual(await uninstallArtifacts(links), []);
	} finally {
		await fixture.cleanup();
	}
});
