import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildSkills } from "../src/build-skills.js";
import { parseFrontmatter } from "../src/lib/frontmatter.js";
import { parseSkillManifest } from "../src/lib/manifests.js";
import { listSections } from "../src/lib/markdown-sections.js";

const REPO_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const SOURCE_DIR = path.join(REPO_ROOT, "sources", "executable-planning");
const MANIFEST_PATH = path.join(SOURCE_DIR, "skill.json");
const CONTENT_PATH = path.join(SOURCE_DIR, "executable-planning.md");
const BEHAVIORAL_FIXTURES_PATH = path.join(
	REPO_ROOT,
	"test",
	"fixtures",
	"behavioral-scenarios.json",
);
const EVAL_TASKS_DIR = path.join(
	REPO_ROOT,
	"evals",
	"executable-planning",
	"tasks",
);
const PLAN_IT_OUT_PATH = path.join(
	REPO_ROOT,
	".agents",
	"skills",
	"plan-it-out",
	"SKILL.md",
);
const OUTPUT_PATH = path.join(
	REPO_ROOT,
	".agents",
	"skills",
	"executable-planning",
	"SKILL.md",
);

const expectedH2Order = [
	"Invariants",
	"Harness Mechanisms",
	"Workflow",
	"Delegation",
	"Plan Template",
	"Before Presenting",
] as const;

const requiredPhrases = [
	"local plan",
	"autopilot",
	"domain-based",
	"tangible output",
	"awaiting user",
	"elaborat",
	"git",
	"commit message",
	"plan-review",
	"copy-and-keep",
	"git mv",
] as const;

const forbiddenPhrases = [
	"#tool:vscode",
	"/memories/session/",
	"handoff buttons",
	"target: vscode",
	"tools:",
	"agents:",
] as const;

const expectedProjectOwnedRuleIds: string[] = [
	"R01-planning-canonical-record",
	"R02-tool-agnostic-outcomes",
	"R03-clarify-success-scope",
	"R04-clarify-interaction-mode",
	"R05-clarify-storage-choice",
	"R06-clarify-constraints-risks",
	"R07-implicit-local-plan",
	"R08-implicit-autopilot",
	"R09-targeted-clarification-only",
	"R10-autopilot-conservative-assumptions",
	"R11-single-canonical-plan-path",
	"R12-reuse-existing-plan",
	"R13-create-plans-directory",
	"R14-plan-state-in-canonical-artifact",
	"R15-conversation-only-durability-warning",
	"R16-update-on-durable-state-transitions",
	"R17-domain-based-multi-phase",
	"R18-phase-iterative-reviewable",
	"R19-phase-tangible-output",
	"R20-phase-completion-and-validation",
	"R21-phase-steps-deferred-to-elaboration",
	"R22-phase-dependencies-risks-rollback",
	"R23-phase-checkpoint-by-mode",
	"R24-thin-end-to-end-increments",
	"R25-single-agent-default",
	"R26-planner-owns-step-authoring",
	"R27-subagent-read-only-discovery",
	"R28-parallelize-independent-discovery",
	"R29-synthesize-discovery-results",
	"R30-record-subagent-unavailable-fallback",
	"R31-interactive-phase-confirmation-step",
	"R32-interactive-stop-until-confirmed",
	"R33-user-interest-immediate-awaiting-user",
	"R34-user-deferral-preserved-with-trigger",
	"R35-autopilot-no-blocking-confirmation",
	"R36-autopilot-go-no-go-gates",
	"R37-autopilot-stop-only-safety-or-blocker",
	"R38-required-plan-structure-and-status-markers",
	"R39-one-current-step-and-next-action",
	"R40-quality-gate-before-delivery",
	"R41-git-read-only",
	"R42-phase-boundaries-revisable",
	"R43-elaboration-explicit-or-preexecution-trigger",
	"R44-elaboration-scoped-clarify",
	"R45-elaboration-review-checkpoint",
	"R46-checkpoint-does-not-auto-start-next-phase",
	"R47-interactive-checkpoint-commit-message-suggestion",
	"R48-no-commit-message-without-code-change",
	"R49-defer-commit-message-until-viable",
	"R50-archive-filesystem-move",
	"R51-compaction-preserves-evidence",
	"R52-plan-checker-risk-screen",
	"R53-plan-checker-ownership",
	"R54-plan-checker-unavailable",
	"R55-interactive-user-test-checkpoint",
];

