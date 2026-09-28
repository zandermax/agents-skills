---
status: ready
mode: interactive
storage: docs/plans/laya-tool-decision-shadow-eval.md
current_phase: "Phase 2: Pre-Tool Hook Shadow Instrumentation"
current_step: "[-] P2.S4: Run Phase 2 validation and execute simulated hook run"
next_action: Investigate hook dispatch process lifecycle and verify P2.S4 evidence
blockers: none
---

# Laya Tool Decision Shadow Evaluation Implementation Plan

## Plan Metadata

- Status: ready
- Mode: interactive
- Delegation: single agent (sequential verification across schema, hook capture, and comparison reporting)
- Storage: docs/plans/laya-tool-decision-shadow-eval.md
- Last updated: 2026-09-28
- Goal: Implement a shadow-mode evaluation harness using Laya/Ollaya (winnow:e4b) for pre-tool safety decisions (approve, deny, prompt) and compare prediction concordance, latency, and token efficiency against LLM baseline decisions.
- Success criteria:
  - Pre-tool safety evaluation emits non-blocking shadow calls to local Ollaya without affecting real execution or permission gates.
  - Shadow logger captures tool metadata, LLM baseline tokens, Ollaya token counts (0 output tokens), prediction label, confidence scores, and actual user/hook ground truth into an ignored JSONL stream.
  - High-confidence policy enforces that autonomous non-prompt actions (approve/deny) require confidence >= 0.85; otherwise defaulting to prompt.
  - An evaluation CLI calculates concordance, false-approval rates, latency percentiles, and net token savings in a normalized report format compatible with future evaluation extensions.
- Constraints and assumptions:
  - Ollaya local server runs on `http://localhost:11435` with model `winnow:e4b` (or `laya` fallback).
  - Shadow evaluation must be fail-safe: any failure to communicate with Ollaya must never block or alter pre-tool decisions.
  - Git is strictly read-only; result artifacts and logs reside under ignored `results/`.
  - Runners for point-in-time decisions remain separate from multi-turn skill A/B test runners, but share summary report structure.

## Current State

- Current phase: Phase 2: Pre-Tool Hook Shadow Instrumentation
- Current step: [-] P2.S4: Run Phase 2 validation and execute simulated hook run
- Next action: Investigate hook dispatch process lifecycle and verify P2.S4 evidence
- Blockers: none

## Execution Protocol

Any agent executing this plan follows these rules.

1. Read Current State first and perform exactly the Next action.
2. Status markers: `[ ]` pending, `[-]` in progress, `[x]` complete, `[!]` blocked, `[?]` awaiting user.
3. Elaborate a phase's steps only when it starts. Interactive: only after the user asks to start it; confirm the steps with the user before executing.
4. Phase boundaries are revisable: split, merge, reorder, or rename phases when evidence changes the design, and record the decision and rationale.
5. Mark a step `[x]` only after running its Check; record the command and outcome on the step. Interactive: when completing a step while the plan is not yet complete, prompt the user to perform any actions ready for manual testing, or state "No checkpoint tests yet." if there is nothing yet to test.
6. Update this file after every durable state transition, before continuing. Record each fact once in its owning section; don't rewrite the file.
7. If a step's premise is false or it needs changes outside its scope, mark it `[!]`, log the evidence, and ask the user. Don't improvise around it.
8. Phase gate: run the phase's full Validation, not a subset. Interactive: stop, report evidence, and ask whether to continue, revise, or pause. If code changed and is viable, include a suggested one-line commit message in a `text` code block; if it changed but isn't viable, say the message is deferred; if no code changed, omit it.
9. Git is read-only: status, diff, log, show, and branch listing only. Never stage, commit, branch, or push.
10. When a phase completes, collapse each step to a one-line result that retains its Check and outcome as the sole evidence record. Keep Validation prescriptive; remove commands and outcomes from completed-phase Progress Log entries; verify each evidence pair appears only on its owning step.
11. When every phase passes, run final validation and set Status to completed, then move this file to `docs/plans/archive/` and never touch the old path.

