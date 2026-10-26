import {
	assert,
	createFixture,
	expectedListingPattern,
	lstat,
	runCli,
	runNpm,
	sampleAgent,
	sampleSkill,
	test,
} from "./install-artifacts-cli.shared.js";

test("artifact CLI lists without writing destinations", async () => {
	const fixture = await createFixture("install-artifacts-cli-list");
	try {
		const result = runCli(["--list"], fixture.homeDirectory);
		assert.equal(result.status, 0, result.stderr);
		for (const artifact of [sampleSkill, sampleAgent]) {
			assert.match(result.stdout, expectedListingPattern(artifact));
		}
		await assert.rejects(lstat(fixture.homeDirectory), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});

test("artifact CLI reports malformed input as an error", async () => {
	const fixture = await createFixture("install-artifacts-cli-malformed");
	try {
		const result = runCli(["--agent"], fixture.homeDirectory);
		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /--agent requires a value/);
	} finally {
		await fixture.cleanup();
	}
});

test("install:clients remains an exact install:artifacts compatibility alias", async () => {
	const fixture = await createFixture("install-artifacts-cli-alias");
	try {
		const artifacts = runNpm(
			["run", "install:artifacts", "--", "--list"],
			fixture.homeDirectory,
		);
		const clients = runNpm(
			["run", "install:clients", "--", "--list"],
			fixture.homeDirectory,
		);
		assert.equal(artifacts.status, 0, artifacts.stderr);
		assert.equal(clients.status, 0, clients.stderr);
		for (const artifact of [sampleSkill, sampleAgent]) {
			assert.match(artifacts.stdout, expectedListingPattern(artifact));
			assert.match(clients.stdout, expectedListingPattern(artifact));
		}
	} finally {
		await fixture.cleanup();
	}
});
