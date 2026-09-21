---
status: completed
mode: autopilot
canonical_location: docs/plans/2026-09-21-skill-agent-auditor-eval-gap-remediation.md
last_updated: 2026-09-21
current_phase: Phase 4
current_step: completed
next_action: none
blockers: none
---

# Skill-Agent Auditor Evaluation-Gap Remediation Plan

## Plan Metadata

- Status: in-progress
- Mode: autopilot (user approved the scope and requested implementation without interactive pauses)
- Delegation: none; steps are executed directly.
- Canonical location: docs/plans/2026-09-21-skill-agent-auditor-eval-gap-remediation.md
- Last updated: 2026-09-21
- Goal: Fix the skill-agent-auditor's failing high-risk coverage classification, close the identified behavioral-coverage gaps with maintained Waza tasks, and reduce grader variance.
- Success criteria:
  - Task `03-high-risk-coverage-gap` passes (missing coverage classified as at least `important` for high-risk targets).
  - Three new maintained tasks exist and pass: target-resolution failure, unavailable validation command, explicit pair-only scope.
  - `trials_per_task` is 2 in evals/skill-agent-auditor/eval.yaml.
  - Full Waza suite passes with aggregate score >= 0.8.
  - `npm run check` passes (tests, customization validation, drift check).
- Constraints and assumptions:
  - Minimal edits to the skill source; prefer restructuring existing instructions over appending (per minimal-changes-notes).
  - All existing required phrases, forbidden-phrase constraints, and test-asserted strings in test/skill-agent-auditor-skill.test.ts must remain satisfied.
  - Git usage is read-only (status/log inspection only); no stage, commit, branch, or push.
  - The generated `.agents/skills/skill-agent-auditor/SKILL.md` is refreshed via `npm run build`, never hand-edited.

## Current State

- Current phase: Phase 4 (complete)
- Current step: completed
- Next action: none
- Blockers: none
- Evidence: final Waza run 7/7 passed, aggregate 1.00 (EXIT:0); npm run check 218/218 tests pass, customizations and drift clean. Additional hardening beyond the original plan: low-risk over-escalation guard, mandatory name/folder comparison in the report contract, required relationship-subsection format, and verdict-line evidence labeling — added to fix flaky tasks 01/02/04 observed across runs 2-6.

## Decisions

- Promote the high-risk coverage rule to a standalone labeled sentence while preserving the low-risk inline-artifact exception verbatim; 2026-09-21.
- Add three new Waza tasks (05 target resolution, 06 unavailable validation, 07 explicit pair-only) rather than expanding existing tasks; 2026-09-21.
- Set `trials_per_task` to 2 as the variance/cost tradeoff; 2026-09-21.
- Evidence baseline: 2026-09-21 audit report (3/4 Waza tasks passed; 03 failed with severity misclassification; aggregate 0.75 < 0.8).

## Phase 1: Clarify the Severity Rule

### Tangible output

Updated `sources/skill-agent-auditor/skill-agent-auditor.md` with a prominent high-risk coverage severity rule; regenerated skill artifact.

### Completion criteria

- The high-risk/complex rule is standalone and prominent; the low-risk exception is preserved as a separate, explicitly subordinate rule.
- All strings asserted in test/skill-agent-auditor-skill.test.ts and skill.json requiredPhrases remain present.

### Steps

- [x] 1.1 Edit the third paragraph of "Rubric and Coverage" in sources/skill-agent-auditor/skill-agent-auditor.md to make the coverage severity rule standalone and bolded, keeping required phrases intact. Check: the file still contains "high-risk or complex target", "`blocking`, `important`, and `advisory`", and "return `ready` when it has a clear trigger, input, output, and safety boundary".
- [x] 1.2 Regenerate artifacts. Check: `npm run build` succeeds and `.agents/skills/skill-agent-auditor/SKILL.md` contains the new rule text.
- [x] 1.3 Validate. Check: `npm run check` passes.

### Validation

- npm run build; npm run check.

## Phase 2: Add Focused Behavioral Coverage

### Tangible output

Three new task files under evals/skill-agent-auditor/tasks/.

### Completion criteria

- 05-target-resolution.yaml: named target absent/ambiguous -> report condition and stop, no invented repository facts.
- 06-unavailable-validation.yaml: unavailable validation command -> reported as `unverified`, no fabricated pass claim.
- 07-explicit-pair-scope.yaml: explicit pair audit covers only the named relationship.

### Steps

- [x] 2.1 Create 05-target-resolution.yaml. Check: file parses as YAML, has id/name/description/inputs/graders, and grader asserts stop behavior plus absence of invented facts.
- [x] 2.2 Create 06-unavailable-validation.yaml. Check: grader asserts the `unverified` label and no fabricated command success.
- [x] 2.3 Create 07-explicit-pair-scope.yaml. Check: grader asserts only the named relationship is audited and no subsection for the unrelated skill exists.

### Validation

- Files match the existing task-file schema; picked up by the `tasks/*.yaml` glob.

## Phase 3: Evaluation Configuration

### Tangible output

evals/skill-agent-auditor/eval.yaml with trials_per_task: 2.

### Steps

- [x] 3.1 Set trials_per_task to 2. Check: eval.yaml shows `trials_per_task: 2`.

### Validation

- Diff shows only the trial-count change.

## Phase 4: Behavioral and Repository Verification

### Tangible output

Passing Waza suite and green repository checks.

### Steps

- [x] 4.1 Run `npm run eval:waza -- run skill-agent-auditor -v`. Check: all 7 tasks pass; aggregate score >= 0.8. Result: 7/7 passed, aggregate 1.00.
- [x] 4.2 Run `npm run check`. Check: format, lint, typecheck, 218+ tests, customization check, and drift check pass. Result: 218/218 pass, drift clean.
- [x] 4.3 Review final diff scope with `git status`. Check: only the skill source, generated artifact, eval tasks, eval config, and this plan changed.

### Validation

- Full Waza suite output; npm run check output; git status.

## Risks

- Rewording may break an asserted phrase in test/skill-agent-auditor-skill.test.ts; mitigate by re-checking required strings immediately after the edit.
- Behavioral flakiness may persist at 2 trials; if a non-03 task fails once, rerun before changing the skill text again.