## Decisions

- Target tool call safety as the first pilot decision point rather than multi-turn dialogue or plan readiness; 2026-09-28.
- Shadow mode only: Laya makes predictions alongside the primary agent/hook but has zero authority to alter the actual permission decision during evaluation; 2026-09-28.
- Keep comparison engines decoupled: point-in-time classification (Ollaya) and multi-turn behavioral evaluations (Waza) use dedicated runners with a shared summary report structure; 2026-09-28.
- Autonomous actions (approve/deny) require confidence >= 0.85; lower confidence maps to prompt; 2026-09-28.

## Deferred Items

- Active enforcement gate: promoting Laya from shadow logger to active pre-tool authorization; trigger: after concordance exceeds 95% with zero false approvals across at least 50 shadow trials.
- Agentic workflow and slash-prompt integration for comparisons; trigger: after standalone CLI comparison passes review.

## Phase 1: Decision Model Contract & Shadow Logger

### Tangible output

A typed client module and logging mechanism in `src/lib/decision-model/` with unit tests proving Ollaya request formulation, question criteria formatting, response parsing, and fail-safe local logging.

### Completion criteria

- Typed TypeScript client targeting Ollaya `/v1/systemone` or `/api/decide` with support for `winnow:e4b` and `laya`.
- Formulates typed `choice` question for tool safety with `approve`, `deny`, and `prompt` criteria.
- Applies confidence thresholding (calibrated confidence >= 0.85 for approve/deny; below 0.85 maps to prompt).
- Appends shadow decision records to `results/tool-decisions/shadow.jsonl` with token metrics (input tokens, output tokens, prompt tokens) and timestamps.
- Unit tests cover parsing valid responses, threshold mapping, network timeouts, and offline error handling without throwing uncaught exceptions.

### Context

- Ollaya runs locally at `http://localhost:11435`.
- Endpoints: `POST /v1/systemone` (TypeSafe compatible) or `POST /api/decide`.
- Ignored path: `results/` in `.gitignore`.
- Relevant testing convention: `node:test` and `node:assert/strict` via `npm test`.

### Dependencies and risks

- Depends on local Ollaya service availability for integration tests (mocked for unit tests).
- Risk: Model response formatting variations across `winnow:e4b` vs `laya`.
- Recovery: Use Ollaya's `/v1/systemone` contract which normalizes answers across models.

### Steps

- [x] P1.S1: Define decision model TypeScript types and interfaces (`src/lib/decision-model/types.ts`). Check: `npm run typecheck` passed cleanly.
- [x] P1.S2: Implement decision client and question builder (`src/lib/decision-model/client.ts`). Check: `npm run typecheck` passed cleanly.
- [x] P1.S3: Implement fail-safe shadow logger (`src/lib/decision-model/shadow-logger.ts`). Check: `npm run typecheck` passed cleanly.
- [x] P1.S4: Write unit test suite (`test/decision-model-client.test.ts`). Check: `npm test -- test/decision-model-client.test.ts` passed (5 tests).
- [x] P1.S5: Run full Phase 1 validation. Check: `npm test -- test/decision-model-client.test.ts && npm run typecheck && npm run check:customizations` passed cleanly.

### Validation

- `npm test -- test/decision-model-client.test.ts`
- `npm run typecheck`
- `npm run check:customizations`

### Checkpoint

User Test unavailable: Phase 1 is a headless TypeScript library module with no direct interactive UI. User confirmation per protocol line 8.

## Phase 2: Pre-Tool Hook Shadow Instrumentation

### Tangible output

Instrumented pre-tool hook in `.github/hooks/pre-tool-safety.js` that asynchronously triggers shadow decision scoring and logs ground-truth user/hook outcomes without altering hook stdout.

### Completion criteria

- Pre-tool safety hook dispatches non-blocking shadow evaluation task on incoming tool calls.
- Preserves exact existing stdout format `{ hookSpecificOutput: { permissionDecision, ... } }`.
- Records whether actual decision was autonomous (`allow`/`deny`) or required user intervention (`ask`), labeling post-prompt user resolution as external/deferred.
- Measures latency of both standard hook evaluation and shadow decision pass.
- Regression tests in `test/deny-non-read-git.test.ts` pass with zero changes to safety boundaries.

