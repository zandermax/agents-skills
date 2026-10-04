import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	lstat,
	mkdir,
	mkdtemp,
	readlink,
	realpath,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	getPiLinkTargets,
	installPi,
	resolvePiHome,
	uninstallPi,
} from "../scripts/install-pi.js";

const testFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(testFilePath), "..");
const tsxCliPath = path.join(
	repoRoot,
	"node_modules",
	"tsx",
	"dist",
	"cli.mjs",
);
const installPiCliPath = path.join(repoRoot, "scripts", "install-pi.ts");
const uninstallPiCliPath = path.join(repoRoot, "scripts", "uninstall-pi.ts");

async function createFixture(label: string): Promise<{
	tempDir: string;
	piHome: string;
	cleanup: () => Promise<void>;
}> {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), `${label}-`));
	const piHome = path.join(tempDir, ".pi", "agent");
	return {
		tempDir,
		piHome,
		cleanup: () => rm(tempDir, { recursive: true, force: true }),
	};
}

test("resolvePiHome resolves ~/.pi/agent by default or uses PI_CODING_AGENT_DIR", () => {
	const originalEnv = process.env.PI_CODING_AGENT_DIR;
	try {
		delete process.env.PI_CODING_AGENT_DIR;
		assert.equal(
			resolvePiHome("/custom/home"),
			path.join("/custom/home", ".pi", "agent"),
		);

		process.env.PI_CODING_AGENT_DIR = "/custom/env/pi-agent";
		assert.equal(resolvePiHome("/custom/home"), "/custom/env/pi-agent");

		process.env.PI_CODING_AGENT_DIR = "~/custom-agent-dir";
		assert.equal(
			resolvePiHome("/custom/home"),
			path.join(os.homedir(), "custom-agent-dir"),
		);
	} finally {
		if (originalEnv !== undefined) {
			process.env.PI_CODING_AGENT_DIR = originalEnv;
		} else {
			delete process.env.PI_CODING_AGENT_DIR;
		}
	}
});

test("getPiLinkTargets returns expected skills and agents targets", () => {
	const targets = getPiLinkTargets(repoRoot, "/custom/home/.pi/agent");
	assert.equal(targets.length, 2);
	assert.deepEqual(targets[0], {
		name: "skills",
		sourcePath: path.resolve(repoRoot, "skills"),
		destinationPath: "/custom/home/.pi/agent/skills",
	});
	assert.deepEqual(targets[1], {
		name: "agents",
		sourcePath: path.resolve(repoRoot, "agents"),
		destinationPath: "/custom/home/.pi/agent/agents",
	});
});

test("installPi creates piHome directory and links skills and agents", async () => {
	const fixture = await createFixture("pi-install");
	try {
		const result = await installPi(repoRoot, fixture.piHome);
		assert.equal(result.created.length, 2);
		assert.equal(result.existing.length, 0);
		assert.equal(result.repaired.length, 0);

		const skillsStat = await lstat(path.join(fixture.piHome, "skills"));
		assert.equal(skillsStat.isSymbolicLink(), true);
		const skillsTarget = await readlink(path.join(fixture.piHome, "skills"));
		assert.equal(
			path.resolve(fixture.piHome, skillsTarget),
			path.resolve(repoRoot, "skills"),
		);

		const agentsStat = await lstat(path.join(fixture.piHome, "agents"));
		assert.equal(agentsStat.isSymbolicLink(), true);
		const agentsTarget = await readlink(path.join(fixture.piHome, "agents"));
		assert.equal(
			path.resolve(fixture.piHome, agentsTarget),
			path.resolve(repoRoot, "agents"),
		);

		// Idempotency: subsequent run reports existing
		const rerun = await installPi(repoRoot, fixture.piHome);
		assert.equal(rerun.created.length, 0);
		assert.equal(rerun.existing.length, 2);
		assert.equal(rerun.repaired.length, 0);
	} finally {
		await fixture.cleanup();
	}
});

test("installPi cleans up legacy ~/.pi/agent symlink if piHome was previously a symlink", async () => {
	const fixture = await createFixture("pi-legacy-dir");
	try {
		await mkdir(path.dirname(fixture.piHome), { recursive: true });
		// Legacy fixture where fixture.piHome was a symlink to .claude/agents
		await symlink(
			path.resolve(repoRoot, ".claude/agents"),
			fixture.piHome,
			"dir",
		);

		const result = await installPi(repoRoot, fixture.piHome);
		assert.equal(result.created.length, 2);

		const piHomeStat = await lstat(fixture.piHome);
		assert.equal(piHomeStat.isSymbolicLink(), false);
		assert.equal(piHomeStat.isDirectory(), true);

		const agentsStat = await lstat(path.join(fixture.piHome, "agents"));
		assert.equal(agentsStat.isSymbolicLink(), true);
	} finally {
		await fixture.cleanup();
	}
});

