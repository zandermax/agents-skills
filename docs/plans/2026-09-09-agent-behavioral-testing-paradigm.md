---
status: ready
mode: autopilot
canonical_location: docs/plans/2026-09-09-agent-behavioral-testing-paradigm.md
last_updated: 2026-09-09
current_phase: "Phase 1: Eval Framework Design & Infrastructure"
current_step: not started
next_action: "Design and implement the eval runner (discovery, CLI invocation, matcher assertions) plus its own fixture-based unit tests"
blockers: none
---

# Agent Behavioral Testing Paradigm (Starting with Memory)

## Plan Metadata

- Status: ready
- Mode: autopilot
- Delegation: single agent — phases are sequential and mutually dependent (design the runner, then exercise it live against one real skill, then document the convention for all skills/agents); the effort lives in one repository with no independent parallel domains, so subagent parallelism would not help. No single-agent-exception subagent fallback is needed.
- Canonical location: docs/plans/2026-09-09-agent-behavioral-testing-paradigm.md
- Last updated: 2026-09-09
- Goal: Establish a reusable paradigm — usable for every skill and agent, not just memory — for testing actual agent *output*, beyond static frontmatter/structure checks: verifying that a live agent run (a) accesses/loads the relevant skill or memory, and (b) produces output that adheres to (or explicitly pushes back on) the skill's stated rules. Prove the paradigm end-to-end starting with the `node-testing-notes` memory topic, then document it as the standard for all future skills/agents.
- Success criteria:
  - A reusable eval runner exists in `agents-skills` that can spawn a headless agent CLI (Copilot CLI or Claude Code CLI) for a given prompt, capture structured output, and assert (1) the target skill/memory file was read/loaded and (2) the response text satisfies required/forbidden content matchers.
  - The runner has its own fast, deterministic, offline unit tests (using fixture transcripts, not live API calls) that pass under `npm test`.
  - `node-testing-notes` has at least one live behavioral eval scenario (`evals.json`) wired through the runner, proven to pass against a real headless agent invocation, with transcript evidence captured in this plan.
  - A documented convention exists (file/location/schema) so any future skill or agent can add the same two-gate behavioral eval, and `npm run check` remains green throughout.
- Constraints and assumptions:
  - Never perform git actions beyond read-only inspection; never stage, commit, or push.
  - Do not make the live-CLI eval part of the default `npm test`/`check:*` scripts — those must stay fast, deterministic, and offline. The live eval is an explicit opt-in script (`npm run eval:memory` or similar), gated on CLI availability.
  - Assume both `copilot` (GitHub Copilot CLI) and `claude` (Claude Code CLI) may be present on a given machine; the runner must support at least one and skip/report clearly (not fail the deterministic suite) when neither is available.
  - Each phase's go/no-go gate is: the relevant test command (`npm test` for deterministic phases, the opt-in eval command for the live phase) must pass before the next phase begins, per explicit instruction.

## Current State

- Current phase: Phase 1: Eval Framework Design & Infrastructure
- Current step: not started
- Next action: Design and implement the eval runner (discovery, CLI invocation, matcher assertions) plus its own fixture-based unit tests
- Blockers: none

## Decisions

- 2026-09-09: Live-CLI evals are opt-in (separate script), not part of `npm test`/`npm run check`, to keep the default suite deterministic, offline, and fast. Rationale: matches existing repo convention (`test/*.test.ts` is fully offline today) and avoids flaking CI/local checks on network or CLI availability.
- 2026-09-09: Single-agent delegation for this plan's own execution — the three phases are strictly sequential (infrastructure before pilot before documentation) with no independent domains to parallelize.
- 2026-09-09: The eval scenario schema (`evals.json`) lives beside each skill/memory's existing `test/` directory (already established for memory topics in `test/memory-skills.test.ts`), keeping one location per topic for both static and behavioral tests.

## Deferred Items

