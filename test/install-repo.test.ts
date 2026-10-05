import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
	applyUnsetDefaults,
	linkShellEnv,
	setupRepo,
	upsertManagedBlock,
} from "../scripts/install.js";

test("applyUnsetDefaults keeps existing values", () => {
	const env = applyUnsetDefaults(
		{ MEMORY_DIR: "/custom/memory", DECISION_SHADOW: "0" },
		"/tmp/home",
	);
	assert.equal(env.MEMORY_DIR, "/custom/memory");
	assert.equal(env.DECISION_SHADOW, "0");

	const defaults = applyUnsetDefaults({ DECISION_SHADOW: "  " }, "/tmp/home");
	assert.equal(defaults.MEMORY_DIR, path.join("/tmp/home", ".memory"));
	assert.equal(defaults.DECISION_SHADOW, "1");
});

test("upsertManagedBlock replaces one block and preserves surrounding text", () => {
	const first = upsertManagedBlock("export KEEP=1\n", ". ./env.sh");
	const second = upsertManagedBlock(first, ". ./env.sh");
	assert.equal(first, second);
	assert.equal(first.match(/agents-skills env/g)?.length, 2);
	assert.match(first, /export KEEP=1/);
});

test("linkShellEnv is idempotent", async () => {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "agents-setup-"));
	try {
		const zshrc = path.join(tempDir, ".zshrc");
		await writeFile(zshrc, "export TOKEN=secret\n");
		const first = await linkShellEnv({
			homeDir: tempDir,
			isFishInstalled: true,
			isZshInstalled: true,
		});
		const second = await linkShellEnv({
			homeDir: tempDir,
			isFishInstalled: true,
			isZshInstalled: true,
		});
		assert.equal(first.fish, "created");
		assert.equal(second.fish, "existing");
		assert.equal(first.zsh, "updated");
		assert.equal(second.zsh, "existing");
		const content = await readFile(zshrc, "utf8");
		assert.match(content, /export TOKEN=secret/);
		assert.equal(content.match(/>>> agents-skills env >>>/g)?.length, 1);
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

test("setupRepo runs install steps once and does not overwrite env", async () => {
	const commands: string[] = [];
	const result = await setupRepo({
		env: { MEMORY_DIR: "/keep" },
		homeDir: os.homedir(),
		skipShell: true,
		skipAgentLinks: true,
		run: (command, args) => {
			commands.push([command, ...args].join(" "));
		},
	});
	assert.equal(result.env.MEMORY_DIR, "/keep");
	assert.equal(result.env.DECISION_SHADOW, "1");
	assert.deepEqual(commands, [
		"npm install",
		"npm run build",
		"npx tsx scripts/install-artifacts.ts --client all",
	]);
});
