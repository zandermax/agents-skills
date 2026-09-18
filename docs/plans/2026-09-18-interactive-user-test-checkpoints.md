---
status: completed
mode: autopilot
canonical_location: docs/plans/archive/2026-09-18-interactive-user-test-checkpoints.md
last_updated: 2026-09-18
current_phase: completed
current_step: completed
next_action: none
blockers: none
---

# Interactive User-Test Checkpoints Implementation Plan

> **For agentic workers:** REQUIRED SKILL: Use `plan-executor` to execute this
> plan phase-by-phase. The canonical plan owns execution state and evidence.

**Goal:** Interactive plans identify meaningful independent user tests, and
executors capture user-observed evidence before continuing beyond those phase
boundaries.

**Architecture:** Extend the manifest-built `executable-planning` source and
its Planner agent with a conditional checkpoint schema. Extend the direct Plan
Executor skill and agent to stop for the resulting observation, then cover the
new contract through focused structural and behavioral tests.

**Tech stack:** Markdown skill artifacts, TypeScript native test runner, Waza.

**Spec:** [docs/specs/2026-09-18-interactive-user-test-checkpoints.md](../specs/2026-09-18-interactive-user-test-checkpoints.md)

## Global Constraints

- Mode is autopilot; continue through phase gates without confirmation pauses.
- Keep git read-only; do not stage, commit, branch, or push.
- User Test prompts request a free-text observation and never supply an
  expected result.
- Only add User Tests where a testable boundary is independent of likely
  executor validation; record why unavailable otherwise.
- Do not change autopilot phase gates.

## Current State

- Current phase: completed
- Current step: completed
- Next action: none.
- Blockers: none

## Execution Protocol

1. Read Current State first and perform exactly the Next action.
2. Status markers: `[ ]` pending, `[-]` in progress, `[x]` complete, `[!]`
   blocked, `[?]` awaiting user.
3. Elaborate a phase only when the user requests it, confirm its steps before
   execution, and update this plan before every material event.
4. Run every step's Check and record its exact outcome before marking it `[x]`.
5. If a check fails or a premise is contradicted, mark the step `[!]`, record
   evidence, and stop for user direction.
6. At an interactive phase checkpoint, run the full Validation. When the
   checkpoint has a User Test, gather and record the user's free-text
   observation before offering continuation, revision, or pause. When User
   Test is unavailable, preserve the rationale and use normal confirmation.
7. Git is read-only: status, diff, log, show, and branch listing only. Never
   stage, commit, branch, or push.

## Decisions

- Use conditional User Tests rather than mandatory manual checks because
  internal-only phases may lack independent observable behavior; 2026-09-18.
- Prefer free-text observations over yes/no confirmations so acceptance can
  depend on evidence the executor cannot determine independently; 2026-09-18.
- Keep this plan in the repository's existing `docs/plans/` location; 2026-09-18.
- User requested autopilot execution after approving the bounded design; 2026-09-18.

## Deferred Items

- None.

## Phase 1: Planner Checkpoint Contract

### Tangible output

The generated executable-planning skill and Executable Planner agent describe
conditional, independent User Tests at interactive checkpoints.

### Completion criteria

- Interactive phase templates contain the User Test action, observation
  prompt, and independent-evidence-or-unavailable rationale.
- Guidance prefers end-to-end or visible behavior over repeating agent-run
  checks and prohibits suggested answers.
- Autopilot guidance remains non-blocking and automated.
- Focused skill tests and planner behavioral coverage pass.

### Context

- `sources/executable-planning/executable-planning.md` is the canonical
  manifest source; `npm run build` regenerates
  `.agents/skills/executable-planning/SKILL.md`.
- `.github/agents/executable-planner.agent.md` maps the Planner behavior to
  VS Code mechanisms.
- `test/executable-planning-skill.test.ts` validates generated static
  contract text and fixture traceability.
- `test/fixtures/behavioral-scenarios.json` and
  `evals/executable-planning/tasks/` provide planner behavioral pressure.

### Dependencies and risks

- Depends on the established phase checkpoint and execution-protocol wording.
- Risk: vague language may allow simple confirmation instead of user evidence.
- Recovery: tighten the static and behavioral assertions before proceeding to
  executor enforcement.

### Steps

- [x] P1.S1: Add failing contract assertions to
  `test/executable-planning-skill.test.ts` for the conditional interactive
  User Test schema, required free-text observation prompt, unavailable
  rationale, and no-autopilot-prompt rule. Add a new planner behavioral rule
  identifier and fixture/task that requires a UI or end-to-end User Test
  without suggesting an answer.
  - Files: `test/executable-planning-skill.test.ts`,
    `test/fixtures/behavioral-scenarios.json`,
    `evals/executable-planning/tasks/16-user-test-checkpoint.yaml`
  - Check: `npm test -- test/executable-planning-skill.test.ts`
  - Result: `npm test -- test/executable-planning-skill.test.ts` failed only
    at the new missing-`User Test` contract assertion.
  - Depends: none
- [x] P1.S2: Update `sources/executable-planning/executable-planning.md` and
  the checkpoint template to require a conditional, independent User Test for
  interactive phases, with an action, free-text observation prompt, and
  unavailable rationale. Preserve the automated autopilot gate. Regenerate
  `.agents/skills/executable-planning/SKILL.md` through the existing build.
  - Files: `sources/executable-planning/executable-planning.md`,
    `.agents/skills/executable-planning/SKILL.md`
  - Check: `npm run build && npm test -- test/executable-planning-skill.test.ts`
  - Result: `npm run build` and `npm test -- test/executable-planning-skill.test.ts` passed.
  - Depends: P1.S1
