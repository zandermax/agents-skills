import assert from "node:assert/strict";
import {
	chmod,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
	createMacosWazaSandboxProfile,
	createWazaWorkspace,
	runWaza,
} from "../scripts/run-waza.js";

test("createWazaWorkspace copies the repository without Git metadata or dependencies", async (t) => {
	const sourceDirectory = await mkdtemp(path.join(os.tmpdir(), "waza-source-"));
	t.after(async () => {
		await rm(sourceDirectory, { force: true, recursive: true });
	});

	await writeFile(path.join(sourceDirectory, "tracked.txt"), "source");
	await mkdir(path.join(sourceDirectory, ".git"));
	await mkdir(path.join(sourceDirectory, "node_modules"));
	await writeFile(path.join(sourceDirectory, ".git", "config"), "git metadata");
	await writeFile(
		path.join(sourceDirectory, "node_modules", "package"),
		"dependency",
	);

	const workspaceDirectory = await createWazaWorkspace(sourceDirectory);
	t.after(async () => {
		await rm(workspaceDirectory, { force: true, recursive: true });
	});

	assert.notEqual(workspaceDirectory, sourceDirectory);
	assert.equal(
		await readFile(path.join(workspaceDirectory, "tracked.txt"), "utf8"),
		"source",
	);
	await assert.rejects(
		readFile(path.join(workspaceDirectory, ".git", "config")),
	);
	await assert.rejects(
		readFile(path.join(workspaceDirectory, "node_modules", "package")),
	);
});

test("createMacosWazaSandboxProfile permits writes only in the workspace", () => {
	const profile = createMacosWazaSandboxProfile('/tmp/waza "workspace"');

	assert.match(profile, /^\(allow default\)$/m);
	assert.match(profile, /^\(deny file-write\*\)$/m);
	assert.match(
		profile,
		/\(allow file-write\* \(subpath "\/tmp\/waza \\"workspace\\""\)\)/,
	);
	assert.match(profile, /Library\\?\/Caches\\?\/copilot-sdk/);
	assert.match(profile, /\/\.waza/);
	assert.match(profile, /\/\.copilot/);
});

test("runWaza executes the evaluator in an isolated workspace", async (t) => {
	const toolDirectory = await mkdtemp(path.join(os.tmpdir(), "waza-tool-"));
	const fakeWazaPath = path.join(toolDirectory, "waza");
	const originalPath = process.env.PATH;

	t.after(async () => {
		process.env.PATH = originalPath;
		await rm(toolDirectory, { force: true, recursive: true });
	});

	await writeFile(
		fakeWazaPath,
		"#!/usr/bin/env sh\nprintf mutation > mutation-marker.txt\n",
	);
	await chmod(fakeWazaPath, 0o755);
	process.env.PATH = `${toolDirectory}${path.delimiter}${originalPath ?? ""}`;

	assert.equal(await runWaza(["run", "plan-executor"]), 0);
	const repositoryRoot = path.resolve(
		path.dirname(new URL(import.meta.url).pathname),
		"..",
	);

	await assert.rejects(
		readFile(path.join(repositoryRoot, "mutation-marker.txt")),
	);
});

test("runWaza denies macOS evaluator writes outside its workspace", async (t) => {
	if (process.platform !== "darwin") {
		t.skip("macOS sandbox-exec is unavailable");
		return;
	}

	const toolDirectory = await mkdtemp(path.join(os.homedir(), "waza-tool-"));
	const outsideMarkerPath = path.join(toolDirectory, "outside-marker.txt");
	const fakeWazaPath = path.join(toolDirectory, "waza");
	const originalPath = process.env.PATH;
	const originalOutsideMarkerPath = process.env.WAZA_TEST_OUTSIDE_MARKER_PATH;

	t.after(async () => {
		process.env.PATH = originalPath;
		if (originalOutsideMarkerPath === undefined) {
			delete process.env.WAZA_TEST_OUTSIDE_MARKER_PATH;
		} else {
			process.env.WAZA_TEST_OUTSIDE_MARKER_PATH = originalOutsideMarkerPath;
		}
		await rm(toolDirectory, { force: true, recursive: true });
	});

	await writeFile(
		fakeWazaPath,
		'#!/usr/bin/env sh\nprintf workspace > workspace-marker.txt\nprintf outside > "$WAZA_TEST_OUTSIDE_MARKER_PATH"\n',
	);
	await chmod(fakeWazaPath, 0o755);
	process.env.PATH = `${toolDirectory}${path.delimiter}${originalPath ?? ""}`;
	process.env.WAZA_TEST_OUTSIDE_MARKER_PATH = outsideMarkerPath;

	assert.notEqual(await runWaza(["run", "plan-executor"]), 0);
	await assert.rejects(readFile(outsideMarkerPath));
});
