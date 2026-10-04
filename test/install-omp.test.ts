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
	getOmpLinkTargets,
	installOmp,
	resolveOmpHome,
	uninstallOmp,
} from "../scripts/install-omp.js";

const testFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(testFilePath), "..");
const tsxCliPath = path.join(
	repoRoot,
	"node_modules",
	"tsx",
	"dist",
	"cli.mjs",
);
const installOmpCliPath = path.join(repoRoot, "scripts", "install-omp.ts");
const uninstallOmpCliPath = path.join(repoRoot, "scripts", "uninstall-omp.ts");

async function createFixture(label: string): Promise<{
	tempDir: string;
	ompHome: string;
	cleanup: () => Promise<void>;
}> {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), `${label}-`));
	const ompHome = path.join(tempDir, ".omp", "agent");
	return {
		tempDir,
		ompHome,
		cleanup: () => rm(tempDir, { recursive: true, force: true }),
	};
}

test("resolveOmpHome resolves ~/.omp/agent by default or uses OMP_CODING_AGENT_DIR / PI_CODING_AGENT_DIR", () => {
	const originalOmpEnv = process.env.OMP_CODING_AGENT_DIR;
	const originalPiEnv = process.env.PI_CODING_AGENT_DIR;
	try {
		delete process.env.OMP_CODING_AGENT_DIR;
		delete process.env.PI_CODING_AGENT_DIR;
		assert.equal(
			resolveOmpHome("/custom/home"),
			path.join("/custom/home", ".omp", "agent"),
		);

		process.env.PI_CODING_AGENT_DIR = "/custom/env/pi-agent";
		assert.equal(resolveOmpHome("/custom/home"), "/custom/env/pi-agent");

		process.env.OMP_CODING_AGENT_DIR = "/custom/env/omp-agent";
		assert.equal(resolveOmpHome("/custom/home"), "/custom/env/omp-agent");

		process.env.OMP_CODING_AGENT_DIR = "~/custom-agent-dir";
		assert.equal(
			resolveOmpHome("/custom/home"),
			path.join(os.homedir(), "custom-agent-dir"),
		);
	} finally {
		if (originalOmpEnv !== undefined) {
			process.env.OMP_CODING_AGENT_DIR = originalOmpEnv;
		} else {
			delete process.env.OMP_CODING_AGENT_DIR;
		}
		if (originalPiEnv !== undefined) {
			process.env.PI_CODING_AGENT_DIR = originalPiEnv;
		} else {
			delete process.env.PI_CODING_AGENT_DIR;
		}
	}
});

test("getOmpLinkTargets returns expected skills and agents targets", () => {
	const targets = getOmpLinkTargets(repoRoot, "/custom/home/.omp/agent");
	assert.equal(targets.length, 2);
	assert.deepEqual(targets[0], {
		name: "skills",
		sourcePath: path.resolve(repoRoot, "skills"),
		destinationPath: "/custom/home/.omp/agent/skills",
	});
	assert.deepEqual(targets[1], {
		name: "agents",
		sourcePath: path.resolve(repoRoot, "agents"),
		destinationPath: "/custom/home/.omp/agent/agents",
	});
});

test("installOmp creates ompHome directory and links skills and agents", async () => {
	const fixture = await createFixture("omp-install");
	try {
		const result = await installOmp(repoRoot, fixture.ompHome);
		assert.equal(result.created.length, 2);
		assert.equal(result.existing.length, 0);
		assert.equal(result.repaired.length, 0);

		const skillsStat = await lstat(path.join(fixture.ompHome, "skills"));
		assert.equal(skillsStat.isSymbolicLink(), true);
		const skillsTarget = await readlink(path.join(fixture.ompHome, "skills"));
		assert.equal(
			path.resolve(fixture.ompHome, skillsTarget),
			path.resolve(repoRoot, "skills"),
		);

		const agentsStat = await lstat(path.join(fixture.ompHome, "agents"));
		assert.equal(agentsStat.isSymbolicLink(), true);
		const agentsTarget = await readlink(path.join(fixture.ompHome, "agents"));
		assert.equal(
			path.resolve(fixture.ompHome, agentsTarget),
			path.resolve(repoRoot, "agents"),
		);

		// Idempotency: subsequent run reports existing
		const rerun = await installOmp(repoRoot, fixture.ompHome);
		assert.equal(rerun.created.length, 0);
		assert.equal(rerun.existing.length, 2);
		assert.equal(rerun.repaired.length, 0);
	} finally {
		await fixture.cleanup();
	}
});

