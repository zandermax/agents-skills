import {
	assert,
	buildSkills,
	OUTPUT_PATH,
	REPO_ROOT,
	readFileSync,
	test,
} from "./executable-planning-skill.shared.js";

test("plan design supports single-phase plans when the work is genuinely small", async () => {
	await buildSkills({ repoRoot: REPO_ROOT, mode: "write" });
	const rendered = readFileSync(OUTPUT_PATH, "utf8");

	assert.match(
		rendered,
		/Use a single phase for small, self-contained work with one inspectable outcome and one validation path/,
	);
	assert.match(
		rendered,
		/add phases only when distinct boundaries, dependencies, or independently reviewable outputs justify them/,
	);
	assert.doesNotMatch(
		rendered,
		/Organize every plan into at least two conceptually domain-based phases/,
	);
});

test("repo-backed plans require lifecycle frontmatter on creation and updates", async () => {
	await buildSkills({ repoRoot: REPO_ROOT, mode: "write" });
	const rendered = readFileSync(OUTPUT_PATH, "utf8");

	assert.match(rendered, /Start every repo-backed plan with YAML frontmatter/);
	assert.match(
		rendered,
		/When creating or modifying a plan, preserve the frontmatter delimiters/,
	);
	assert.match(
		rendered,
		/current_phase: <phase \(e\.g\., Phase 1 -- <domain-based name>\) or not started>/,
	);
});

test("commit suggestions are interactive-only and use a code block", async () => {
	await buildSkills({ repoRoot: REPO_ROOT, mode: "write" });
	const rendered = readFileSync(OUTPUT_PATH, "utf8");

	assert.match(rendered, /Commit message[\s\S]*?fenced `text` block/);
	assert.match(
		rendered,
		/if no source code changed, provide no commit message or commit-like text/,
	);
	assert.match(rendered, /No commit yet, unless you're feeling froggy 🐸/);
});

test("completed repo-backed plans must be relocated, not copied", async () => {
	await buildSkills({ repoRoot: REPO_ROOT, mode: "write" });
	const rendered = readFileSync(OUTPUT_PATH, "utf8");

	assert.match(
		rendered,
		/filesystem move \(`mv`\) or by writing the archive file and then deleting the original/,
	);
	assert.match(
		rendered,
		/Treat archive as complete only when[\s\S]*exists and[\s\S]*does not/,
	);
	assert.match(rendered, /Never copy-and-keep/);
	assert.match(rendered, /Never `git mv`/);
});

test("workflow defines mode combinations and durable state updates precisely", async () => {
	await buildSkills({ repoRoot: REPO_ROOT, mode: "write" });
	const rendered = readFileSync(OUTPUT_PATH, "utf8");

	assert.match(rendered, /Interactive \+ session-only handoff/);
	assert.match(rendered, /never implement project work/);
	assert.match(rendered, /Invariant precedence/);
	assert.match(rendered, /durable state transition/);
	assert.match(
		rendered,
		/Autopilot:[\s\S]*user-interest item[\s\S]*Deferred Items/,
	);
	assert.match(
		rendered,
		/three or more phases|security-sensitive|data migration/,
	);
	assert.match(rendered, /shared `plan-checker` risk screen/);
	assert.match(
		rendered,
		/After the complete plan has been assembled[\s\S]*before presenting it through the plan-review mechanism or beginning autopilot execution/,
	);
	assert.match(
		rendered,
		/If the checker is unavailable, continue only as `unchecked`[\s\S]*do not claim that the plan passed review/,
	);
	assert.doesNotMatch(rendered, /run a clean-context review/);
	assert.match(
		rendered,
		/The compacted step is the sole owner of that evidence/,
	);
	assert.match(
		rendered,
		/Progress Log records only the transition without restating the command or outcome/,
	);
	assert.match(
		rendered,
		/verify each evidence pair appears only on its owning step/,
	);
	assert.match(
		rendered,
		/Next task = the first `- \[ \]` line \(leaf-level, not a section\/phase header\) encountered scanning the plan document top to bottom/,
	);
	assert.match(
		rendered,
		/Ignore step numbering\/lettering, section titles, and conversational context entirely when determining "next\."/,
	);
});

test("interactive checkpoints require independent user-test evidence", async () => {
	await buildSkills({ repoRoot: REPO_ROOT, mode: "write" });
	const rendered = readFileSync(OUTPUT_PATH, "utf8");

	assert.match(rendered, /User Test/);
	assert.match(rendered, /free-text observation/i);
	assert.match(rendered, /independent.*executor.*validation/i);
	assert.match(rendered, /unavailable.*reason|reason.*unavailable/i);
	assert.match(rendered, /Autopilot[\s\S]*no user-test checkpoint/i);
	assert.match(rendered, /No checkpoint tests yet\./);
	assert.doesNotMatch(rendered, /User Test[\s\S]*suggested answer/i);
});
