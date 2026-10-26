import type { ResolvedLink } from "./install-artifacts.shared.js";
import {
	assert,
	assertLinkPointsTo,
	createFixture,
	installArtifacts,
	lstat,
	mkdir,
	path,
	symlink,
	test,
	writeFile,
} from "./install-artifacts.shared.js";

test("installArtifacts rejects a destination parent linked into the source catalog", async () => {
	const fixture = await createFixture("install-artifacts-parent-boundary");
	try {
		const skills = path.join(fixture.root, "skills");
		await symlink(path.dirname(fixture.sources.skill), skills, "dir");
		await assert.rejects(
			installArtifacts([
				{
					kind: "directory",
					sourcePath: fixture.sources.skill,
					destinationPath: path.join(skills, "private-notes"),
				},
			]),
			/Destination parent resolves inside an artifact source/,
		);
		await assert.rejects(
			lstat(path.join(path.dirname(fixture.sources.skill), "private-notes")),
			/ENOENT/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installArtifacts deduplicates equivalent links and rejects conflicting destinations", async () => {
	const fixture = await createFixture("install-artifacts-deduplicate");
	try {
		const destination = path.join(fixture.root, "dest", "planning");
		const duplicate: ResolvedLink = {
			kind: "directory",
			sourcePath: fixture.sources.skill,
			destinationPath: path.join(fixture.root, "dest", ".", "planning"),
		};
		const result = await installArtifacts([
			{
				kind: "directory",
				sourcePath: fixture.sources.skill,
				destinationPath: destination,
			},
			duplicate,
		]);
		assert.deepEqual(result.created, [destination]);

		await assert.rejects(
			installArtifacts([
				{
					kind: "directory",
					sourcePath: fixture.sources.skill,
					destinationPath: path.join(fixture.root, "conflict"),
				},
				{
					kind: "file",
					sourcePath: fixture.sources.agent,
					destinationPath: path.join(fixture.root, "conflict"),
				},
			]),
			/Conflicting destination mappings/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installArtifacts rejects regular and unrelated destination links without writes", async () => {
	const fixture = await createFixture("install-artifacts-collisions");
	try {
		const regular = path.join(fixture.root, "dest", "regular");
		const unrelated = path.join(fixture.root, "dest", "unrelated");
		const untouched = path.join(fixture.root, "dest", "untouched");
		await mkdir(path.dirname(regular), { recursive: true });
		await writeFile(regular, "collision", "utf8");
		await symlink(fixture.root, unrelated, "dir");

		await assert.rejects(
			installArtifacts([
				{
					kind: "directory",
					sourcePath: fixture.sources.skill,
					destinationPath: regular,
				},
				{
					kind: "directory",
					sourcePath: fixture.sources.skill,
					destinationPath: unrelated,
				},
				{
					kind: "directory",
					sourcePath: fixture.sources.skill,
					destinationPath: untouched,
				},
			]),
			(error: unknown) => {
				const message = String(error);
				assert.match(message, /not a symlink/);
				assert.match(message, /points elsewhere/);
				return true;
			},
		);
		await assert.rejects(lstat(untouched), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});

test("installArtifacts repairs broken destination links left by a moved repository", async () => {
	const fixture = await createFixture("install-artifacts-repair");
	try {
		const stale = path.join(fixture.root, "dest", "planning");
		await mkdir(path.dirname(stale), { recursive: true });
		await symlink(
			path.join(fixture.root, "old-location", "planning"),
			stale,
			"dir",
		);

		const result = await installArtifacts([
			{
				kind: "directory",
				sourcePath: fixture.sources.skill,
				destinationPath: stale,
			},
		]);
		assert.deepEqual(result.repaired, [stale]);
		assert.deepEqual(result.created, []);
		await assertLinkPointsTo(stale, fixture.sources.skill);
	} finally {
		await fixture.cleanup();
	}
});

test("installArtifacts accepts a canonical alias and validates source types before writing", async () => {
	const fixture = await createFixture("install-artifacts-validation");
	try {
		const alias = path.join(fixture.root, "alias");
		const aliasedDestination = path.join(fixture.root, "dest", "planning");
		await mkdir(path.dirname(aliasedDestination), { recursive: true });
		await symlink(path.dirname(fixture.sources.skill), alias, "dir");
		await symlink(path.join(alias, "planning"), aliasedDestination, "dir");

		const existing = await installArtifacts([
			{
				kind: "directory",
				sourcePath: fixture.sources.skill,
				destinationPath: aliasedDestination,
			},
		]);
		assert.deepEqual(existing.existing, [aliasedDestination]);

		const untouched = path.join(fixture.root, "new", "untouched");
		await assert.rejects(
			installArtifacts([
				{
					kind: "file",
					sourcePath: fixture.sources.skill,
					destinationPath: path.join(fixture.root, "wrong-kind"),
				},
				{
					kind: "directory",
					sourcePath: path.join(fixture.root, "missing"),
					destinationPath: untouched,
				},
			]),
			/Source is not a file[\s\S]*Source is missing/,
		);
		await assert.rejects(lstat(untouched), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});