### Context

- `.github/hooks/pre-tool-safety.js`
- `.github/hooks/pre-tool-safety-git.js`
- `.github/hooks/pre-tool-safety-workspace.js`
- `test/deny-non-read-git.test.ts`

### Dependencies and risks

- Depends on Phase 1 shadow logger.
- Risk: Hook timeouts (configured timeout in `.github/hooks/deny-non-read-git.json`).
- Recovery: Asynchronous/detached dispatch or tight timeout (< 100ms) with fail-open shadow bypass so hook execution is never delayed.

### Steps

- [x] P2.S1: Add regression tests in `test/deny-non-read-git.test.ts`. Check: `npm test -- test/deny-non-read-git.test.ts` passed (27 tests).
- [x] P2.S2: Instrument `.github/hooks/pre-tool-safety.js` with asynchronous shadow evaluator. Check: `npm run typecheck && npm test -- test/deny-non-read-git.test.ts` passed.
- [x] P2.S3: Verify and update hook JSON registrations. Check: `npm run check:customizations` passed cleanly.
- [-] P2.S4: Run Phase 2 validation and execute simulated hook run. Check: verify shadow logging survives hook exit and record outcome.

### Validation

- `npm test -- test/deny-non-read-git.test.ts`
- Manual execution of tool hook with simulated tool payload.

### Checkpoint

Interactive User Test: Trigger a tool call in a test session and verify via `results/tool-decisions/shadow.jsonl` that a shadow entry was appended while the tool executed normally. Free-text prompt: what entry was logged in shadow.jsonl?

## Phase 3: Decision & Token Comparison CLI

### Tangible output

A standalone comparison CLI `npm run eval:decisions` that analyzes logged shadow decisions against baseline LLM usage.

### Completion criteria

- CLI script `scripts/compare-decisions.ts` reads `results/tool-decisions/shadow.jsonl`.
- Outputs summary metrics: total decisions, concordance rate (Laya vs ground truth), false-approval count (critical safety check), distribution of decisions (`approve`, `deny`, `prompt`).
- Calculates total token savings: baseline turn tokens vs Laya input tokens (with 0 output tokens).
- Reports p50, p90, and p99 latency comparison.
- Generates a normalized JSON report under `results/tool-decisions/reports/` using the common experiment report structure.

### Context

- `docs/specs/2026-09-25-agent-a-b-evaluation-design.md` (for shared metric naming and verdict conventions).
- `package.json` for npm script definition.

### Dependencies and risks

- Depends on shadow logs produced in Phase 2.
- Risk: Insufficient log samples for statistical significance.
- Recovery: Support synthetic test fixtures and replay datasets for verification before live logging.

### Steps

_Not yet elaborated. Populate immediately before this phase starts._

### Validation

- `npm test -- test/compare-decisions.test.ts`
- `npm run typecheck`
- Run `npm run eval:decisions -- --fixture test/fixtures/shadow-decisions-sample.jsonl`

### Checkpoint

Interactive User Test: Run comparison CLI against sample shadow log and inspect output table. Free-text prompt: what summary table and token delta was printed?

## Review Record

- Verdict: ready
- Mode: interactive
- Fingerprint: sha256:d8c54e19f72b66a8bc430e71946f6d0f772e73a8efc5a2c2622f98124dbf4ca7
- Reviewed: 2026-09-28
- Checker: plan-checker (shared)

## Progress Log

- 2026-09-28: Canonical plan created at docs/plans/laya-tool-decision-shadow-eval.md with outline-level phases.
- 2026-09-28: Phase 1 completed: decision model client, types, fail-safe shadow logger, and unit tests implemented and verified.
- 2026-09-28: Phase 2 in progress: steps P2.S1 through P2.S3 completed; step P2.S4 in review and investigation for hook lifecycle and payload evidence.
