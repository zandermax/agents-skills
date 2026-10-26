import {
	assert,
	createFixture,
	defaultLinkCount,
	lstat,
	mkdir,
	path,
	projectRoot,
	readlink,
	runCli,
	sampleAgent,
	sampleSkill,
	symlink,
	test,
} from "./install-artifacts-cli.shared.js";

test("artifact CLI installs all compatible catalog artifacts by default", async () => {
	const fixture = await createFixture("install-artifacts-cli-default");
	try {
		const result = runCli([], fixture.homeDirectory);
		assert.equal(result.status, 0, result.stderr);
		assert.match(
			result.stdout,
			new RegExp(
				`summary created=${defaultLinkCount} repaired=0 removed=0 existing=0`,
			),
		);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI installs Copilot agents in the VS Code user directory", async () => {
	const fixture = await createFixture("install-artifacts-cli-copilot-agents");
	try {
		const result = runCli(["--client", "copilot"], fixture.homeDirectory);
		assert.equal(result.status, 0, result.stderr);

		const destination = path.join(
			fixture.homeDirectory,
			".copilot",
			"agents",
			sampleAgent.destinationName,
		);
		assert.equal((await lstat(destination)).isSymbolicLink(), true);
		assert.equal(
			path.resolve(path.dirname(destination), await readlink(destination)),
			sampleAgent.sourcePath,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI accepts the deprecated test-home variable", async () => {
	const fixture = await createFixture("install-artifacts-cli-deprecated-home");
	try {
		const result = runCli(
			[],
			fixture.homeDirectory,
			"EXECUTABLE_PLANNING_HOME",
		);
		assert.equal(result.status, 0, result.stderr);
		assert.match(
			result.stdout,
			new RegExp(
				`summary created=${defaultLinkCount} repaired=0 removed=0 existing=0`,
			),
		);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI preserves active registrations when a shared registry aliases a legacy directory", async () => {
	const fixture = await createFixture("install-artifacts-cli-alias");
	try {
		const genericSkills = path.join(fixture.homeDirectory, ".agents/skills");
		const sharedSkills = path.join(fixture.homeDirectory, ".claude/skills");
		await mkdir(genericSkills, { recursive: true });
		await mkdir(path.dirname(sharedSkills), { recursive: true });
		await symlink(genericSkills, sharedSkills, "dir");
		const result = runCli([], fixture.homeDirectory);
		assert.equal(result.status, 0, result.stderr);
		assert.equal(
			(
				await lstat(path.join(sharedSkills, sampleSkill.destinationName))
			).isSymbolicLink(),
			true,
		);
		assert.equal(runCli([], fixture.homeDirectory).status, 0);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI refuses scoped migration of a whole discovery directory", async () => {
	const fixture = await createFixture("install-artifacts-cli-scoped-migration");
	try {
		const sharedSkills = path.join(fixture.homeDirectory, ".claude/skills");
		await mkdir(path.dirname(sharedSkills), { recursive: true });
		await symlink(path.join(projectRoot, "skills"), sharedSkills, "dir");
		const result = runCli(["--skill", sampleSkill.name], fixture.homeDirectory);
		assert.equal(result.status, 1);
		assert.match(
			result.stderr,
			/Destination parent resolves inside an artifact source/,
		);
		assert.equal((await lstat(sharedSkills)).isSymbolicLink(), true);
	} finally {
		await fixture.cleanup();
	}
});