test("installPi repairs broken symlink", async () => {
	const fixture = await createFixture("pi-repair");
	try {
		await mkdir(fixture.piHome, { recursive: true });
		// Create a broken symlink for skills pointing to non-existent path
		await symlink(
			path.join(fixture.tempDir, "does-not-exist"),
			path.join(fixture.piHome, "skills"),
			"dir",
		);

		const result = await installPi(repoRoot, fixture.piHome);
		assert.equal(result.repaired.length, 1);
		assert.equal(result.created.length, 1); // agents created

		const realSource = await realpath(path.join(fixture.piHome, "skills"));
		assert.equal(realSource, await realpath(path.resolve(repoRoot, "skills")));
	} finally {
		await fixture.cleanup();
	}
});

test("installPi rejects non-symlink file collision", async () => {
	const fixture = await createFixture("pi-collision");
	try {
		await mkdir(fixture.piHome, { recursive: true });
		await writeFile(path.join(fixture.piHome, "skills"), "not a link");

		await assert.rejects(
			installPi(repoRoot, fixture.piHome),
			/Destination exists and is not a symlink/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installPi rejects symlink pointing to an unrelated existing directory", async () => {
	const fixture = await createFixture("pi-unrelated");
	try {
		const unrelatedDir = path.join(fixture.tempDir, "unrelated");
		await mkdir(unrelatedDir, { recursive: true });
		await mkdir(fixture.piHome, { recursive: true });
		await symlink(unrelatedDir, path.join(fixture.piHome, "skills"), "dir");

		await assert.rejects(
			installPi(repoRoot, fixture.piHome),
			/Destination symlink points elsewhere/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("uninstallPi removes owned links only", async () => {
	const fixture = await createFixture("pi-uninstall");
	try {
		await installPi(repoRoot, fixture.piHome);

		const result = await uninstallPi(repoRoot, fixture.piHome);
		assert.equal(result.removed.length, 2);

		await assert.rejects(lstat(path.join(fixture.piHome, "skills")), /ENOENT/);
		await assert.rejects(lstat(path.join(fixture.piHome, "agents")), /ENOENT/);

		// Subsequent uninstall does nothing
		const rerun = await uninstallPi(repoRoot, fixture.piHome);
		assert.equal(rerun.removed.length, 0);
	} finally {
		await fixture.cleanup();
	}
});

test("uninstallPi also removes legacy ~/.pi/agent if owned", async () => {
	const fixture = await createFixture("pi-uninstall-legacy");
	try {
		await mkdir(fixture.piHome, { recursive: true });
		const legacyAgent = path.join(fixture.piHome, "agent");
		await symlink(path.resolve(repoRoot, ".claude/agents"), legacyAgent, "dir");

		const result = await uninstallPi(repoRoot, fixture.piHome);
		assert.equal(result.removed.length, 1);
		assert.equal(result.removed[0], legacyAgent);
		await assert.rejects(lstat(legacyAgent), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});

test("Pi CLI scripts run install and uninstall successfully using PI_CODING_AGENT_DIR", async () => {
	const fixture = await createFixture("pi-cli");
	try {
		const installRun = spawnSync(
			process.execPath,
			[tsxCliPath, installPiCliPath],
			{
				cwd: repoRoot,
				env: {
					...process.env,
					PI_CODING_AGENT_DIR: fixture.piHome,
				},
				encoding: "utf8",
			},
		);
		assert.equal(installRun.status, 0, installRun.stderr);
		assert.match(installRun.stdout, /created .*skills/);
		assert.match(installRun.stdout, /created .*agents/);
		assert.match(installRun.stdout, /summary created=2 repaired=0 existing=0/);

		const uninstallRun = spawnSync(
			process.execPath,
			[tsxCliPath, uninstallPiCliPath],
			{
				cwd: repoRoot,
				env: {
					...process.env,
					PI_CODING_AGENT_DIR: fixture.piHome,
				},
				encoding: "utf8",
			},
		);
		assert.equal(uninstallRun.status, 0, uninstallRun.stderr);
		assert.match(uninstallRun.stdout, /removed .*skills/);
		assert.match(uninstallRun.stdout, /removed .*agents/);
		assert.match(uninstallRun.stdout, /summary removed=2/);
	} finally {
		await fixture.cleanup();
	}
});
