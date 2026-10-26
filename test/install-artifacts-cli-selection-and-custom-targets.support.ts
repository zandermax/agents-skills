import {
	allClientNames,
	assert,
	catalog,
	createFixture,
	destinationCountsForClients,
	expectedLinkCount,
	lstat,
	path,
	repositoryArtifacts,
	requireClientForCollection,
	runCli,
	sampleAgent,
	sampleSkill,
	test,
} from "./install-artifacts-cli.shared.js";

test("artifact CLI installs a selected skill and selected agent", async () => {
	const fixture = await createFixture("install-artifacts-cli-selectors");
	const skillLinkCount = expectedLinkCount(
		[sampleSkill],
		destinationCountsForClients(catalog, allClientNames),
		catalog,
	);
	const agentClient = requireClientForCollection(
		catalog,
		sampleAgent.collection,
	);
	const agentLinkCount = expectedLinkCount(
		[sampleAgent],
		destinationCountsForClients(catalog, [agentClient]),
		catalog,
	);
	try {
		const skill = runCli(["--skill", sampleSkill.id], fixture.homeDirectory);
		assert.equal(skill.status, 0, skill.stderr);
		assert.match(
			skill.stdout,
			new RegExp(
				`summary created=${skillLinkCount} repaired=0 removed=0 existing=0`,
			),
		);

		const agent = runCli(
			["--client", agentClient, "--agent", sampleAgent.id],
			fixture.homeDirectory,
		);
		assert.equal(agent.status, 0, agent.stderr);
		assert.match(
			agent.stdout,
			new RegExp(
				`summary created=${agentLinkCount} repaired=0 removed=0 existing=0`,
			),
		);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI installs into mixed custom skill and agent targets", async () => {
	const fixture = await createFixture("install-artifacts-cli-custom");
	const customLinkCount = expectedLinkCount(
		repositoryArtifacts,
		new Map([
			["skills", 1],
			[sampleAgent.collection, 1],
		]),
		catalog,
	);
	try {
		const result = runCli(
			[
				"--skills-dir",
				`skills=${fixture.customSkillsDirectory}`,
				"--agents-dir",
				`${sampleAgent.collection}=${fixture.customAgentsDirectory}`,
			],
			fixture.homeDirectory,
		);
		assert.equal(result.status, 0, result.stderr);
		assert.match(
			result.stdout,
			new RegExp(
				`summary created=${customLinkCount} repaired=0 removed=0 existing=0`,
			),
		);
		assert.equal(
			(await lstat(fixture.customSkillsDirectory)).isSymbolicLink(),
			false,
		);
		assert.equal(
			(
				await lstat(
					path.join(fixture.customSkillsDirectory, sampleSkill.destinationName),
				)
			).isSymbolicLink(),
			true,
		);
		assert.equal(
			(await lstat(fixture.customAgentsDirectory)).isSymbolicLink(),
			false,
		);
		assert.equal(
			(
				await lstat(
					path.join(fixture.customAgentsDirectory, sampleAgent.destinationName),
				)
			).isSymbolicLink(),
			true,
		);
	} finally {
		await fixture.cleanup();
	}
});
