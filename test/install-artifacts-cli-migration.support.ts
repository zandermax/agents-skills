import {
	assert,
	createFixture,
	lstat,
	mkdir,
	path,
	projectRoot,
	readFile,
	runCli,
	sampleSkill,
	symlink,
	test,
	writeFile,
} from "./install-artifacts-cli.shared.js";

test("artifact CLI migrates owned legacy directories and uninstalls without deleting memory", async () => {
	const fixture = await createFixture("install-artifacts-cli-migration");
	try {
		const memory = path.join(fixture.homeDirectory, ".memory", "fixture-notes");
		await mkdir(path.join(memory, "test"), { recursive: true });
		await writeFile(
			path.join(memory, "SKILL.md"),
			"---\nname: fixture-notes\ndescription: Personal testing preferences.\n---\n\n## Preferences\n\n- Preserve memory.\n",
		);
		await writeFile(path.join(memory, "test", "fixture-notes.test.ts"), "");
		for (const directory of [".claude/skills", ".copilot/skills"]) {
			const destination = path.join(fixture.homeDirectory, directory);
			await mkdir(path.dirname(destination), { recursive: true });
			await symlink(path.join(projectRoot, "skills"), destination, "dir");
		}
		const oldAgents = path.join(fixture.homeDirectory, ".copilot/agents");
		await symlink(path.join(projectRoot, ".github/agents"), oldAgents, "dir");
		const genericSkills = path.join(fixture.homeDirectory, ".agents/skills");
		await mkdir(genericSkills, { recursive: true });
		await symlink(
			sampleSkill.sourcePath,
			path.join(genericSkills, sampleSkill.destinationName),
			"dir",
		);
		await symlink(memory, path.join(genericSkills, "fixture-notes"), "dir");
		const installed = runCli(
			[
				"--skills-dir",
				`claude=${path.join(fixture.homeDirectory, ".claude/skills")}`,
				"--agents-dir",
				`copilot=${path.join(fixture.homeDirectory, ".claude/agents")}`,
			],
			fixture.homeDirectory,
		);
		assert.equal(installed.status, 0, installed.stderr);
		const sharedSkills = path.join(fixture.homeDirectory, ".claude/skills");
		assert.equal((await lstat(sharedSkills)).isSymbolicLink(), false);
		assert.equal(
			(await lstat(path.join(sharedSkills, "fixture-notes"))).isSymbolicLink(),
			true,
		);
		await assert.rejects(lstat(oldAgents), /ENOENT/);
		await assert.rejects(
			lstat(path.join(genericSkills, "fixture-notes")),
			/ENOENT/,
		);
		await assert.rejects(
			lstat(path.join(genericSkills, sampleSkill.destinationName)),
			/ENOENT/,
		);
		await writeFile(path.join(sharedSkills, "unrelated.md"), "keep");
		await symlink(memory, path.join(sharedSkills, "unrelated"), "dir");
		assert.equal(runCli([], fixture.homeDirectory).status, 0);
		const uninstalled = runCli(
			[],
			fixture.homeDirectory,
			"AGENTS_SKILLS_HOME",
			"uninstall",
		);
		assert.equal(uninstalled.status, 0, uninstalled.stderr);
		await assert.rejects(
			lstat(path.join(sharedSkills, "fixture-notes")),
			/ENOENT/,
		);
		assert.match(
			await readFile(path.join(memory, "SKILL.md"), "utf8"),
			/Preserve memory/,
		);
		assert.equal(
			await readFile(path.join(sharedSkills, "unrelated.md"), "utf8"),
			"keep",
		);
		assert.equal(
			(await lstat(path.join(sharedSkills, "unrelated"))).isSymbolicLink(),
			true,
		);
		assert.equal((await lstat(sampleSkill.sourcePath)).isDirectory(), true);
		const repeated = runCli(
			[],
			fixture.homeDirectory,
			"AGENTS_SKILLS_HOME",
			"uninstall",
		);
		assert.equal(repeated.status, 0, repeated.stderr);
		assert.match(repeated.stdout, /removed=0/);
	} finally {
		await fixture.cleanup();
	}
});
