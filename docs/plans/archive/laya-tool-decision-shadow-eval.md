---
status: completed
mode: interactive
canonical_location: docs/plans/archive/laya-tool-decision-shadow-eval.md
current_phase: completed
current_step: completed
next_action: none
blockers: none
---

# Laya Tool Decision Shadow Evaluation Implementation Plan

## Plan Metadata

- Status: completed
- Mode: interactive
- Delegation: single agent (sequential verification across schema, hook capture, and comparison reporting)
- Canonical location: docs/plans/archive/laya-tool-decision-shadow-eval.md
- Last updated: 2026-09-28
- Goal: Implement a shadow-mode evaluation harness using Laya/Ollaya (winnow:e4b) for pre-tool safety decisions and compare prediction concordance, latency, and token efficiency against an LLM-as-judge baseline.
- Success criteria:
  - Pre-tool safety evaluation dispatches non-blocking, detached shadow workers to local Ollaya without delaying execution, affecting hook stdout, or losing records on process exit.
  - Shadow logger captures tool metadata, `tool_use_id`, `session_id`, Ollaya token counts (0 output tokens), prediction label, calibrated confidence scores, and hook permission outcomes into an ignored JSONL stream.
  - Question design evaluates binary safety with prompt derived from an uncertainty band; autonomous non-prompt actions require confidence >= 0.85.
  - Token-savings baseline is measured against an offline LLM-as-judge prompt baseline on identical payloads, rather than asserting per-hook turn tokens.
  - Standalone comparison CLI produces confusion matrices (precision/recall for deny), Wilson/Clopper-Pearson confidence intervals, Brier calibration scores, latency percentiles, and per-model stratified breakdowns (never pooled across models).
- Constraints and assumptions:
  - Ollaya local server runs on `http://localhost:11435` with model `winnow:e4b` (or `laya:en` evaluated separately).
  - Shadow evaluation must be fail-safe: any failure to communicate with Ollaya must never block or alter pre-tool decisions.
  - Git is strictly read-only; result artifacts and logs reside under ignored `results/`.
  - Runners for point-in-time decisions remain separate from multi-turn skill A/B test runners, but share summary report structure.
  - Post-prompt user interaction is unobservable from hook stdin and is explicitly labeled unknown.

## Current State

- Current phase: completed
- Current step: completed
- Next action: none
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
- Decouple hook stdout from shadow scoring via detached child process (`spawn` with `detached: true, stdio: 'ignore', unref()`) so telemetry survives short-lived parent hook termination; 2026-09-28.
- Hook ground truth: observe hook permission outcome (`allow` vs `ask`); correlate `PreToolUse` with `PostToolUse` via `tool_use_id` for execution vs block; explicitly label post-prompt user choices as unknown; 2026-09-28.
- Token-savings baseline: measured against an offline LLM-as-judge prompt baseline evaluated on identical payloads, rather than claiming per-hook turn tokens; 2026-09-28.
- Model stratification: track and report models (`winnow:e4b` vs `laya:en`) in separate buckets; never pool metrics across models. Track timeouts and network errors as dedicated categories; 2026-09-28.
- Question design: binary risk classification (`safe` vs `unsafe`) with `prompt` derived from probability uncertainty band; autonomous approve/deny requires confidence >= 0.85; 2026-09-28.
- Asymmetric enforcement direction: when eventually promoted from shadow, Laya may escalate decisions (`allow` -> `ask`/`deny`) but never loosen an existing hook prompt or deny; 2026-09-28.

## Deferred Items

- Calibration pipeline: Modelfile (`ollaya create`) with baked `QUESTIONS` and `CALIBRATION` file of temperatures fit on labeled shadow data; trigger: after collecting at least 100 labeled shadow decision records.
- Active enforcement gate: promoting Laya from shadow logger to active pre-tool authorization; trigger: stratified replay corpus (benign reads, benign mutations, adversarial/destructive commands) with 95% Clopper-Pearson upper bound on false approvals < 1%.
- PostToolUse correlation hook: separate log-only hook correlating `tool_use_id` to determine whether tools were executed or blocked; trigger: after Phase 2 shadow hook verification.
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

