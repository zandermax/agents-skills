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
	const piHome = path.join(tempDir, ".pi");
	return {
		tempDir,
		piHome,
		cleanup: () => rm(tempDir, { recursive: true, force: true }),
	};
}

test("resolvePiHome resolves ~/.pi under specified or env home directory", () => {
	assert.equal(resolvePiHome("/custom/home"), path.join("/custom/home", ".pi"));
});

test("getPiLinkTargets returns expected skills and agent targets", () => {
	const targets = getPiLinkTargets(repoRoot, "/custom/home/.pi");
	assert.equal(targets.length, 2);
	assert.deepEqual(targets[0], {
		name: "skills",
		sourcePath: path.resolve(repoRoot, ".agents/skills"),
		destinationPath: "/custom/home/.pi/skills",
	});
	assert.deepEqual(targets[1], {
		name: "agent",
		sourcePath: path.resolve(repoRoot, ".claude/agents"),
		destinationPath: "/custom/home/.pi/agent",
	});
});

test("installPi creates ~/.pi directory and links skills and agent", async () => {
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
			path.resolve(repoRoot, ".agents/skills"),
		);

		const agentStat = await lstat(path.join(fixture.piHome, "agent"));
		assert.equal(agentStat.isSymbolicLink(), true);
		const agentTarget = await readlink(path.join(fixture.piHome, "agent"));
		assert.equal(
			path.resolve(fixture.piHome, agentTarget),
			path.resolve(repoRoot, ".claude/agents"),
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

test("installPi cleans up legacy ~/.pi/agents symlink", async () => {
	const fixture = await createFixture("pi-legacy");
	try {
		await mkdir(fixture.piHome, { recursive: true });
		const legacyAgents = path.join(fixture.piHome, "agents");
		await symlink(
			path.resolve(repoRoot, ".claude/agents"),
			legacyAgents,
			"dir",
		);

		const result = await installPi(repoRoot, fixture.piHome);
		assert.equal(result.created.length, 2);

		// Legacy agents link is cleaned up
		await assert.rejects(lstat(legacyAgents), /ENOENT/);

		const agentStat = await lstat(path.join(fixture.piHome, "agent"));
		assert.equal(agentStat.isSymbolicLink(), true);
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
		assert.equal(result.created.length, 1); // agent created

		const realSource = await realpath(path.join(fixture.piHome, "skills"));
		assert.equal(
			realSource,
			await realpath(path.resolve(repoRoot, ".agents/skills")),
		);
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
		await assert.rejects(lstat(path.join(fixture.piHome, "agent")), /ENOENT/);

		// Subsequent uninstall does nothing
		const rerun = await uninstallPi(repoRoot, fixture.piHome);
		assert.equal(rerun.removed.length, 0);
	} finally {
		await fixture.cleanup();
	}
});

test("uninstallPi also removes legacy ~/.pi/agents if owned", async () => {
	const fixture = await createFixture("pi-uninstall-legacy");
	try {
		await mkdir(fixture.piHome, { recursive: true });
		const legacyAgents = path.join(fixture.piHome, "agents");
		await symlink(
			path.resolve(repoRoot, ".claude/agents"),
			legacyAgents,
			"dir",
		);

		const result = await uninstallPi(repoRoot, fixture.piHome);
		assert.equal(result.removed.length, 1);
		assert.equal(result.removed[0], legacyAgents);
		await assert.rejects(lstat(legacyAgents), /ENOENT/);
	} finally {
		await fixture.cleanup();
	}
});

test("Pi CLI scripts run install and uninstall successfully", async () => {
	const fixture = await createFixture("pi-cli");
	try {
		const installRun = spawnSync(
			process.execPath,
			[tsxCliPath, installPiCliPath],
			{
				cwd: repoRoot,
				env: {
					...process.env,
					PI_HOME: fixture.tempDir,
				},
				encoding: "utf8",
			},
		);
		assert.equal(installRun.status, 0, installRun.stderr);
		assert.match(installRun.stdout, /created .*skills/);
		assert.match(installRun.stdout, /created .*agent/);
		assert.match(installRun.stdout, /summary created=2 repaired=0 existing=0/);

		const uninstallRun = spawnSync(
			process.execPath,
			[tsxCliPath, uninstallPiCliPath],
			{
				cwd: repoRoot,
				env: {
					...process.env,
					PI_HOME: fixture.tempDir,
				},
				encoding: "utf8",
			},
		);
		assert.equal(uninstallRun.status, 0, uninstallRun.stderr);
		assert.match(uninstallRun.stdout, /removed .*skills/);
		assert.match(uninstallRun.stdout, /removed .*agent/);
		assert.match(uninstallRun.stdout, /summary removed=2/);
	} finally {
		await fixture.cleanup();
	}
});
