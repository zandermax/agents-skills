import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { historyFixture } from "./project-history-fixture.ts";

test("recording persists plain branch names before and after a push", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	f.record();
	assert.equal(f.readHistory().status.branches[0].branch_name, "main");
	f.git("push", "origin", "main");
	f.record("Record subsequent history");
	assert.equal(f.readHistory().status.branches[0].branch_name, "main");
});

test("bare-remote push lifecycle keeps selected commits and validates after tracking refs advance", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	f.record();
	for (const subject of ["initial", "subsequent"]) {
		if (subject === "subsequent") f.record("Record subsequent history");
		const before = f.state();
		const selectedHead = f.git("rev-parse", "HEAD");
		const index = readFileSync(join(f.root, ".git/index"));
		const hook = f.hook();
		assert.equal(hook.status, 0, hook.stderr);
		assert.deepEqual(f.state(), before, "pre-push must be strictly read-only");
		f.git("push", "origin", "main");
		assert.equal(f.git("rev-parse", "HEAD"), selectedHead);
		assert.equal(f.git("rev-parse", "origin/main"), selectedHead);
		assert.equal(
			f.git("--git-dir", f.remote, "rev-parse", "main"),
			selectedHead,
		);
		assert.deepEqual(readFileSync(join(f.root, ".git/index")), index);
		const check = f.cli("check-project-history.mjs", ["--startup"]);
		assert.equal(check.status, 0, check.stderr);
		assert.match(check.stderr, /advisory.*snapshot.*(drift|changed)/i);
		assert.equal(f.git("status", "--porcelain", "--untracked-files=no"), "");
		const pushedState = f.state(false);
		f.git("push", "origin", "main");
		assert.deepEqual(f.state(false), pushedState);
		assert.equal(f.git("rev-parse", "HEAD"), selectedHead);
	}
});

test("pre-push fails without mutating HEAD, index, refs, config or files for unrecorded commits", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	f.record();
	f.commit("Unrecorded feature");
	const before = f.state();
	const result = f.hook();
	assert.deepEqual(f.state(), before, "failure must not synchronize or amend");
	assert.equal(result.status, 1, result.stderr);
	assert.match(result.stderr, /missing reachable commit.*Unrecorded feature/);
	assert.match(
		result.stderr,
		/node scripts\/project-history\/record-history\.mjs/,
	);
	f.record("Record feature history");
	assert.equal(f.hook().status, 0);
});

test("pre-push requires committed history even when valid history is staged or in the worktree", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	f.record();
	const path = join(f.root, "PROJECT_HISTORY.yaml");
	const valid = readFileSync(path);
	f.git("rm", "PROJECT_HISTORY.yaml");
	f.commit("Remove durable history");
	writeFileSync(path, valid);
	f.git("add", "PROJECT_HISTORY.yaml");
	const before = f.state();
	const result = f.hook();
	assert.deepEqual(f.state(), before);
	assert.equal(result.status, 1, result.stderr);
	assert.match(result.stderr, /missing from committed HEAD/);
	assert.match(result.stderr, /record-history\.mjs/);
});

test("legacy marker is readable, never drives live warnings, and normalizes on explicit recording", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	f.record();
	f.git("branch", "feature");
	f.git("update-ref", "refs/remotes/origin/feature", "HEAD");
	const data = f.readHistory();
	const legacy = {
		...data.status.branches[0],
		branch_name: "feature [unpushed changes]",
		ref: "refs/remotes/origin/feature",
	};
	data.status.branches.push(legacy);
	f.writeHistory(data);
	// Recording a prospective entry makes this fixture commit durable without the recorder normalizing it.
	const head = f.git("rev-parse", "HEAD");
	data.log.unshift({
		committed_at: new Date(
			(Number(f.git("show", "-s", "--format=%ct", head)) + 1) * 1000,
		)
			.toISOString()
			.replace(".000Z", "Z"),
		subject: "Persist legacy snapshot",
		decisions: [],
	});
	data.status.updated_at = data.log[0].committed_at;
	f.writeHistory(data);
	f.git("add", "PROJECT_HISTORY.yaml");
	f.commit("Persist legacy snapshot");
	const result = f.hook();
	assert.equal(result.status, 0, result.stderr);
	assert.doesNotMatch(
		result.stderr,
		/following branch.*unpushed changes| {2}- feature\n/,
	);
	const decisions = data.log.map(
		(entry: { decisions: string[] }) => entry.decisions,
	);
	f.record("Normalize legacy snapshot");
	assert.deepEqual(
		f
			.readHistory()
			.log.slice(1)
			.map((entry: { decisions: string[] }) => entry.decisions),
		decisions,
	);
	assert.ok(
		f
			.readHistory()
			.status.branches.every(
				(branch: { branch_name: string }) =>
					!branch.branch_name.includes("[unpushed changes]"),
			),
	);
});