Instrumented pre-tool hook in `.github/hooks/pre-tool-safety.js` that asynchronously triggers a detached shadow evaluation worker (`scripts/shadow-worker.ts`) and logs ground-truth hook outcomes without altering hook stdout.

### Completion criteria

- Pre-tool safety hook dispatches detached, non-blocking shadow evaluation worker on incoming tool calls (`spawn` with `detached: true, stdio: 'ignore', unref()`).
- Preserves exact existing stdout format `{ hookSpecificOutput: { permissionDecision, ... } }`.
- Records `tool_use_id`, `session_id`, `tool_name`, `tool_input`, model name, confidence, and hook permission decision (`allow` vs `ask`).
- Post-prompt user resolution is explicitly labeled as unknown / unobservable from hook stdin.
- Shadow records land in `results/tool-decisions/shadow.jsonl` even after parent hook process immediately terminates.
- Regression tests in `test/deny-non-read-git.test.ts` pass with zero changes to safety boundaries.

### Context

- `.github/hooks/pre-tool-safety.js`
- `scripts/shadow-worker.ts`
- `.github/hooks/pre-tool-safety-git.js`
- `.github/hooks/pre-tool-safety-workspace.js`
- `test/deny-non-read-git.test.ts`

### Dependencies and risks

- Depends on Phase 1 shadow logger and client.
- Risk: Hook timeouts (configured timeout in `.github/hooks/deny-non-read-git.json`).
- Recovery: Detached worker execution (`unref()`) guarantees the parent process exits immediately without waiting on network I/O.

### Steps

- [x] P2.S1: Add regression tests in `test/deny-non-read-git.test.ts`. Check: `npm test -- test/deny-non-read-git.test.ts` passed (27 tests).
- [x] P2.S2: Instrument `.github/hooks/pre-tool-safety.js` with asynchronous shadow evaluator. Check: `npm run typecheck && npm test -- test/deny-non-read-git.test.ts` passed.
- [x] P2.S3: Verify and update hook JSON registrations. Check: `npm run check:customizations` passed cleanly.
- [x] P2.S4: Fix shadow dispatch via detached worker and verify shadow logging survives hook exit. Check: `npm test -- test/deny-non-read-git.test.ts && npm run check` passed; detached worker regression test confirmed shadow log record written after parent hook process exit.

### Validation

- `npm test -- test/deny-non-read-git.test.ts`
- Manual execution of tool hook with simulated tool payload verifying `shadow.jsonl` entry after parent exit.

### Checkpoint

Interactive User Test: Trigger a tool call in a test session and verify via `results/tool-decisions/shadow.jsonl` that a shadow entry was appended while the tool executed normally. Free-text prompt: what entry was logged in shadow.jsonl?

## Phase 3: Decision & Token Comparison CLI

### Tangible output

A standalone comparison CLI `npm run eval:decisions` that analyzes logged shadow decisions against baseline LLM usage.

### Completion criteria

- CLI script `scripts/compare-decisions.ts` reads `results/tool-decisions/shadow.jsonl`.
- Outputs summary metrics: total decisions, concordance rate (Laya vs ground truth), false-approval count (critical safety check), and distribution of decisions (`approve`, `deny`, `prompt`).
- Produces confusion matrix with precision, recall, and specificity for the deny/unsafe class.
- Calculates Wilson or Clopper-Pearson confidence intervals for false-approval and concordance rates rather than bare point rates.
- Performs risk-coverage sweep across confidence thresholds (coverage vs error among auto-decided calls).
- Reports calibration metrics including Brier score and reliability bin analysis.
- Breaks down metrics per model (`winnow:e4b` vs `laya:en`), never pooling across models.
- Treats timeouts and network errors as dedicated categories rather than dropping them.
- Reports latency percentiles (p50, p90, and p99 only when sample count >= 100).
- Calculates token savings compared to an offline LLM-as-judge baseline prompt evaluated on identical payloads.
- Generates a normalized JSON report under `results/tool-decisions/reports/` using the common experiment report structure.

### Context

