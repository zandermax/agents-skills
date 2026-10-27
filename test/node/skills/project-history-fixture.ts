import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
	chmodSync,
	copyFileSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

export function historyFixture() {
	const base = fileURLToPath(
		new URL(
			`../../../.waza-cache/project-history-fixture-${randomUUID()}/`,
			import.meta.url,
		),
	);
	const root = join(base, "working");
	const remote = join(base, "remote.git");
	const scripts = join(root, "scripts/project-history");
	mkdirSync(scripts, { recursive: true });
	const source = fileURLToPath(
		new URL("../../../skills/project-history/scripts/", import.meta.url),
	);
	for (const file of readdirSync(source))
		copyFileSync(join(source, file), join(scripts, file));
	const env = {
		...process.env,
		GIT_CONFIG_GLOBAL: "/dev/null",
		GIT_CONFIG_NOSYSTEM: "1",
		GIT_TERMINAL_PROMPT: "0",
	};
	for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"])
		delete env[key as keyof typeof env];
	function git(...args: string[]) {
		const result = spawnSync("git", args, { cwd: root, env, encoding: "utf8" });
		assert.equal(result.status, 0, `${args.join(" ")}\n${result.stderr}`);
		return result.stdout.trim();
	}
	function cli(name: string, args: string[] = [], input = "") {
		return spawnSync(process.execPath, [join(scripts, name), ...args], {
			cwd: root,
			env,
			input,
			encoding: "utf8",
		});
	}
	const historyPath = join(root, "PROJECT_HISTORY.yaml");
	function readHistory() {
		return parse(readFileSync(historyPath, "utf8"));
	}
	function writeHistory(data: unknown) {
		writeFileSync(historyPath, stringify(data));
	}
	function record(subject = "Record initial history") {
		const result = cli("record-history.mjs", [
			"--subject",
			subject,
			"--decision",
			"the tooling should preserve durable decisions independently of branch movement.",
		]);
		assert.equal(result.status, 0, result.stderr);
	}
	function commit(subject: string) {
		const seconds = Number(git("show", "-s", "--format=%ct", "HEAD")) + 1;
		const result = spawnSync(
			"git",
			["commit", "--allow-empty", "-m", subject],
			{
				cwd: root,
				env: { ...env, GIT_COMMITTER_DATE: `${seconds} +0000` },
				encoding: "utf8",
			},
		);
		assert.equal(result.status, 0, result.stderr);
	}
	function hook(input?: string) {
		return cli(
			"pre-push-project-history.mjs",
			["origin", remote],
			input ??
				`refs/heads/main ${git("rev-parse", "HEAD")} refs/heads/main ${git("rev-parse", "refs/remotes/origin/main")}\n`,
		);
	}
	function state(includeGit = true) {
		const files: Record<string, string> = {};
		function walk(directory: string, prefix = "") {
			for (const name of readdirSync(directory).sort()) {
				if (!includeGit && name === ".git") continue;
				const path = join(directory, name);
				const relative = `${prefix}${name}`;
				const stat = statSync(path);
				if (stat.isDirectory()) walk(path, `${relative}/`);
				else
					files[relative] =
						`${stat.mode}:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
			}
		}
		walk(root);
		return files;
	}
	git("init", "--initial-branch=main");
	git("config", "user.name", "History Fixture");
	git("config", "user.email", "history@example.invalid");
	git("config", "commit.gpgsign", "false");
	git("config", "core.hooksPath", ".git/hooks");
	git("init", "--bare", "--initial-branch=main", remote);
	git("remote", "add", "origin", remote);
	writeFileSync(join(root, "seed.txt"), "seed\n");
	git("add", "seed.txt");
	const seed = spawnSync("git", ["commit", "-m", "Seed repository"], {
		cwd: root,
		env: { ...env, GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z" },
		encoding: "utf8",
	});
	assert.equal(seed.status, 0, seed.stderr);
	git("push", "--no-verify", "-u", "origin", "main");
	writeHistory({
		status: {
			updated_at: "2026-01-01T00:00:00Z",
			main_branch: "main",
			branch_warning_threshold: 10,
			branches: [],
		},
		log: [],
	});
	const hookPath = join(root, ".git/hooks/pre-push");
	const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
	writeFileSync(
		hookPath,
		`#!/bin/sh\nexec ${quote(process.execPath)} ${quote(join(scripts, "pre-push-project-history.mjs"))} "$@"\n`,
	);
	chmodSync(hookPath, 0o755);
	return {
		root,
		remote,
		git,
		cli,
		hook,
		state,
		commit,
		record,
		readHistory,
		writeHistory,
		cleanup: () => rmSync(base, { recursive: true, force: true }),
	};
}
