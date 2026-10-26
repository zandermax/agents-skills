import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildSkills } from "../../../src/build-skills.js";
import { parseFrontmatter } from "../../../src/lib/skills/frontmatter.js";
import { parseSkillManifest } from "../../../src/lib/skills/manifests.js";
import { listSections } from "../../../src/lib/skills/markdown-sections.js";

const REPO_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../..",
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
	"skills",
	"plan-it-out",
	"SKILL.md",
);
const OUTPUT_PATH = path.join(
	REPO_ROOT,
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

export {
	assert,
	BEHAVIORAL_FIXTURES_PATH,
	buildSkills,
	CONTENT_PATH,
	EVAL_TASKS_DIR,
	existsSync,
	expectedH2Order,
	expectedProjectOwnedRuleIds,
	fileURLToPath,
	forbiddenPhrases,
	listSections,
	MANIFEST_PATH,
	OUTPUT_PATH,
	PLAN_IT_OUT_PATH,
	parseFrontmatter,
	parseSkillManifest,
	path,
	REPO_ROOT,
	readdirSync,
	readFileSync,
	requiredPhrases,
	SOURCE_DIR,
	test,
};