test("executable-planning skill composes required static contract", async () => {
	for (const requiredPath of [MANIFEST_PATH, CONTENT_PATH]) {
		assert.equal(
			existsSync(requiredPath),
			true,
			`missing file: ${requiredPath}`,
		);
	}

	const manifest = parseSkillManifest(
		JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as unknown,
		MANIFEST_PATH,
		REPO_ROOT,
	);

	assert.ok(!/^(?:use|run|call)\b/i.test(manifest.description));

	const ownershipEntries = new Map<string, string>();
	for (const selection of manifest.selections) {
		for (const heading of selection.headings) {
			assert.equal(
				ownershipEntries.has(heading),
				false,
				`duplicate owner mapping for heading: ${heading}`,
			);
			ownershipEntries.set(heading, selection.owner);
			assert.equal(manifest.sectionOwnership[heading], selection.owner);
		}
	}
	assert.equal(ownershipEntries.size, expectedH2Order.length);

	await buildSkills({ repoRoot: REPO_ROOT, mode: "write" });
	assert.equal(existsSync(OUTPUT_PATH), true, `missing output: ${OUTPUT_PATH}`);

	const rendered = readFileSync(OUTPUT_PATH, "utf8");
	const parsed = parseFrontmatter(rendered, OUTPUT_PATH);
	assert.deepEqual(Object.keys(parsed.attributes), [
		"name",
		"description",
		"disable-model-invocation",
	]);
	assert.ok(
		!/^(?:use|run|call)\b/i.test(String(parsed.attributes.description ?? "")),
	);

	const h2Order = listSections(rendered)
		.filter((section) => section.level === 2)
		.map((section) => section.heading);
	assert.deepEqual(h2Order, expectedH2Order);

	for (const phrase of requiredPhrases) {
		assert.equal(
			rendered.includes(phrase),
			true,
			`missing required phrase: ${phrase}`,
		);
	}
	assert.match(
		rendered,
		/When the requester explicitly asks for a repo-backed plan, create or update the canonical file before presenting the plan/,
	);

	for (const phrase of forbiddenPhrases) {
		assert.equal(
			rendered.includes(phrase),
			false,
			`forbidden phrase present: ${phrase}`,
		);
	}

	for (const conditionalPhasePhrase of [
		"For plans with many steps",
		"For plans with 5+ steps",
	]) {
		assert.equal(
			rendered.includes(conditionalPhasePhrase),
			false,
			`conditional phase guidance must be removed: ${conditionalPhasePhrase}`,
		);
	}
});

test("supplied planning contract section set remains stable", () => {
	assert.equal(existsSync(CONTENT_PATH), true, `missing file: ${CONTENT_PATH}`);

	const headings = listSections(readFileSync(CONTENT_PATH, "utf8"))
		.filter((section) => section.level === 2)
		.map((section) => section.heading);

	assert.deepEqual(headings, expectedH2Order);
});

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
});