test("installOmp cleans up legacy ~/.omp/agent symlink if ompHome was previously a symlink", async () => {
	const fixture = await createFixture("omp-legacy-dir");
	try {
		await mkdir(path.dirname(fixture.ompHome), { recursive: true });
		await symlink(
			path.resolve(repoRoot, ".claude/agents"),
			fixture.ompHome,
			"dir",
		);

		const result = await installOmp(repoRoot, fixture.ompHome);
		assert.equal(result.created.length, 2);

		const ompHomeStat = await lstat(fixture.ompHome);
		assert.equal(ompHomeStat.isSymbolicLink(), false);
		assert.equal(ompHomeStat.isDirectory(), true);

		const agentsStat = await lstat(path.join(fixture.ompHome, "agents"));
		assert.equal(agentsStat.isSymbolicLink(), true);
	} finally {
		await fixture.cleanup();
	}
});

test("installOmp repairs broken symlink", async () => {
	const fixture = await createFixture("omp-repair");
	try {
		await mkdir(fixture.ompHome, { recursive: true });
		await symlink(
			path.join(fixture.tempDir, "does-not-exist"),
			path.join(fixture.ompHome, "skills"),
			"dir",
		);

		const result = await installOmp(repoRoot, fixture.ompHome);
		assert.equal(result.repaired.length, 1);
		assert.equal(result.created.length, 1);

		const realSource = await realpath(path.join(fixture.ompHome, "skills"));
		assert.equal(realSource, await realpath(path.resolve(repoRoot, "skills")));
	} finally {
		await fixture.cleanup();
	}
});

test("installOmp rejects non-symlink file collision", async () => {
	const fixture = await createFixture("omp-collision");
	try {
		await mkdir(fixture.ompHome, { recursive: true });
		await writeFile(path.join(fixture.ompHome, "skills"), "not a link");

		await assert.rejects(
			installOmp(repoRoot, fixture.ompHome),
			/Destination exists and is not a symlink/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("installOmp rejects symlink pointing to an unrelated existing directory", async () => {
	const fixture = await createFixture("omp-unrelated");
	try {
		const unrelatedDir = path.join(fixture.tempDir, "unrelated");
		await mkdir(unrelatedDir, { recursive: true });
		await mkdir(fixture.ompHome, { recursive: true });
		await symlink(unrelatedDir, path.join(fixture.ompHome, "skills"), "dir");

		await assert.rejects(
			installOmp(repoRoot, fixture.ompHome),
			/Destination symlink points elsewhere/,
		);
	} finally {
		await fixture.cleanup();
	}
});

test("uninstallOmp removes owned links only", async () => {
	const fixture = await createFixture("omp-uninstall");
	try {
		await installOmp(repoRoot, fixture.ompHome);

		const result = await uninstallOmp(repoRoot, fixture.ompHome);
		assert.equal(result.removed.length, 2);

		await assert.rejects(lstat(path.join(fixture.ompHome, "skills")), /ENOENT/);
		await assert.rejects(lstat(path.join(fixture.ompHome, "agents")), /ENOENT/);

		const rerun = await uninstallOmp(repoRoot, fixture.ompHome);
		assert.equal(rerun.removed.length, 0);
	} finally {
		await fixture.cleanup();
	}
});

test("Omp CLI scripts run install and uninstall successfully using OMP_CODING_AGENT_DIR", async () => {
	const fixture = await createFixture("omp-cli");
	try {
		const installRun = spawnSync(
			process.execPath,
			[tsxCliPath, installOmpCliPath],
			{
				cwd: repoRoot,
				env: {
					...process.env,
					OMP_CODING_AGENT_DIR: fixture.ompHome,
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
			[tsxCliPath, uninstallOmpCliPath],
			{
				cwd: repoRoot,
				env: {
					...process.env,
					OMP_CODING_AGENT_DIR: fixture.ompHome,
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
