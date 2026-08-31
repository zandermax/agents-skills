import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
const CORE_PATH = path.join(SOURCE_DIR, "core.md");
const OFFICIAL_PATH = path.join(
	REPO_ROOT,
	"vendor",
	"copilot",
	"Plan.agent.md",
);
const SKILL_ONLY_PATH = path.join(SOURCE_DIR, "skill-only.md");
const TRANSFORMS_PATH = path.join(SOURCE_DIR, "transforms.json");
const BEHAVIORAL_FIXTURES_PATH = path.join(
	REPO_ROOT,
	"test",
	"fixtures",
	"behavioral-scenarios.json",
);
const OUTPUT_PATH = path.join(
	REPO_ROOT,
	".agents",
	"skills",
	"executable-planning",
	"SKILL.md",
);

const expectedH2Order = [
	"Operating Contract",
	"Clarify First",
	"Canonical Plan Artifact",
	"Plan Design",
	"Phase Elaboration",
	"Delegate Step Design",
	"Checkpoints and User Interest",
	"Required Plan Format",
	"Quality Check Before Delivery",
	"1. Discovery",
	"2. Alignment",
	"3. Design",
	"4. Refinement",
	"When to Use",
	"Harness Adaptation",
] as const;

const requiredPhrases = [
	"local plan",
	"autopilot",
	"domain-based",
	"tangible output",
	"awaiting-user",
	"elaborat",
	"git",
	"Discovery",
	"Alignment",
	"Design",
	"Refinement",
] as const;

const forbiddenPhrases = [
	"#tool:vscode",
	"/memories/session/",
	"handoff buttons",
	"target: vscode",
	"tools:",
	"agents:",
] as const;

const expectedProjectOwnedRuleIds = [
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
	"R16-update-on-material-events",
	"R17-domain-based-multi-phase",
	"R18-phase-iterative-reviewable",
	"R19-phase-tangible-output",
	"R20-phase-completion-and-validation",
	"R21-phase-steps-deferred-to-elaboration",
	"R22-phase-dependencies-risks-rollback",
	"R23-phase-checkpoint-by-mode",
	"R24-thin-end-to-end-increments",
	"R25-single-agent-exception-justified",
	"R26-subagent-phase-step-outlines",
	"R27-subagent-no-implementation",
	"R28-parallelize-independent-phase-planning",
	"R29-synthesize-and-resolve-conflicts",
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
] as const;

test("executable-planning skill composes required static contract", async () => {
	for (const requiredPath of [
		MANIFEST_PATH,
		CORE_PATH,
		OFFICIAL_PATH,
		SKILL_ONLY_PATH,
		TRANSFORMS_PATH,
	]) {
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

	assert.ok(manifest.description.startsWith("Use when"));

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
	assert.deepEqual(Object.keys(parsed.attributes), ["name", "description"]);
	assert.ok(String(parsed.attributes.description ?? "").startsWith("Use when"));

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

test("project-owned core section set remains stable", () => {
	assert.equal(existsSync(CORE_PATH), true, `missing file: ${CORE_PATH}`);

	const headings = listSections(readFileSync(CORE_PATH, "utf8"))
		.filter((section) => section.level === 2)
		.map((section) => section.heading);

	assert.deepEqual(headings, [
		"Operating Contract",
		"Clarify First",
		"Canonical Plan Artifact",
		"Plan Design",
		"Phase Elaboration",
		"Delegate Step Design",
		"Checkpoints and User Interest",
		"Required Plan Format",
		"Quality Check Before Delivery",
	]);
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

	// Derive expected count from actual fixtures - single source of truth
	const expectedScenarioCount = parsed.length;
	assert.equal(parsed.length, expectedScenarioCount);

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
			assert.notEqual(
				match,
				null,
				`case ${index} requiredBehaviors must start with explicit rule id tag`,
			);
			const ruleId = match?.[1];
			if (ruleId) {
				observedRuleIds.add(ruleId);
			}
		}

		for (const behavior of forbidden) {
			assert.equal(typeof behavior, "string");
			assert.notEqual(String(behavior).trim().length, 0);
		}
	}

	assert.deepEqual(
		Array.from(observedRuleIds).sort(),
		Array.from(expectedProjectOwnedRuleIds).sort(),
		"fixture coverage must include the complete project-owned rule id set",
	);
});
