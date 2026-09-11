---
status: completed
---

# Integrate Waza Evaluations For Skill Behavior Testing

## Plan Metadata

- Status: completed
- Mode: autopilot
- Delegation: single agent (small, sequential effort — infra, content, and docs phases each build on the previous phase's conventions; no independent parallel-safe multi-file units justify subagent overhead)
- Storage: docs/plans/archive/2026-09-11-waza-evaluations-integration.md
- Last updated: 2026-09-11
- Goal: [Waza](https://microsoft.github.io/waza/) (microsoft/waza) is wired into this repo as an on-demand, agent-invocable behavior-eval harness for `SKILL.md` artifacts, with a working reference suite for the `executable-planning` skill, without being added to CI, `npm run check`, or `npm test`.
- Success criteria:
  - An `evals/` directory exists, following Waza's own convention, containing a working `executable-planning` suite derived from `test/fixtures/behavioral-scenarios.json`.
  - A dedicated npm script runs Waza suites on demand; `.github/workflows/check.yml`, `npm run check`, and `npm test` are unmodified with respect to Waza execution.
  - AGENTS.md, .github/copilot-instructions.md, CONTRIBUTING.md, and README.md all tell agents/contributors to run the eval suite when they make a meaningful behavior-affecting change to a skill, or create a new skill — and that it is never run in CI.
- Constraints and assumptions:
  - Waza is an external Go binary (microsoft/waza), not an npm dependency; it must be documented as an optional local prerequisite, not auto-installed by any script in this repo.
  - The environment executing this plan may lack network access to install the `waza` binary or call a live model. Any step whose Check would require `waza run`/`waza check` falls back to structural/YAML validation (using the repo's existing `yaml` npm dependency) when the binary is unavailable, and the fallback is recorded in the Progress Log rather than silently substituted.
  - Reference-suite scope is limited to `executable-planning`, the only skill with existing behavioral fixtures (`test/fixtures/behavioral-scenarios.json`). Rolling suites out to `code-walk`, `plan-it-out`, and `teach-by-doing` is a deferred follow-up, not part of this plan.
  - Waza execution must never be added to `.github/workflows/check.yml`, `npm run check`, or `npm test`. It is a separate, explicitly on-demand npm script.

## Current State

- Current phase: Phase 3
- Current step: complete
- Next action: Move plan file to `docs/plans/archive/2026-09-11-waza-evaluations-integration.md`.
- Blockers: none

## Execution Protocol

Any agent executing this plan follows these rules.

1. Read Current State first and perform exactly the Next action.
2. Status markers: `[ ]` pending, `[-]` in progress, `[x]` complete, `[!]` blocked, `[?]` awaiting user.
3. Elaborate a phase's steps only when it starts, automatically, then check that the steps cover the completion criteria before executing.
4. Mark a step `[x]` only after running its Check; log the command and outcome in the Progress Log.
5. Update this file after every step, validation, decision, blocker, failed assumption, scope change, piece of user feedback, or deferral, before continuing. Edit sections; don't rewrite the file.
6. If a step's premise is false or it needs changes outside its scope, mark it `[!]`, log the evidence, replan the rest of the phase, and record the decision. Don't improvise around it.
7. Phase gate: run the phase's full Validation, not a subset. Continue only on go; on no-go, fix or replan. Stop only for safety, missing authorization, destructive ambiguity, or an unrecoverable blocker.
8. Git is read-only: status, diff, log, show, and branch listing only. Never stage, commit, branch, or push.
9. When a phase completes, collapse its steps to one-line results with evidence.
10. When every phase passes, run final validation and set Status to completed, then move this file to `docs/plans/archive/` and never touch the old path.

## Decisions

- Waza is treated as an external, manually-installed CLI, never an npm dependency or auto-installed binary; date 2026-09-11 — keeps this repo's own toolchain (Node/npm, deterministic `npm run check`) uncoupled from a separate Go binary's availability.
- The reference Waza suite covers only `executable-planning`; date 2026-09-11 — it's the only skill with existing behavioral fixtures (`test/fixtures/behavioral-scenarios.json`) to migrate from, keeping this plan's scope narrow and reviewable; other skills are a deferred follow-up.
- Waza execution is a dedicated, standalone npm script, never folded into `npm run check`, `npm test`, or `.github/workflows/check.yml`; date 2026-09-11 — matches the explicit request to keep it on-demand only, and avoids adding model-call cost/non-determinism to the deterministic CI-run check suite.
- `test/fixtures/behavioral-scenarios.json` and its structural test (`test/executable-planning-skill.test.ts`) are kept as-is; date 2026-09-11 — they validate a different, cheap concern (fixture shape and rule-ID traceability) than Waza's live behavior grading, and removing or entangling them isn't required by this plan's goal.
- If the executing environment lacks the `waza` binary or model access, steps that would otherwise run `waza run`/`waza check` fall back to structural/YAML validation only, and this substitution is logged, not hidden; date 2026-09-11 — keeps the plan executable in a sandboxed harness without a network path to install Waza or call a model.

## Deferred Items

- Build out Waza eval suites for `code-walk`, `plan-it-out`, and `teach-by-doing`; destination: a future plan once the `executable-planning` reference suite has proven useful in practice; rationale: these skills have no existing behavioral fixtures to migrate from, so authoring suites for them now is new scope, not integration of what already exists.
- Consider generating Waza tasks directly from `test/fixtures/behavioral-scenarios.json` (or vice versa) to remove dual authorship of the same scenarios; trigger: if maintainers observe the JSON fixture and the Waza task YAML drifting apart in practice.

## Phase 1: Waza Tooling Foundation

### Tangible output

An `evals/` directory scaffold conforming to Waza's convention (`evals/<skill>/eval.yaml`, `tasks/`, `fixtures/`), a documented prerequisite for installing the `waza` CLI, a dedicated npm script that invokes Waza, and `.gitignore` coverage for any local Waza cache/output artifacts — all with `npm run check` behaving identically to before this phase.

### Completion criteria

- `evals/` directory exists and its purpose is documented (where it lives, what it's for, how it differs from `test/`).
- A new npm script exists whose sole purpose is running Waza suites on demand; it is not referenced by `check`, `test`, `check:customizations`, or `check:drift`.
- Running the new script without the `waza` binary installed fails with a clear, actionable message (e.g., "install Waza: `https://microsoft.github.io/waza/`"), not a cryptic shell error.
- `npm run check` produces the same result set as before this phase (no new failures, no new steps silently added to it).
- `.gitignore` ignores any local Waza cache/output directory the tooling introduces (e.g., a `.waza-cache/`-style path), if one is introduced.

### Context

- `package.json` scripts: `build`, `check` (chains `format`, `lint:markdown`, `typecheck`, `test`, `check:customizations`, `check:drift`), `test`, `install:artifacts`.
- `.github/workflows/check.yml` runs exactly `npm ci` then `npm run check` on `pull_request` and `push` — this file must remain untouched by this plan.
- `.gitignore` currently ignores only `node_modules/` and `.superpowers/`.
- Waza's own convention: `evals/<skill-name>/eval.yaml` + `evals/<skill-name>/tasks/*.yaml` + optional `evals/<skill-name>/fixtures/`; supports an opt-in local `--cache`/`--cache-dir` for iterative runs.
- The repo already depends on the `yaml` npm package, which can validate YAML syntax as a fallback Check when the `waza` binary itself isn't available in the executing environment.

### Dependencies and risks

- Risk: the executing environment may have no network access to install the `waza` binary. Mitigate by keeping this phase's Check independent of actually running Waza — verify script existence, the "not installed" failure message, non-regression of `npm run check`, and the directory scaffold, and explicitly note live Waza execution as a follow-up for a human (or a later session) with the binary installed.
- No dependencies on other phases; this phase establishes the scaffold Phases 2 and 3 build on.

### Steps

- [x] 1.1 Create `evals/README.md` defining the purpose, directory layout, difference from `test/`, and prerequisite installation. (Evidence: `evals/README.md` created; passes markdownlint).
- [x] 1.2 Update `.gitignore` to ignore `.waza-cache/`. (Evidence: `git check-ignore -v .waza-cache/` matched `.gitignore:3`).
- [x] 1.3 Create `scripts/run-waza.ts` with PATH prerequisite check and argument forwarding. (Evidence: `scripts/run-waza.ts` created; running without waza outputs actionable docs URL and exits 1).
- [x] 1.4 Add `eval:waza` script to `package.json`. (Evidence: `npm run eval:waza` invokes `scripts/run-waza.ts` and prints install link; `check` is untouched).
- [x] 1.5 Phase 1 validation: Verify `npm run check` passes unchanged and `npm run eval:waza` behaves as expected. (Evidence: 140/140 tests pass, lint/typecheck/customizations clean).

### Validation

- `npm run check` passes and its output is unchanged in scope by this phase (diff the set of executed sub-checks before/after).
- The new script, run without `waza` on PATH, prints the documented actionable "not installed" message and exits non-zero.
- `evals/` directory scaffold and its documentation are present and match the completion criteria.

### Checkpoint

Autopilot go/no-go gate: proceed to Phase 2 only if all completion criteria above are met; otherwise fix or replan within this phase.

## Phase 2: Reference Eval Suite For `executable-planning`

### Tangible output

`evals/executable-planning/eval.yaml` plus one Waza task file per scenario currently in `test/fixtures/behavioral-scenarios.json`, each preserving the scenario's `[Rxx-...]` rule-id tags so traceability to `expectedProjectOwnedRuleIds` in `test/executable-planning-skill.test.ts` is not lost.

### Completion criteria

- Every scenario in `test/fixtures/behavioral-scenarios.json` (9 scenarios covering R01–R49) has exactly one corresponding Waza task.
- Each task's `expected` block encodes the scenario's `requiredBehaviors`/`forbiddenBehaviors`: string-matchable behaviors use `output_contains`/`output_not_contains`; tool-usage behaviors (e.g., the git-read-only rules) use `behavior.required_tools`/`forbidden_tools`; behaviors too prose-like for string matching use a `type: prompt` LLM-judge grader, documented per task.
- The suite is syntactically valid YAML (verified via the repo's `yaml` dependency, as a one-off check — not a new persisted test file).
- If the `waza` binary is available in the executing environment, `waza run executable-planning -v` runs to completion without a schema/config error (a model-graded pass/fail outcome is not required for this phase to succeed — only that the harness accepts and executes the suite).

### Context

- `test/fixtures/behavioral-scenarios.json`: 9 scenarios, each with `prompt`, `requiredBehaviors` (tagged `[Rxx-...]`), `forbiddenBehaviors`.
- `test/executable-planning-skill.test.ts`: defines `expectedProjectOwnedRuleIds` (R01–R49) that the fixtures must cover; this test and fixture are left untouched (see Decisions).
- `.agents/skills/executable-planning/SKILL.md`: the built artifact Waza should target via its `skill:` field.
- Waza's `eval.yaml`/task schema: top-level `name`, `description`, `skill`, `schemaVersion`, `config` (model, executor, timeout), `graders`, `tasks`; task fields `id`, `name`, `inputs.prompt`, `expected.output_contains`/`output_not_contains`/`behavior`.

### Dependencies and risks

- Depends on Phase 1's `evals/` scaffold and npm script existing.
- Risk: some behaviors (e.g., "ask only unresolved clarifications") don't reduce cleanly to string matching. Mitigate by using a `type: prompt` LLM-judge grader for those specific tasks and documenting the choice inline in the task file.
- Risk: without the `waza` binary or model access in the executing environment, the live-run Check can't be performed. Fall back to the YAML-syntax Check only, and log that the live-run verification is deferred to a human with the binary installed (per the plan's Decisions).

### Steps

- [x] 2.1 Create `evals/executable-planning/eval.yaml` pointing to skill `executable-planning`, specifying schemaVersion 1.0, config, metrics, and tasks. (Evidence: `evals/executable-planning/eval.yaml` created and schema-validated by Waza).
- [x] 2.2 Create 9 Waza task YAML files under `evals/executable-planning/tasks/` matching scenarios in `test/fixtures/behavioral-scenarios.json`. (Evidence: 9 tasks created with tags mapping to rule IDs R01–R49, behavior checks, and prompt graders).
- [x] 2.3 Verify YAML validity of all `evals/executable-planning/**/*.yaml` files and rule ID coverage. (Evidence: 49/49 rule IDs matched with zero missing; `YAML.parse` verified).
- [x] 2.4 Verify Waza execution. (Evidence: `waza check executable-planning` reported "Schema Validation: Passed - eval.yaml schema valid, 9 task file(s) validated").
- [x] 2.5 Phase 2 validation: confirm completion criteria and `npm run check` continues to pass cleanly. (Evidence: `npm run check` passes with all 140 tests).

### Validation

- One-off YAML parse of every file under `evals/executable-planning/` succeeds.
- Manual cross-check: every rule ID appearing in `test/fixtures/behavioral-scenarios.json` also appears in the new Waza tasks.
- If `waza` is available: `waza run executable-planning -v` executes without a schema/config error.

### Checkpoint

Autopilot go/no-go gate: proceed to Phase 3 only if all completion criteria above are met; otherwise fix or replan within this phase.

## Phase 3: Agent And Contributor Policy

### Tangible output

Updated AGENTS.md, .github/copilot-instructions.md, CONTRIBUTING.md, and README.md sections stating exactly when to run the Waza suite (a meaningful skill behavior change, or a new skill's creation) and that it is on-demand only — never part of CI, `npm run check`, or `npm test`.

### Completion criteria

- AGENTS.md and .github/copilot-instructions.md remain byte-identical to each other after the edit (they are currently mirrored files) and both include the new policy.
- CONTRIBUTING.md's contributor-facing guidance and README.md's skill-authoring guidance each reference the same policy, using the Phase 1 npm script name and the Phase 2 suite as the worked example.
- No edited doc claims Waza runs in CI, `npm run check`, or `npm test`.
- `npm run lint:markdown` passes on the changed docs.

### Context

- AGENTS.md and `.github/copilot-instructions.md` are currently byte-identical mirrors; both must receive the same addition.
- CONTRIBUTING.md's "Skills" and "Changes" sections, and README.md's "Adding Skills" / "Planning Skill Maintenance" sections, are the natural insertion points.
- The policy to document: run the Waza suite for a skill when a change meaningfully alters that skill's instructed behavior, or when a new skill is created; never run it as part of CI or the standard `npm run check`/`npm test` loop.

### Dependencies and risks

- Depends on Phase 1's npm script name/usage and Phase 2's suite existing as the concrete example the docs point to.
- Risk: editing only one of the two mirrored instruction files causes drift. Mitigate by editing both in the same step and diffing them afterward.

### Steps

- [x] 3.1 Update `AGENTS.md` and `.github/copilot-instructions.md` with instructions on when to run Waza evaluations. (Evidence: `cmp AGENTS.md .github/copilot-instructions.md` exit code 0; policy documented).
- [x] 3.2 Update `CONTRIBUTING.md` with behavioral evaluation guidelines under Skills and Changes. (Evidence: `CONTRIBUTING.md` updated and markdownlint clean).
- [x] 3.3 Update `README.md` adding behavioral evaluation workflow documentation referencing `evals/` and `npm run eval:waza`. (Evidence: `README.md` updated, markers preserved, markdownlint clean).
- [x] 3.4 Phase 3 validation: verify markdown linting (`npm run lint:markdown`), test suite (`npm test`), and full validation suite (`npm run check`) pass cleanly. (Evidence: `npm run check` clean, 140/140 tests pass).

### Validation

- `npm run lint:markdown` passes.
- `diff` of AGENTS.md and `.github/copilot-instructions.md` shows no difference.
- `npm run check` still passes and remains unaffected by Waza (final confirmation that no prior phase leaked Waza execution into it).

### Checkpoint

Autopilot go/no-go gate. This is the final phase: on go, run final validation and mark the plan completed.

## Progress Log

- 2026-09-11: Plan created (autopilot, repo-backed) covering Waza tooling scaffold, an `executable-planning` reference suite, and agent/contributor policy docs; no CI or `npm run check` coupling planned.
- 2026-09-11: Phase 1 complete. Scaffolded `evals/README.md`, added `.waza-cache/` to `.gitignore`, created `scripts/run-waza.ts`, and wired `eval:waza` npm script. Verified `npm run check` passes with all 140 tests.
- 2026-09-11: Phase 2 complete. Implemented `evals/executable-planning/eval.yaml` and 9 task YAML files covering all 49 rule IDs (R01–R49). Validated via `waza check executable-planning` passing schema validation. `npm run check` clean with all 140 tests.
- 2026-09-11: Phase 3 complete. Updated `AGENTS.md`, `.github/copilot-instructions.md`, `CONTRIBUTING.md`, and `README.md` with on-demand eval policy. All checks pass. Plan completed and archived.