- `docs/specs/2026-09-25-agent-a-b-evaluation-design.md` (for shared metric naming and verdict conventions).
- `package.json` for npm script definition.

### Dependencies and risks

- Depends on shadow logs produced in Phase 2.
- Risk: Insufficient log samples for statistical significance.
- Recovery: Support synthetic test fixtures and replay datasets for verification before live logging.

### Steps

- [x] P3.S1: Implement comparison and calibration metrics library (`src/lib/decision-model/comparison.ts`) providing confusion matrix, Wilson score confidence intervals, Brier score, reliability binning, threshold sweep, and model-stratified aggregations.
  - Files: `src/lib/decision-model/comparison.ts`
  - Check: `npm run typecheck`
  - Result: `npm run typecheck` passed cleanly.
  - Depends: none
- [x] P3.S2: Create deterministic test fixture (`test/fixtures/shadow-decisions-sample.jsonl`) with stratified examples (safe reads, mutations, denied commands, timeouts, low-confidence decisions).
  - Files: `test/fixtures/shadow-decisions-sample.jsonl`
  - Check: `node -e 'require("fs").readFileSync("test/fixtures/shadow-decisions-sample.jsonl","utf8").split("\n").filter(Boolean).forEach(l=>JSON.parse(l))'`
  - Result: JSONL parsed 16 stratified records without errors.
  - Depends: none
- [x] P3.S3: Implement unit test suite (`test/compare-decisions.test.ts`) validating statistical calculations, Wilson intervals, Brier score, and report generation.
  - Files: `test/compare-decisions.test.ts`
  - Check: `npm test -- test/compare-decisions.test.ts`
  - Result: `npm test -- test/compare-decisions.test.ts` passed (4 tests).
  - Depends: P3.S1, P3.S2
- [x] P3.S4: Implement comparison CLI (`scripts/compare-decisions.ts`) and register `eval:decisions` script in `package.json`, formatting summary tables and writing normalized JSON reports.
  - Files: `scripts/compare-decisions.ts`, `package.json`
  - Check: `npm run eval:decisions -- --fixture test/fixtures/shadow-decisions-sample.jsonl`
  - Result: CLI generated stratified tables, Wilson intervals, Brier scores, and saved JSON report.
  - Depends: P3.S3
- [x] P3.S5: Run full Phase 3 validation and verify simulated report generation.
  - Files: no source changes
  - Check: `npm test -- test/compare-decisions.test.ts && npm run typecheck && npm run check`
  - Result: 255 tests passed, typecheck, format, lint, customization, and drift checks passed cleanly.
  - Depends: P3.S4

### Validation

- `npm test -- test/compare-decisions.test.ts`
- `npm run typecheck`
- Run `npm run eval:decisions -- --fixture test/fixtures/shadow-decisions-sample.jsonl`

### Checkpoint

Interactive User Test: Run comparison CLI against sample shadow log and inspect output table. Free-text prompt: what summary table and token delta was printed?

## Review Record

- Verdict: ready
- Fingerprint: sha256:3e8c9b4f21a7d65e
- Mode: interactive
- Note: Admitted ready following plan-checker protocol; Phase 2 in progress with P2.S4 detached worker implementation.
- Reviewed: 2026-09-28
- Checker: plan-checker (shared)

## Progress Log

- 2026-09-28: Canonical plan created at docs/plans/laya-tool-decision-shadow-eval.md with outline-level phases.
- 2026-09-28: Phase 1 completed: decision model client, types, fail-safe shadow logger, and unit tests implemented and verified.
- 2026-09-28: Phase 2 completed: pre-tool hook instrumented with detached worker (`scripts/shadow-worker.ts`), verified with parent exit regression test and check suite.
- 2026-09-28: Phase 2 User Test passed: verified detached shadow worker records land in results/tool-decisions/shadow.jsonl after parent process exits.
- 2026-09-28: Phase 3 completed: comparison library, test fixture, unit tests, and CLI runner implemented and verified with full check suite (255 tests).
- 2026-09-28: Phase 3 User Test passed: verified comparison CLI report and calibration metrics. Plan completed and archived.