- [x] P1.S3: Update `.github/agents/executable-planner.agent.md` so the
  Question mechanism uses free-text responses for User Test observations and
  never pre-populates expected results. Add or extend assertions that cover
  the agent wording.
  - Files: `.github/agents/executable-planner.agent.md`,
    `test/executable-planning-skill.test.ts`
  - Check: `npm test -- test/executable-planning-skill.test.ts`
  - Result before implementation: the new Planner agent assertion failed
    because the Question mechanism did not mention User Test observations.
  - Result: `npm test -- test/executable-planning-skill.test.ts` passed with
    194 tests after updating the adapter and its byte-stable fixture.
  - Depends: P1.S2
- [x] P1.S4: Run the complete Phase 1 validation and record only each
  command's result on its owning step.
  - Files: no source changes
  - Check: `npm test -- test/executable-planning-skill.test.ts && npm run build && npm run check:drift && npm run eval:waza -- run executable-planning -v`
  - Result: focused planner tests, build, and drift check passed. Waza is
    unverified because its CLI is not installed on PATH.
  - Depends: P1.S3

### Validation

- `npm test -- test/executable-planning-skill.test.ts`
- `npm run build && npm run check:drift`
- `npm run eval:waza -- run executable-planning -v` when Waza is available.

### Checkpoint

- User Test: unavailable; this phase changes instruction artifacts with no
  independent end-user workflow beyond the executor's validation.
- Independent evidence: no separate user-observable boundary is available.
- Confirmation: record validation evidence and wait for the user to request
  Phase 2, revise, or pause.

## Phase 2: Executor User-Evidence Gate

### Tangible output

The Plan Executor skill and agent stop after mechanical phase validation to
collect, record, and assess User Test observations before phase continuation.

### Completion criteria

- The executor honors documented User Test checkpoints in interactive mode.
- It asks for open-ended observed results, records them in the canonical plan,
  and blocks or clarifies contradictory or insufficient evidence.
- It preserves the unavailable rationale fallback and does not change
  autopilot behavior.
- Focused Plan Executor tests and behavioral coverage pass.

### Context

- `.agents/skills/plan-executor/SKILL.md` is a direct skill artifact.
- `.github/agents/plan-executor.agent.md` maps Question mechanism to
  `vscode_askQuestions` and must direct free-text observation collection.
- `test/plan-executor-skill.test.ts` asserts skill and agent contract text.
- `evals/plan-executor/tasks/01-admission-gate.yaml` is the existing Waza
  suite entry point and can be extended with a phase-checkpoint task.

### Dependencies and risks

- Depends on Phase 1's checkpoint schema and terminology.
- Risk: the executor may accidentally treat an acknowledgement as evidence or
  continue before recording it.
- Recovery: add a behavior test that requires a free-text observed result and
  forbids continuation after mechanical validation alone.

### Steps

- [x] P2.S1: Add failing contract assertions for the Plan Executor skill and
  agent requiring an interactive User Test gate after mechanical validation:
  prompt for a free-text observation, record it as user-provided evidence,
  compare it with completion criteria, and block or clarify insufficient
  evidence before phase continuation. Add a Plan Executor behavioral task that
  forbids continuing after mechanical validation alone.
  - Files: `test/plan-executor-skill.test.ts`,
    `evals/plan-executor/tasks/02-user-test-checkpoint.yaml`
  - Check: `npm test -- test/plan-executor-skill.test.ts`
  - Expected before implementation: failure because the executor does not yet
    define the User Test evidence gate.
  - Result: `npm test -- test/plan-executor-skill.test.ts` failed only at the
    new missing-`User Test` executor assertion.
  - Depends: P1.S4
- [x] P2.S2: Update `.agents/skills/plan-executor/SKILL.md` and
  `.github/agents/plan-executor.agent.md` to enforce the documented User Test
  checkpoint in interactive mode, including the unavailable rationale
  fallback. Do not add a blocking user checkpoint to autopilot behavior.
  - Files: `.agents/skills/plan-executor/SKILL.md`,
    `.github/agents/plan-executor.agent.md`
  - Check: `npm test -- test/plan-executor-skill.test.ts`
  - Result: `npm test -- test/plan-executor-skill.test.ts` passed with 195 tests.
  - Depends: P2.S1
- [x] P2.S3: Run the complete Phase 2 and repository validation, recording
  each outcome on this step.
  - Files: no source changes
  - Check: `npm test -- test/plan-executor-skill.test.ts && npm run eval:waza -- run plan-executor -v && npm run check`
  - Result: `npm run check` passed with 195 tests. Waza is unverified because
    no executable is available on the active terminal PATH.
  - Depends: P2.S2

### Validation

- `npm test -- test/plan-executor-skill.test.ts`
- `npm run eval:waza -- run plan-executor -v` when Waza is available.
- `npm run check`

### Checkpoint

- User Test: unavailable; this phase changes execution instructions rather
  than a user-facing runtime.
- Independent evidence: the behavioral evaluation is executor-run and would
  duplicate the prescribed validation.
- Confirmation: record validation evidence and wait for the user to revise,
  pause, or mark the completed plan for handoff.

## Progress Log

- 2026-09-18: Plan created from the approved interactive-user-test-checkpoints spec.
- 2026-09-18: Phase 1 completed; planner tests, build, and drift check passed.
  Waza was unavailable because no executable was on PATH.
- 2026-09-18: Phase 2 completed; executor tests and full repository check passed.
  Waza was unavailable because no executable was on PATH.
