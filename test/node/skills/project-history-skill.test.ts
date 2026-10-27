import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillPath = new URL(
	"../../../skills/project-history/SKILL.md",
	import.meta.url,
);
const contractPath = new URL(
	"../../../skills/project-history/references/contract.md",
	import.meta.url,
);

async function readSkill(): Promise<string> {
	return readFile(skillPath, "utf8");
}

function runtimeImports(text: string): string[] {
	return [
		...text
			.replace(/^\/\/.*$/gm, "")
			.matchAll(/(?:\bfrom\s+|\bimport\s*(?:\(\s*)?)["']([^"']+)["']/g),
	].map((match) => {
		assert.ok(match[1]);
		return match[1];
	});
}

test("project-history defines valid frontmatter and metadata", async () => {
	const skill = await readSkill();

	assert.match(skill, /^---\nname: project-history\n/);
	assert.match(
		skill,
		/description: Sets up Git decision changelogs, branch inventories, and pre-push guards\./,
	);
});

test("project-history includes required assets and contract", async () => {
	const skill = await readSkill();

	assert.match(skill, /references\/contract\.md/);
	assert.match(skill, /scripts\/check-project-history\.mjs/);
	assert.match(skill, /scripts\/pre-push-project-history\.mjs/);
	assert.match(skill, /scripts\/record-history\.mjs/);

	const contract = await readFile(contractPath, "utf8");
	assert.match(contract, /# Project history contract/);
	assert.match(contract, /PROJECT_HISTORY\.yaml/);
	assert.match(contract, /updated_at/);
	assert.match(contract, /branch_warning_threshold/);
	assert.doesNotMatch(contract, /committedAt|branchName|planningDoc|JSONL?/);

	const checker = new URL(
		"../../../skills/project-history/scripts/check-project-history.mjs",
		import.meta.url,
	);
	const prePush = new URL(
		"../../../skills/project-history/scripts/pre-push-project-history.mjs",
		import.meta.url,
	);
	const record = new URL(
		"../../../skills/project-history/scripts/record-history.mjs",
		import.meta.url,
	);

	assert.ok((await stat(checker)).isFile());
	assert.ok((await stat(prePush)).isFile());
	assert.ok((await stat(record)).isFile());
});

test("project-history installs a complete standalone YAML runtime", async () => {
	const scripts = new URL("scripts/", skillPath);
	const fixture = new URL(
		`../../../.waza-cache/project-history-smoke-${randomUUID()}/`,
		import.meta.url,
	);
	const skill = await readSkill();
	const contract = await readFile(contractPath, "utf8");
	const files = await readdir(scripts);
	assert.ok(files.includes("yaml.mjs"));
	assert.match(
		await readFile(new URL("yaml.LICENSE", scripts), "utf8"),
		/Copyright Eemeli Aro[\s\S]*Permission to use, copy/,
	);
	await mkdir(fixture, { recursive: true });
	try {
		for (const file of files) {
			const source = new URL(file, scripts);
			const text = await readFile(source, "utf8");
			for (const specifier of file.endsWith(".mjs")
				? runtimeImports(text)
				: []) {
				assert.ok(
					specifier.startsWith("node:") ||
						(specifier.startsWith("./") && files.includes(specifier.slice(2))),
					`${file} must not depend on an uninstalled module: ${specifier}`,
				);
			}
			await copyFile(source, new URL(file, fixture));
		}
		const result = spawnSync(
			process.execPath,
			[
				"--input-type=module",
				"--eval",
				`
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const checker = await import("./check-project-history.mjs");
assert.equal(typeof checker.parseHistoryData, "function",
	"standalone checker must expose YAML parsing");
await import("./pre-push-project-history.mjs");
await import("./record-history.mjs");
const { parseHistoryData, parseLogDocument, formatHistoryDocument } = checker;
const { validateBranchRecords, validateReachableEntries } =
	await import("./history-entry-validation.mjs");
const { writeHistoryState } = await import("./record-history-helpers.mjs");
const { parse } = await import("./yaml.mjs");
const input = ${JSON.stringify(`status:
  updated_at: "2026-10-09T12:00:00Z"
  main_branch: main
  branch_warning_threshold: 10
  branches:
    - branch_name: main
      committed_at: "2026-10-09T12:00:00Z"
      subject: "Record history: #1"
      status: no related plan
      planning_doc: (none)
      ref: refs/remotes/origin/main
# Note: Commits prior to this point do not have recorded historical context.
log:
  - committed_at: "2026-10-09T12:00:00Z"
    subject: "Record history: #1"
    decisions:
      - "the tooling should preserve YAML punctuation: # and Unicode 🐜."
`)};
const data = parseHistoryData(input, "PROJECT_HISTORY.yaml");
assert.equal(data.updatedAt, "2026-10-09T12:00:00Z");
assert.equal(data.mainBranch, "main");
assert.equal(data.threshold, 10);
assert.equal(data.branchRecords[0].planningDoc, "(none)");
assert.equal(data.logEntries[0].subject, "Record history: #1");
const output = formatHistoryDocument({
	updatedAt: data.updatedAt, mainBranch: data.mainBranch,
	threshold: data.threshold, branches: data.branchRecords,
	entries: data.logEntries, hasUnrecordedNote: true,
});
assert.deepEqual(parseHistoryData(output, "PROJECT_HISTORY.yaml"), data);
assert.deepEqual(Object.keys(parse(output)), ["status", "log"]);
assert.deepEqual(Object.keys(parse(output).status.branches[0]),
	["branch_name", "committed_at", "subject", "status", "planning_doc", "ref"]);
assert.ok(output.includes("# Note: Commits prior"));
assert.ok(!/committedAt|branchName|planningDoc|json/.test(output));
for (const [before, after, message] of [
	["branch_warning_threshold: 10", 'branch_warning_threshold: "10"', /threshold/],
	["main_branch: main", "main_branch: []", /main_branch/],
	["2026-10-09T12:00:00Z", "2026-02-30T12:00:00Z", /date/],
	["planning_doc: (none)", "planning_doc: []", /planning_doc/],
	["status: no related plan", "status: unknown", /status/],
	["decisions:", "decisions: invalid\\n    unused:", /decisions/],
]) {
	assert.throws(() => parseHistoryData(input.replace(before, after),
		"PROJECT_HISTORY.yaml"), message);
}
assert.throws(() => parseHistoryData(input + "\\nlog: []\\n",
	"PROJECT_HISTORY.yaml"), /YAML/);
assert.throws(() => parseHistoryData(input + "\\ndomains: []\\n",
	"PROJECT_HISTORY.yaml"), /both/);
assert.throws(() => parseHistoryData("log: []\\n" +
	input.slice(0, input.indexOf("# Note:")), "PROJECT_HISTORY.yaml"), /before/);
for (const path of ["../escape.yaml", "docs/project-history/../escape.yaml",
	"/absolute.yaml", "docs/project-history/a.md"]) {
	assert.throws(() => parseLogDocument("domains:\\n  - " + path + "\\n",
		"PROJECT_HISTORY.yaml"), /path/);
}
assert.throws(() => parseLogDocument("domains:\\n  - docs/project-history/a.yaml\\n" +
	"  - docs/project-history/a.yaml\\n", "PROJECT_HISTORY.yaml"), /duplicate/);
const branches = data.branchRecords;
const actual = new Map([[branches[0].ref, branches[0]]]);
validateBranchRecords([{ ...branches[0], branchName: "main [unpushed changes]" }],
	actual, "PROJECT_HISTORY.yaml");
assert.throws(() => validateBranchRecords([...branches, ...branches], actual,
	"PROJECT_HISTORY.yaml"), /duplicate/);
const pair = JSON.stringify(["2026-10-09T12:00:00Z", "Record history: #1"]);
assert.throws(() => validateReachableEntries(data.logEntries, new Map([[pair, 2]]),
	"PROJECT_HISTORY.yaml"), /missing/);
mkdirSync("docs/project-history", { recursive: true });
const domain = "docs/project-history/tooling.yaml";
const root = resolve(".");
const source = resolve("PROJECT_HISTORY.yaml");
writeHistoryState(root, null, undefined, [], source, data.updatedAt, "main", 10,
	branches, true, data.logEntries, "PROJECT_HISTORY.yaml");
assert.deepEqual(parseHistoryData(readFileSync(source, "utf8"),
	"PROJECT_HISTORY.yaml"), data);
// Initialize a domain with the existing writer, then append without duplicating it.
writeHistoryState(root, [domain], undefined, data.logEntries, source,
	data.updatedAt, "main", 10, branches, true, data.logEntries, "PROJECT_HISTORY.yaml");
const index = parseHistoryData(readFileSync(source, "utf8"), "PROJECT_HISTORY.yaml");
assert.deepEqual(index.domainPaths, [domain]);
assert.equal(index.logEntries, null);
assert.ok(readFileSync(source, "utf8").includes("# Note: Commits prior"));
assert.deepEqual(parseLogDocument(readFileSync(domain, "utf8"), domain).entries,
	data.logEntries);
`,
			],
			{ cwd: fileURLToPath(fixture), encoding: "utf8" },
		);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		for (const file of files) {
			assert.ok(
				skill.includes(`scripts/${file}`),
				`skill must install ${file}`,
			);
			assert.ok(
				contract.includes(`scripts/${file}`),
				`contract must list ${file}`,
			);
		}
	} finally {
		await rm(fixture, { recursive: true, force: true });
	}
});

test("project-history specifies one-time installation and hook setup", async () => {
	const skill = await readSkill();

	assert.match(skill, /One-time installation into a target project/);
	assert.match(skill, /post-commit/);
	assert.match(skill, /pre-push/);
	assert.match(skill, /Guidance to add to each AGENTS\.md/);
	assert.match(skill, /## Scope boundaries/);
	assert.match(skill, /history:record/);
});
