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

import { createWazaWorkspace, runWaza } from "../scripts/run-waza.js";

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

test("runWaza executes the evaluator in an isolated workspace", async (t) => {
	const toolDirectory = await mkdtemp(path.join(os.tmpdir(), "waza-tool-"));
	const currentDirectoryPath = path.join(toolDirectory, "cwd.txt");
	const fakeWazaPath = path.join(toolDirectory, "waza");
	const originalPath = process.env.PATH;
	const originalCurrentDirectoryPath = process.env.WAZA_TEST_CWD_PATH;

	t.after(async () => {
		process.env.PATH = originalPath;
		if (originalCurrentDirectoryPath === undefined) {
			delete process.env.WAZA_TEST_CWD_PATH;
		} else {
			process.env.WAZA_TEST_CWD_PATH = originalCurrentDirectoryPath;
		}
		await rm(toolDirectory, { force: true, recursive: true });
	});

	await writeFile(
		fakeWazaPath,
		'#!/usr/bin/env sh\nprintf \'%s\' "$PWD" > "$WAZA_TEST_CWD_PATH"\nprintf mutation > mutation-marker.txt\n',
	);
	await chmod(fakeWazaPath, 0o755);
	process.env.PATH = `${toolDirectory}${path.delimiter}${originalPath ?? ""}`;
	process.env.WAZA_TEST_CWD_PATH = currentDirectoryPath;

	assert.equal(await runWaza(["run", "plan-executor"]), 0);
	const evaluatorDirectory = await readFile(currentDirectoryPath, "utf8");
	const repositoryRoot = path.resolve(
		path.dirname(new URL(import.meta.url).pathname),
		"..",
	);

	assert.notEqual(evaluatorDirectory, repositoryRoot);
	await assert.rejects(
		readFile(path.join(repositoryRoot, "mutation-marker.txt")),
	);
	await assert.rejects(
		readFile(path.join(evaluatorDirectory, "mutation-marker.txt")),
	);
});
