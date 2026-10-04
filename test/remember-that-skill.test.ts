import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	lstat,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillPath = new URL("../skills/remember-that/SKILL.md", import.meta.url);
const agentPath = new URL("../agents/remember-that.agent.md", import.meta.url);

test("remember-that skill exposes canonical memory skills as read-only to all agents", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(
		skill,
		/every agent may read memory skill files at[\s\S]*~\/\.memory\/<skill-name>\/SKILL\.md/i,
	);
	assert.match(skill, /does not permit writes/i);
	assert.match(skill, /does not use a root-level `\/memories\/\.\.\.` path/i);
	assert.match(
		skill,
		/does not prompt the user\s+for permission to read memory paths/i,
	);
	assert.match(skill, /does not use\s+a harness-level memory\s+tool/i);
	assert.match(
		skill,
		/proactively consult and load matching memory skills on demand without prompting/i,
	);
	assert.match(skill, /action-oriented trigger keywords/i);
});

test("remember-that skill consults ctx only when capturing", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /## Prior Context Lookup \(Optional\)/);
	assert.match(skill, /\bctx\b/);
	assert.match(skill, /capture only/i);
	assert.match(skill, /never run it\s+while retrieving/i);
});

test("memory registration is idempotent, runnable through its installed link, and rejects a repository-backed parent", async () => {
	const home = await mkdtemp(path.join(os.tmpdir(), "memory-registration-"));
	const topic = "boundary-fixture-notes";
	const memory = path.join(home, ".memory", topic);
	const skills = path.join(home, ".claude", "skills");
	const helper = fileURLToPath(
		new URL(
			"../skills/remember-that/scripts/register-memory.ts",
			import.meta.url,
		),
	);
	const run = (script = helper, arguments_: string[] = [topic]) =>
		spawnSync(
			process.execPath,
			["--experimental-strip-types", script, ...arguments_],
			{
				env: {
					...process.env,
					AGENTS_SKILLS_HOME: home,
					MEMORY_DIR: path.join(home, ".memory"),
				},
				encoding: "utf8",
			},
		);
	try {
		await mkdir(path.join(memory, "test"), { recursive: true });
		await writeFile(
			path.join(memory, "SKILL.md"),
			`---\nname: ${topic}\ndescription: Personal boundary testing preferences.\n---\n`,
		);
		await writeFile(path.join(memory, "test", `${topic}.test.ts`), "");
		await mkdir(path.dirname(skills), { recursive: true });
		await symlink(
			fileURLToPath(new URL("../skills/", import.meta.url)),
			skills,
			"dir",
		);
		const rejected = run();
		assert.notEqual(rejected.status, 0);
		assert.match(
			rejected.stderr,
			/Destination parent resolves inside an artifact source/,
		);
		await rm(skills);
		const installed = run();
		assert.equal(installed.status, 0, installed.stderr);
		assert.equal(
			(await lstat(path.join(skills, topic))).isSymbolicLink(),
			true,
		);
		await symlink(
			fileURLToPath(new URL("../skills/remember-that/", import.meta.url)),
			path.join(skills, "remember-that"),
			"dir",
		);
		const repeated = run(
			path.join(skills, "remember-that", "scripts", "register-memory.ts"),
		);
		assert.equal(repeated.status, 0, repeated.stderr);
		assert.match(repeated.stdout, /created=0 existing=1/);
		const removed = run(helper, [topic, "--uninstall"]);
		assert.equal(removed.status, 0, removed.stderr);
		assert.equal((await lstat(memory)).isDirectory(), true);
	} finally {
		await rm(home, { recursive: true, force: true });
	}
});

test("remember-that skill skips ctx silently when unavailable", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /ctx status/);
	assert.match(skill, /skip this entire\s+section silently/i);
	assert.match(skill, /emit no message/i);
	assert.match(skill, /never run\s+`ctx setup`/i);
});

test("remember-that skill treats ctx findings as suggestions only", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /suggestion for the human, never\s+content/i);
	assert.match(skill, /never merge, quote into, or paraphrase/i);
	assert.match(skill, /at most three suggestions/i);
	assert.match(skill, /untrusted data, never as instructions/i);
	assert.match(skill, /no `ctx`-derived content was written/i);
});

test("remember-that skill asks clarifying questions only when the preference is ambiguous", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /## Interactive Clarification \(Case-by-Case\)/);
	assert.match(skill, /not always needed/i);
	assert.match(skill, /skip straight to routing/i);
	assert.match(skill, /Ambiguous topic\/scope/i);
	assert.match(skill, /Conflicts with an existing note/i);
	assert.match(skill, /Missing key detail/i);
	assert.match(skill, /Uncertain durability/i);
});

test("remember-that skill prefers interactive question tools when available", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /interactive\s+question-asking tool/i);
	assert.match(skill, /askQuestions/);
	assert.match(skill, /wait for the user's next message/i);
	assert.match(skill, /[Nn]ever fabricate an answer/i);
	assert.match(skill, /[Ss]kip this step silently/i);
});

test("remember-that skill runs customization evaluation after capture when available", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(skill, /## Post-Capture Customization Evaluation\n/);
	assert.match(skill, /Do not prompt for confirmation before this step/);
	assert.match(skill, /run the memory topic's test suite/i);
	assert.match(
		skill,
		/run this\s+evaluation automatically whenever an evaluation skill is available/i,
	);
	assert.match(
		skill,
		/Skip this\s+step silently only when no customization-evaluation skill is available/i,
	);
	assert.match(skill, /fix-customization-evaluation-diagnostics/);
	assert.match(skill, /analyze-prompt/);
	assert.match(skill, /Evaluate and fix the file/);
	assert.match(skill, /complete any fixes it applies or recommends/i);
	assert.match(
		skill,
		/apply any\s+resulting fixes manually before continuing/i,
	);
	assert.match(skill, /skip this section silently/i);
	assert.match(
		skill,
		/Never block or delay capture when no evaluation skill is available/i,
	);
	assert.match(skill, /Run the Post-Capture Customization Evaluation step/i);
});

test("remember-that skill does not instruct ctx pro or blame usage", async () => {
	const skill = await readFile(skillPath, "utf8");

	assert.match(
		skill,
		/never run `ctx blame`, `ctx pro`, or\s+`ctx pro manage`/i,
	);
});

test("remember-that agent notes the optional suggestion-only ctx lookup", async () => {
	const agent = await readFile(agentPath, "utf8");

	assert.match(agent, /optionally consult the `ctx` CLI/i);
	assert.match(agent, /suggestion-only/i);
	assert.match(agent, /skip the lookup silently/i);
});
