import type { ArtifactRequest } from "./install-artifacts.shared.js";
import {
	assert,
	assertLinkPointsTo,
	buildArtifactLinks,
	createFixture,
	installArtifacts,
	path,
	request,
	test,
} from "./install-artifacts.shared.js";

test("buildArtifactLinks maps artifacts only to targets in their collection", async () => {
	const fixture = await createFixture("build-artifact-links");
	try {
		assert.deepEqual(
			buildArtifactLinks(request(fixture.root, fixture.sources)),
			[
				{
					kind: "directory",
					sourcePath: fixture.sources.skill,
					destinationPath: path.join(fixture.root, "skills", "planning"),
				},
				{
					kind: "file",
					sourcePath: fixture.sources.agent,
					destinationPath: path.join(
						fixture.root,
						"agents",
						"planner.agent.md",
					),
				},
			],
		);
	} finally {
		await fixture.cleanup();
	}
});

test("buildArtifactLinks creates a single directory link for directory linkMode targets", async () => {
	const fixture = await createFixture("build-artifact-directory-links");
	try {
		const req: ArtifactRequest = {
			listOnly: false,
			artifacts: [
				{
					kind: "agent",
					id: "copilot:planner",
					name: "planner",
					collection: "copilot",
					sourcePath: fixture.sources.agent,
					destinationName: "planner.agent.md",
					entryKind: "file",
				},
			],
			targets: [
				{
					collection: "copilot",
					directory: path.join(fixture.root, "agents"),
					linkMode: "directory",
					sourceDirectory: path.dirname(fixture.sources.agent),
				},
			],
		};
		assert.deepEqual(buildArtifactLinks(req), [
			{
				kind: "directory",
				sourcePath: path.dirname(fixture.sources.agent),
				destinationPath: path.join(fixture.root, "agents"),
			},
		]);
	} finally {
		await fixture.cleanup();
	}
});

test("installArtifacts creates file and directory links and is idempotent", async () => {
	const fixture = await createFixture("install-artifacts-create");
	try {
		const links = buildArtifactLinks(request(fixture.root, fixture.sources));
		const first = await installArtifacts(links);
		assert.deepEqual(
			first.created,
			links.map((link) => link.destinationPath),
		);
		assert.deepEqual(first.existing, []);
		const [skillLink, agentLink] = links;
		if (skillLink === undefined || agentLink === undefined) {
			assert.fail("expected skill and agent links");
		}
		await assertLinkPointsTo(skillLink.destinationPath, fixture.sources.skill);
		await assertLinkPointsTo(agentLink.destinationPath, fixture.sources.agent);

		const second = await installArtifacts(links);
		assert.deepEqual(second.created, []);
		assert.deepEqual(
			second.existing,
			links.map((link) => link.destinationPath),
		);
	} finally {
		await fixture.cleanup();
	}
});