- Extending the paradigm to non-memory skills/agents in `agents-skills` (e.g. `executable-planning`, `code-walk`) beyond documenting the convention — deferred to future work once the pilot proves the runner design; trigger: after this plan's Phase 3 documentation lands and a new skill/agent is authored or revised.
- CI wiring for the opt-in live eval (e.g. a separate scheduled workflow) — deferred; trigger: once API/token budget and secrets handling for CI are decided.

## Phase 1: Eval Framework Design & Infrastructure

### Tangible output

A reusable eval runner module/script in `agents-skills` (e.g. `src/lib/agent-evals.ts` + a CLI entry such as `scripts/run-agent-evals.ts`) that:

- Accepts a target directory (a skill or memory topic's `test/` folder) and discovers `evals.json` scenario files there.
- For each scenario (`prompt`, `expectedMemoryOrSkill`, `requiredOutput[]`, `forbiddenOutput[]`, optional `judgeRubric`), spawns a headless agent CLI (`copilot -p "<prompt>" --output-format json --allow-all-tools` or `claude -p "<prompt>" --output-format json --dangerously-skip-permissions`, whichever is available) scoped to a throwaway/sandboxed working directory.
- Parses the CLI's JSON/JSONL output to extract (a) the list of files read/tools invoked and (b) the final response text.
- Asserts Gate 1 (memory/skill access): the expected skill or memory file path appears among files read/loaded.
- Asserts Gate 2 (behavioral adherence): the response text contains all `requiredOutput` matches and none of the `forbiddenOutput` matches (regex or substring).
- Reports a clear pass/fail per scenario, and a clear "skipped — no supported CLI available" outcome when neither `copilot` nor `claude` is on `PATH`, without failing the deterministic suite.

### Completion criteria

- The runner's discovery, CLI-selection, transcript-parsing, and matcher logic have dedicated unit tests using canned fixture transcripts (no live network/API calls), covering: pass case, Gate 1 failure (memory not accessed), Gate 2 failure (forbidden pattern present / required pattern absent), and the "no CLI available" skip path.
- These new unit tests live under `agents-skills/test/` following existing naming (`agent-evals.test.ts` or similar) and run as part of `npm test`.
- `npm run check` in `agents-skills` passes with the new module/tests included.

### Dependencies and risks

- Depends on: existing `test/memory-skills.test.ts` conventions (memory directory resolution, per-topic `test/` folders) — reuse `resolveMemoryDir` or extract a shared helper if it makes sense, but only if it doesn't destabilize existing passing tests.
- Risk: the exact CLI JSON schema for tool/file-access traces may differ between `copilot` and `claude`, or change across versions. Mitigation: keep the transcript-parsing logic isolated behind a small adapter interface per CLI, unit-tested against fixture JSON captured from a real run in Phase 2, so schema drift is caught by tests rather than assumed.
- Risk: sandboxing a headless agent run so it cannot make unintended repo edits. Mitigation: invoke the CLI with a working directory scoped to a temporary folder containing only the files needed for the scenario (the memory/skill file plus a minimal fixture), not the real repos.

### Steps

*Not yet elaborated. Populate immediately before this phase starts.*

### Validation

Run `npm test` and `npm run check` in `agents-skills`; both must exit zero. All new fixture-based tests must be deterministic (no network calls) and pass consistently.

### Checkpoint

Autopilot go/no-go: proceed to Phase 2 only once `npm run check` passes with the new runner and its unit tests included. If it does not pass, stop and fix before continuing; do not begin Phase 2 with a red suite.

## Phase 2: Prove the Paradigm Live on `node-testing-notes`

### Tangible output

- `~/.memory/node-testing-notes/test/evals.json` containing at least one live behavioral scenario, e.g.:
  - `prompt`: "Write a Node test verifying that `authService.login` was called with username `'admin'`."
  - `expectedMemoryOrSkill`: `node-testing-notes`
  - `forbiddenOutput`: patterns like `toHaveBeenCalledWith`, `mock.calls`, `toBeCalledWith`.
  - `requiredOutput`: patterns indicating a suggested alternative (asserting on outcome/state, `node:assert`).
- A live, real (non-fixture) run of the Phase 1 runner against this scenario, using whichever headless CLI is available on this machine, with the captured transcript (or a redacted excerpt) recorded in this plan's Progress Log as evidence.
- If the transcript reveals the CLI's JSON schema differs from Phase 1's assumptions, the adapter and its Phase 1 fixture tests are updated to match reality (schema drift caught and fixed here, per the Phase 1 risk mitigation).

### Completion criteria

- The opt-in eval command (e.g. `npm run eval:memory`) executes the `node-testing-notes` scenario against a real CLI and reports PASS on both Gate 1 (memory access) and Gate 2 (behavioral adherence).
- If a supported CLI is unavailable in the current environment, the command must clearly report "skipped — no supported CLI available" rather than a false pass or an unhandled crash, and this outcome is recorded honestly in the plan rather than claimed as a pass.
- The deterministic `npm test`/`npm run check` suite from Phase 1 still passes unchanged.

### Dependencies and risks

- Depends on: Phase 1's runner and adapters.
- Risk: headless CLI invocation may still prompt for permissions or network access depending on machine configuration. Mitigation: use the CLIs' documented non-interactive flags (`--allow-all-tools`/`--dangerously-skip-permissions`) and fail fast with a clear message if a prompt is still triggered, rather than hanging.
- Risk: LLM output is non-deterministic; a single live pass does not guarantee future stability. Mitigation: keep matchers permissive (multiple acceptable phrasings) and document this as an inherent limitation of live evals in Phase 3's documentation, not something this plan needs to fully solve.

### Steps

*Not yet elaborated. Populate immediately before this phase starts.*

### Validation

Run the opt-in eval command and capture its output; run `npm test`/`npm run check` to confirm no regression to the deterministic suite.

### Checkpoint

Autopilot go/no-go: proceed to Phase 3 only once the live scenario reports PASS (or an honest, clearly-labeled skip when no CLI is available) and the deterministic suite still passes. If the live scenario fails outright (not skipped), stop and fix the runner or scenario before continuing.

## Phase 3: Document the Paradigm for All Skills and Agents

### Tangible output

- A documentation update (e.g. a new `docs/specs/behavioral-testing-paradigm.md`, or a dedicated section added to an existing authoring reference such as `skill-forge`'s `SKILL.md` or the repository `README.md`) describing, for any skill or agent in this repo:
  1. The two-tier test model: static/structural tests (frontmatter, required sections — already established) plus behavioral eval scenarios (`evals.json` beside the topic's `test/` folder).
  2. The `evals.json` schema (`prompt`, `expectedMemoryOrSkill`, `requiredOutput`, `forbiddenOutput`, optional `judgeRubric`) and the two gates it verifies (access + adherence).
  3. How to run the opt-in live eval command and interpret PASS/FAIL/SKIP.
  4. The explicit boundary: live evals are not part of `npm run check`; they are run deliberately, on demand.
- `node-testing-notes` stands as the worked example referenced from the documentation.

### Completion criteria

- Documentation is added and internally consistent with the actual runner behavior implemented in Phase 1–2.
- `npm run check` passes (including any README marker requirements already enforced by `test/documentation.test.ts`, updated only if this plan intentionally extends those required markers).

### Dependencies and risks

- Depends on: Phases 1–2 being complete and validated.
- Risk: `test/documentation.test.ts` enforces specific required markers in `README.md`; if documentation is added there, verify the existing required-marker tests still pass rather than assuming.

### Steps

*Not yet elaborated. Populate immediately before this phase starts.*

### Validation

Run `npm run check`; confirm it passes with the documentation changes included.

### Checkpoint

Autopilot go/no-go: this is the final phase. Mark the plan `completed` only once `npm run check` passes with all three phases' changes present.

## Progress Log

- 2026-09-09: Plan created in autopilot mode, repo-backed storage, single-agent delegation. Not yet started.