test("commit suggestions are interactive-only and use a code block", async () => {
	await buildSkills({ repoRoot: REPO_ROOT, mode: "write" });
	const rendered = readFileSync(OUTPUT_PATH, "utf8");

	assert.match(rendered, /Commit message[\s\S]*?fenced `text` block/);
	assert.match(
		rendered,
		/if no source code changed, provide no commit message or commit-like text/,
	);
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

test("plan-it-out references the current executable-planning workflow", () => {
	const content = readFileSync(PLAN_IT_OUT_PATH, "utf8");

	for (const staleHeading of [
		"Canonical Plan Artifact",
		"Clarify First",
		"Plan Design",
		"Phase Elaboration",
		"Required Plan Format",
	]) {
		assert.doesNotMatch(content, new RegExp(staleHeading));
	}
	assert.match(content, /Discover/);
	assert.match(content, /Clarify at outline level/);
});

test("executable planner agent requests free-text user-test observations", () => {
	const agent = readFileSync(
		path.join(REPO_ROOT, ".github", "agents", "executable-planner.agent.md"),
		"utf8",
	);

	assert.match(agent, /User Test.*free-text.*observation/i);
	assert.match(agent, /must not.*expected result/i);
	assert.match(agent, /No checkpoint tests yet\./);
});

test("behavioral pressure fixtures are complete and cover project-owned rules", () => {
	assert.equal(
		existsSync(BEHAVIORAL_FIXTURES_PATH),
		true,
		`missing file: ${BEHAVIORAL_FIXTURES_PATH}`,
	);

	const parsed = JSON.parse(
		readFileSync(BEHAVIORAL_FIXTURES_PATH, "utf8"),
	) as unknown;

	assert.equal(Array.isArray(parsed), true);
	if (!Array.isArray(parsed)) {
		assert.fail("behavioral fixtures must be an array");
	}

	assert.equal(parsed.length, 16);
	assert.equal(
		readdirSync(EVAL_TASKS_DIR).filter((entry) => entry.endsWith(".yaml"))
			.length,
		parsed.length,
		"every behavioral fixture must have a Waza task",
	);

	const seenPrompts = new Set<string>();
	const observedRuleIds = new Set<string>();

	for (const [index, caseValue] of parsed.entries()) {
		assert.equal(typeof caseValue, "object", `case ${index} must be object`);
		assert.notEqual(caseValue, null, `case ${index} must be non-null`);

		const record = caseValue as Record<string, unknown>;
		assert.deepEqual(Object.keys(record).sort(), [
			"forbiddenBehaviors",
			"prompt",
			"requiredBehaviors",
		]);

		assert.equal(
			typeof record.prompt,
			"string",
			`case ${index} prompt must be string`,
		);
		assert.notEqual(String(record.prompt).trim().length, 0);
		assert.equal(seenPrompts.has(String(record.prompt)), false);
		seenPrompts.add(String(record.prompt));

		assert.equal(Array.isArray(record.requiredBehaviors), true);
		assert.equal(Array.isArray(record.forbiddenBehaviors), true);

		const required = record.requiredBehaviors as unknown[];
		const forbidden = record.forbiddenBehaviors as unknown[];

		assert.ok(
			required.length > 0,
			`case ${index} requiredBehaviors must be non-empty`,
		);
		assert.ok(
			forbidden.length > 0,
			`case ${index} forbiddenBehaviors must be non-empty`,
		);

		for (const behavior of required) {
			assert.equal(typeof behavior, "string");
			assert.notEqual(String(behavior).trim().length, 0);

			const text = String(behavior);
			const match = /^\[(R\d{2}-[a-z0-9-]+)\]\s+/.exec(text);
			if (!match) {
				assert.fail(
					`case ${index} requiredBehaviors must start with explicit rule id tag`,
				);
			}

			const ruleId = match[1];
			if (!ruleId) {
				assert.fail(
					`case ${index} requiredBehaviors must include a rule id match`,
				);
			}
			assert.equal(
				expectedProjectOwnedRuleIds.includes(ruleId),
				true,
				`unknown required rule id in fixture: ${ruleId}`,
			);
			observedRuleIds.add(ruleId);
		}

		for (const behavior of forbidden) {
			assert.equal(typeof behavior, "string");
			assert.notEqual(String(behavior).trim().length, 0);

			const text = String(behavior);
			const match = /^\[(R\d{2}-[a-z0-9-]+)\]\s+/.exec(text);
			if (!match) {
				assert.fail(
					`case ${index} forbiddenBehaviors must start with explicit rule id tag`,
				);
			}

			const ruleId = match[1];
			if (!ruleId) {
				assert.fail(
					`case ${index} forbiddenBehaviors must include a rule id match`,
				);
			}
			assert.equal(
				expectedProjectOwnedRuleIds.includes(ruleId),
				true,
				`unknown forbidden rule id in fixture: ${ruleId}`,
			);
		}
	}

	assert.deepEqual(
		[...observedRuleIds].sort(),
		[...expectedProjectOwnedRuleIds].sort(),
		"every project-owned rule must be required by at least one scenario",
	);
});
