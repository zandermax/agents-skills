import assert from "node:assert/strict";
import test from "node:test";
import { historyFixture } from "./project-history-fixture.ts";

test("added, deleted and changed tracking refs are advisory, while startup counts actual refs", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	f.record();
	const data = f.readHistory();
	data.status.branch_warning_threshold = 1;
	f.writeHistory(data);
	f.git("update-ref", "refs/remotes/origin/main", "HEAD");
	f.git("update-ref", "refs/remotes/origin/new", "HEAD");
	let result = f.cli("check-project-history.mjs", ["--startup"]);
	assert.equal(result.status, 0, result.stderr);
	assert.match(
		result.stderr,
		/actual branch count 2 exceeds configured threshold 1/,
	);
	assert.match(
		result.stderr,
		/snapshot.*changed.*refs\/remotes\/origin\/main/i,
	);
	assert.match(result.stderr, /snapshot.*added.*refs\/remotes\/origin\/new/i);
	f.git("update-ref", "-d", "refs/remotes/origin/main");
	f.git("update-ref", "-d", "refs/remotes/origin/new");
	result = f.cli("check-project-history.mjs", ["--startup"]);
	assert.equal(result.status, 0, result.stderr);
	assert.match(
		result.stderr,
		/snapshot.*removed.*refs\/remotes\/origin\/main/i,
	);
	assert.doesNotMatch(result.stderr, /exceeds configured threshold/);
	assert.deepEqual(
		f.readHistory().log,
		data.log,
		"drift checks retain historical decisions",
	);
});

test("snapshot drift does not waive missing or surplus reachable commit entries", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	f.record();
	f.git("update-ref", "refs/remotes/origin/main", "HEAD");
	const valid = f.readHistory();
	for (const [entries, diagnostic] of [
		[valid.log.slice(1), /missing reachable commit/],
		[[...valid.log, valid.log.at(-1)], /surplus copies/],
	] as const) {
		const data = structuredClone(valid);
		data.log = entries;
		data.status.updated_at = data.log[0].committed_at;
		f.writeHistory(data);
		const result = f.cli("check-project-history.mjs");
		assert.equal(result.status, 1, result.stderr);
		assert.match(result.stderr, diagnostic);
	}
});

test("malformed dated snapshots remain invalid without any matching live ref", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	f.record();
	f.git("update-ref", "-d", "refs/remotes/origin/main");
	const valid = f.readHistory();
	for (const [field, value, diagnostic] of [
		["branch_name", "wrong", /branchName|branch_name/],
		["ref", "refs/heads/main", /ref/],
		["ref", "refs/remotes/origin/../escape", /ref/],
		["committed_at", "2026-02-30T00:00:00Z", /date/],
		["subject", "", /subject/],
		["status", "unknown", /status/],
		["planning_doc", "../escape.md", /planningDoc|planning_doc/],
		["planning_doc", "/absolute.md", /planningDoc|planning_doc/],
		["planning_doc", "docs/../escape.md", /planningDoc|planning_doc/],
	] as const) {
		const data = structuredClone(valid);
		data.status.branches[0][field] = value;
		f.writeHistory(data);
		const result = f.cli("check-project-history.mjs");
		assert.equal(result.status, 1, `must reject ${field}=${value}`);
		assert.match(result.stderr, diagnostic);
	}
	const data = structuredClone(valid);
	data.status.branches.push(data.status.branches[0]);
	f.writeHistory(data);
	const result = f.cli("check-project-history.mjs");
	assert.equal(result.status, 1);
	assert.match(result.stderr, /duplicate/);
});

test("malformed durable history fails pre-push without changing staged or working edits", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	f.record();
	const data = f.readHistory();
	data.status.branches[0].status = "unknown";
	f.writeHistory(data);
	f.git("add", "PROJECT_HISTORY.yaml");
	f.commit("Malformed snapshot");
	const before = f.state();
	const result = f.hook();
	assert.deepEqual(f.state(), before);
	assert.equal(result.status, 1, result.stderr);
	assert.match(result.stderr, /status must be one of/);
	assert.match(result.stderr, /record-history\.mjs/);
});

test("strict log schema rejects missing decisions and malformed retained entries despite ref deletion", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	f.record();
	f.git("update-ref", "-d", "refs/remotes/origin/main");
	const valid = f.readHistory();
	for (const [field, value, diagnostic] of [
		["decisions", undefined, /decisions must be an array/],
		["decisions", "invalid", /decisions must be an array/],
		["decisions", ["  "], /non-whitespace/],
		["subject", "", /subject must be a nonempty/],
		["subject", "multiple\nlines", /subject must be.*single.line/],
		["committed_at", "2026-02-30T00:00:00Z", /date/],
	] as const) {
		const data = structuredClone(valid);
		data.log[0][field] = value;
		f.writeHistory(data);
		const result = f.cli("check-project-history.mjs");
		assert.equal(result.status, 1, `must reject log ${field}=${value}`);
		assert.match(result.stderr, diagnostic);
	}
});

test("live cleanup and unpushed advice ignores deleted or advanced snapshot candidates", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	f.record();
	f.git("branch", "feature");
	f.git("update-ref", "refs/remotes/origin/feature", "HEAD");
	const data = f.readHistory();
	data.status.branches.push({
		...data.status.branches[0],
		branch_name: "feature",
		ref: "refs/remotes/origin/feature",
		status: "removal candidate",
	});
	f.writeHistory(data);
	f.record("Record candidate snapshot");
	let result = f.hook();
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stderr, /git push 'origin' --delete 'feature'/);
	f.git("update-ref", "-d", "refs/remotes/origin/feature");
	result = f.hook();
	assert.equal(result.status, 0, result.stderr);
	assert.doesNotMatch(result.stderr, /--delete 'feature'/);
	f.git("checkout", "feature");
	f.commit("Feature work");
	f.git("update-ref", "refs/remotes/origin/feature", "HEAD");
	f.commit("More feature work");
	f.git("checkout", "main");
	f.record("Record live feature history");
	result = f.hook();
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stderr, /following branch.*unpushed changes/);
	assert.match(result.stderr, / {2}- feature\n/);
	assert.doesNotMatch(result.stderr, /--delete 'feature'/);
});

test("pre-push handles empty, deletion-only and malformed input without side effects", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	const before = f.state();
	const zero = "0".repeat(40);
	for (const [input, status] of [
		["", 0],
		[`(delete) ${zero} refs/heads/old ${"1".repeat(40)}\n`, 0],
		["not a ref update\n", 1],
		[`refs/heads/../bad ${"1".repeat(40)} refs/heads/main ${zero}\n`, 1],
	] as const) {
		const result = f.hook(input);
		assert.equal(result.status, status, result.stderr);
		assert.deepEqual(f.state(), before);
	}
});

test("advisories do not block valid pushes after the local main ref is renamed", (t) => {
	const f = historyFixture();
	t.after(f.cleanup);
	f.record();
	f.git("branch", "other");
	f.git("branch", "-m", "main", "release");
	const input = `refs/heads/release ${f.git("rev-parse", "HEAD")} refs/heads/main ${f.git("rev-parse", "origin/main")}\n`;
	for (const deleteTracking of [false, true]) {
		if (deleteTracking) f.git("update-ref", "-d", "refs/remotes/origin/main");
		const before = f.state();
		const result = f.hook(input);
		assert.equal(result.status, 0, result.stderr);
		assert.deepEqual(f.state(), before);
		if (deleteTracking) assert.match(result.stderr, /main ref.*unavailable/);
	}
});
