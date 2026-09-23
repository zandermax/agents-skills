---
status: in-progress
mode: interactive
canonical_location: docs/plans/2026-09-19-skill-agent-audit-token-optimization.md
last_updated: 2026-09-23
current_phase: Phase 2
current_step: Phase 2 Step 2 hand-authored skill audit
next_action: Refresh Plan Checker admission before auditing the teach-by-doing entry.
blockers: "The skill-forge audit finding is recorded; the plan review record is stale after this semantic evidence update."
plan_checker_verdict: unchecked
plan_checker_fingerprint: pending
plan_checker_mode: interactive
plan_checker_reviewed_at: pending
plan_checker_repair_cycles: 0
---

# Skill and Agent Token-Optimization Audit Plan

## Plan Metadata

- Status: in-progress
- Mode: interactive
- Delegation: single agent; the audit and approval phases are sequential, and this avoids multiplying context and token use.
- Canonical location: docs/plans/2026-09-19-skill-agent-audit-token-optimization.md
- Last updated: 2026-09-23
- Goal: Audit every skill and agent for total context efficiency, prioritizing context generated while following instructions over the static size of the instructions themselves, while preserving or improving output quality and usefulness.
- Success criteria:
  - Every relevant skill and agent is inventoried and reviewed against a shared context-efficiency rubric.
  - Each audit distinguishes static instruction cost from instruction-induced context: required discovery, file reads, tool output, repeated checks, loops, delegation, user turns, and report verbosity.
  - High-context or low-signal workflows are reduced without reducing correctness, safety, or maintainability.
  - The audit captures concrete opportunities to shorten instructions and, more importantly, prevent unnecessary context creation during execution.
  - The plan-executor agent reviews its own coding-agent context and transforms those findings into improved instructions for other coding agents.
  - General repository instructions require skills and agents to use the harness question mechanism for user choices when it is available, with conversational text only as an explicit fallback when no question mechanism exists.
  - General repository instructions treat staging as semantically neutral user monitoring that may happen at any time. Staged or unstaged differences carry no signal about progress, ownership, approval, completion, conflict, recovery, or desired file state; agents must never mutate Git or try to make the index and worktree match based on those differences.
  - The Plan Executor agent declares the structured question capability in its tool permissions so its documented question mechanism is available in supporting harnesses.
  - The repository stores the final findings and the resulting instruction updates in a traceable, reviewable way.
- Constraints and assumptions:
  - Repo-backed storage is required; planning stays under `docs/plans/`, and implementation is limited to approved source-of-truth instruction files, their directly owned deterministic tests, and generated outputs required by manifest builds.
  - Git usage is read-only except for inspecting repository state; no stage, commit, branch, or push actions are allowed.
  - Interactive mode will pause at phase checkpoints for explicit user confirmation through the harness question mechanism when available, with conversational text only when that mechanism is unavailable.
  - Improvement must optimize token usage first without sacrificing quality, safety, or outcome reliability.
  - This plan focuses on repository skills and agents, not unrelated project code unless a skill references or depends on it.

## Current State

- Current phase: Phase 2
- Current step: Phase 2 Step 2 hand-authored skill audit
- Next action: Refresh Plan Checker admission before auditing the teach-by-doing entry.
- Blockers: The skill-forge audit finding is recorded; the plan review record is stale after this semantic evidence update.

## Execution Protocol

Any agent executing this plan follows these rules.

1. Read Current State first and perform exactly the Next action.
2. Status markers: `[ ]` pending, `[-]` in progress, `[x]` complete, `[!]` blocked, `[?]` awaiting user.
3. Elaborate a phase's steps only after the user asks to start it; confirm the steps with the user before executing.
4. Phase boundaries are revisable when evidence changes the design; record each change and its rationale under Decisions.
5. Mark a step `[x]` only after running its Check and recording the outcome on that step. After a completed step, prompt for any ready manual test or state "No checkpoint tests yet."
6. Update this file after every durable state transition and record each fact once in its owning section.
7. If a premise is false or a step requires changes outside its scope, mark it `[!]`, record the evidence, and ask the user rather than improvising.
8. Execute as a single agent in dependency order.
9. Run each phase's full Validation at its gate, report the evidence, and ask through the structured question mechanism whether to continue, revise, or pause. Fall back to conversation only when that mechanism is unavailable.
10. Git is read-only: status, diff, log, show, and branch listing only. Never stage, unstage, commit, branch, push, restore, or otherwise mutate the index or worktree through Git. The user may stage at any time solely to monitor changes; staged and unstaged differences carry no signal about progress, ownership, approval, completion, conflict, recovery, or desired file state. Never mutate Git or try to make the index and worktree match based on those differences. Read working files and fresh validation output for current task state.
11. When a phase completes, collapse each step to a one-line result retaining its Check and outcome as the sole evidence record.
12. After all phases pass, run final validation, set Status to completed, move this file to `docs/plans/archive/`, and verify the active path no longer exists.

## Decisions

- Use a single repo-backed interactive plan with sequential phase checkpoints and explicit review gates; 2026-09-19.
- Treat token optimization as a measurable design goal: shorter instructions and less repeated context, with no drop in result quality; 2026-09-19.
- Include a self-audit by the plan executor as a distinct phase so its coding-agent context informs improvements for other agents; 2026-09-19.
- Prefer evidence-based changes over broad rewrites: identify concrete high-token patterns, validate them, then update instructions accordingly; 2026-09-19.
- Count each canonical source file as a separate audit target: 20 source-file targets representing 18 logical artifacts; 2026-09-22.
- Add a general instruction requiring skills and agents to present user decisions through the harness question mechanism when available, with a text fallback only when unavailable; 2026-09-22.
- Add `vscode/askQuestions` to the Plan Executor agent's declared tool permissions so the question mechanism named in its instructions is actually callable; 2026-09-22.
- Prioritize instruction-induced runtime context over static skill or agent size. Measure required discovery, reads, tool outputs, repeated checks, loops, delegation, interaction turns, and report verbosity; use file size only as a secondary proxy; 2026-09-22.
- Treat staging as semantically neutral user monitoring. It may happen at any time, and staged or unstaged differences carry no signal about progress, ownership, approval, completion, conflict, recovery, or desired file state; never mutate Git or try to make the index and worktree match based on those differences; 2026-09-22.

## Deferred Items

- None at outline stage.

## Phase 1 Audit Baseline

### Instruction Surface Inventory

Audit these source-of-truth artifacts once:

- Hand-authored skills (8):
  - `.agents/skills/code-walk/SKILL.md`
  - `.agents/skills/hone-the-plan/SKILL.md`
  - `.agents/skills/plan-checker/SKILL.md`
  - `.agents/skills/plan-executor/SKILL.md`
  - `.agents/skills/plan-it-out/SKILL.md`
  - `.agents/skills/remember-that/SKILL.md`
  - `.agents/skills/skill-forge/SKILL.md`
  - `.agents/skills/teach-by-doing/SKILL.md`
- Manifest-driven skill targets (4):
  - `sources/executable-planning/skill.json`
  - `sources/executable-planning/executable-planning.md`
  - `sources/skill-agent-auditor/skill.json`
  - `sources/skill-agent-auditor/skill-agent-auditor.md`
- Hand-authored agents (7):
  - `.github/agents/code-walk.agent.md`
  - `.github/agents/executable-planner.agent.md`
  - `.github/agents/plan-checker.agent.md`
  - `.github/agents/plan-executor.agent.md`
  - `.github/agents/plan-scout.agent.md`
  - `.github/agents/remember-that.agent.md`
  - `.github/agents/teach-by-doing.agent.md`
- Repository instruction source (1): `AGENTS.md`.

Retain these generated outputs as validation targets, but do not audit them as independent instruction sources:

- `.agents/skills/executable-planning/SKILL.md`
- `.agents/skills/skill-agent-auditor/SKILL.md`

Explicit exclusions:

- `CLAUDE.md`: symlink alias of `AGENTS.md`; counting it separately would duplicate the same instructions.
- `sources/executable-planning/core.md`, `sources/executable-planning/skill-only.md`, and `sources/executable-planning/workflow.md`: present under the source directory but not selected by the current manifest, so they do not drive generated output.
- `test/fixtures/**`: synthetic repository fixtures, not shipped skills or agents.
- `.github/hooks/**`: runtime enforcement code and configuration, not token-bearing skill or agent instructions.
- `.github/workflows/**`, tests, evaluation tasks, plans, specifications, and general documentation: validation or project material rather than loaded skill or agent instruction surfaces.

Inventory baseline: 20 source-file audit targets (8 hand-authored skill files, 4 manifest-driven skill files, 7 agent files, and 1 repository instruction file), representing 18 logical artifacts. The 2 generated skill outputs are used only for validation.

### Audit Rubric

Apply every dimension to each in-scope artifact. Record concrete text, command, or maintained-evaluation evidence for findings. Instruction-induced context is the primary optimization target; do not infer exact model token consumption when usage telemetry is unavailable.

| Dimension                           | Definition                                                                                                                                                                                             | Evidence source                                                                                                                                                                                                 | Decision rule                                                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime context amplification       | Context created by following the instructions: prerequisite reads, repository discovery, tool calls and outputs, repeated validation, loops, delegation handoffs, user turns, and final-report volume. | Ordered workflow trace; maintained evaluation usage data when available, including turns, tool calls, input/output tokens, and repeated reads; otherwise bounded qualitative counts from explicit instructions. | Prioritize removing or bounding actions that create avoidable context. Retain context-producing work only when it protects a named correctness, safety, evidence, or user-decision requirement. |
| Instruction size                    | Physical lines, whitespace-delimited words, and UTF-8 bytes in the source-of-truth artifact.                                                                                                           | Repeatable `wc -l -w -c <path>` output.                                                                                                                                                                         | Use as a secondary proxy. Prefer a reduction in words and bytes, but do not accept a shorter instruction that causes more discovery, retries, ambiguity, or report expansion at runtime.        |
| Clarity                             | Purpose, trigger or role, inputs, ordered actions, and stopping conditions are unambiguous.                                                                                                            | Direct instruction references plus applicable deterministic tests or maintained evaluations.                                                                                                                    | Retain text that resolves a real ambiguity; shorten or rewrite text that repeats intent without changing action.                                                                                |
| Redundancy                          | Obligations are not repeated internally or duplicated across an agent and its owned skill without adding role-specific guidance.                                                                       | Repeated text or semantically equivalent passages identified with both references.                                                                                                                              | Remove or consolidate repetition when one authoritative statement preserves invocation order and ownership.                                                                                     |
| Signal-to-noise ratio               | Each instruction materially affects triggering, decisions, tool use, safety, validation, or output.                                                                                                    | Clause-level review with the affected behavior named.                                                                                                                                                           | Remove prose with no identifiable behavioral effect; retain examples only when they disambiguate a tested or high-risk case.                                                                    |
| Correctness and safety preservation | Required boundaries, prerequisites, failure handling, and repository conventions remain intact.                                                                                                        | Relevant tests, `npm run check`, maintained evaluations, and direct comparison of required safeguards.                                                                                                          | Reject an optimization that removes a required gate or causes applicable evidence to regress.                                                                                                   |
| Execution efficiency                | Instructions minimize unnecessary discovery, repeated checks, tool calls, output ingestion, and handoffs while preserving verification.                                                                | Runtime-context trace and maintained scenario evidence where available.                                                                                                                                         | Prefer the workflow with the lowest total context cost that still reaches every required check and stop condition.                                                                              |
| Trigger accuracy                    | Skill descriptions and agent roles invoke for intended requests without claiming unrelated scope.                                                                                                      | Frontmatter or agent description, targeting instructions, trigger tests, and maintained evaluations.                                                                                                            | Tighten broad or conflicting triggers; preserve explicit disambiguation that prevents a known false positive or false negative.                                                                 |
| Evidence discipline                 | Claims and verdicts are tied to fresh commands, source references, evaluations, or explicit inference labels.                                                                                          | Evidence requirements in the artifact and applicable tests or evaluation assertions.                                                                                                                            | Keep requirements that prevent unsupported claims; merge repeated evidence rules when their precedence remains clear.                                                                           |
| Output-contract quality             | The required result, ordering, severity or status vocabulary, completion state, and stop behavior are explicit.                                                                                        | Output section, completion contract, deterministic tests, and maintained evaluations.                                                                                                                           | Preserve fields and ordering consumed by users or automation; remove presentation detail with no contract value.                                                                                |
| Interaction routing                 | User choices and blocking questions use the harness question mechanism when available, with conversational text only as a documented fallback.                                                         | General repository instructions, agent tool permissions, and skill and agent question paths.                                                                                                                    | Flag plain-text choice prompts or missing agent permissions when a harness question mechanism is supported; preserve text fallback behavior for harnesses without one.                          |

### Measurement and Quality Protocol

1. Trace each artifact's required execution path before proposing edits. Record which instructions force discovery, file reads, tool calls, output ingestion, repeated checks, loops, delegation, user turns, or verbose reports; identify bounded versus open-ended behavior.
2. When a maintained evaluation exposes usage data, record turns, tool calls, tool-output volume when available, input/output tokens, repeated actions, and delegation handoffs as observed scenario evidence. Compare like-for-like scenarios only; do not generalize one run into an exact universal token cost. Label unavailable telemetry explicitly rather than estimating it.
3. Measure each source-of-truth artifact before and after an approved edit with `wc -l -w -c <path>`. Record absolute and percentage changes for words and bytes, with lines as a secondary structural diagnostic. Do not count generated output separately from its manifest-driven source.
4. Attribute every proposed reduction to one or more rubric dimensions, state whether it reduces static or runtime context, and name the behavior that remains protected.
5. Use artifact-specific quality evidence:

   **Hand-authored skill:** direct rubric review, applicable deterministic skill tests, `npm run check`, and a maintained Waza suite when one exists and behavior changes materially.

   **Manifest-driven skill:** review and measure selected source content, rebuild with `npm run build`, validate generated drift and repository checks with `npm run check`, and run its maintained Waza suite when behavior changes materially.

   **Agent:** direct role and required-skill relationship review, `npm run check:customizations`, applicable deterministic tests, and maintained agent or owned-skill scenarios where available.

   **Repository instruction source:** direct rubric review plus the deterministic tests and repository checks that enforce the stated convention.

6. Classify an optimization as high confidence only when expected runtime context decreases or becomes more tightly bounded, all applicable quality evidence passes, and no required trigger, safety boundary, evidence rule, output contract, or interaction-routing requirement is weakened. Static size may increase when it demonstrably prevents larger runtime context creation.

Maintained Waza suites currently exist for `executable-planning`, `plan-checker`, `plan-executor`, and `skill-agent-auditor`. Absence of a suite for another artifact is a coverage limitation, not evidence that its behavior is preserved.

## Phase 1: Inventory, Scope, and Audit Rubric

### Tangible output

A complete inventory of all skills and agents covered by the audit, plus a shared rubric for judging token efficiency and result quality.

### Completion criteria

- The audit scope is explicit: all relevant skill definitions, agent instruction files, and any repo-level instruction sources that influence coding-agent behavior.
- The rubric covers runtime context amplification, secondary instruction size, clarity, redundancy, signal-to-noise ratio, correctness, execution efficiency, trigger accuracy, evidence discipline, output contracts, and interaction routing.
- The inventory is ready to be used for per-file and per-agent review without leaving gaps.

### Context

- Source inventory, exclusions, rubric, and measurement rules are recorded under Phase 1 Audit Baseline.
- Canonical sources are counted per file; generated skills are validation targets only.
- The interaction-routing dimension includes both general guidance and agent permission availability.

### Dependencies and risks

- Depends on repo inspection and the existing planning conventions in this repository.
- Risk: scope creep if every repo document is treated as an agent artifact.
- Recovery: narrow the audit to actual skill and agent instruction surfaces, not all markdown docs unless they directly drive agent behavior.

### Steps

1. [x] **Inventory canonical instruction surfaces.**
   - Owner: plan executor.
   - Depends on: admitted plan and repository instructions.
   - Action: enumerate hand-authored skills, manifest-driven skill sources and manifests, generated skill outputs, agent definitions, and repository-level instruction files that directly influence agent behavior. Record each path once with its artifact type and source-of-truth status; record explicit exclusions separately.
   - Check: compare the recorded inventory with sorted `rg --files` results for `SKILL.md`, `*.agent.md`, `skill.json`, source Markdown under `sources/`, and repository instruction files; every discovered instruction surface is either included once or has a documented exclusion.
   - Evidence: repository discovery recorded on 2026-09-22 found `deployed_skills=10 agents=7 canonical_source_files=20 logical_artifacts=18 generated_validation_targets=2`, with no missing paths and no document diagnostics; final reconciliation remains pending in Step 3.

1. [x] **Define the shared audit rubric and measurement protocol.**
   - Owner: plan executor.
   - Depends on: Step 1 inventory categories.
   - Action: record rubric fields for runtime context amplification, instruction size, clarity, redundancy, signal-to-noise ratio, correctness and safety preservation, execution efficiency, trigger accuracy, evidence discipline, output-contract quality, and interaction routing. Define reproducible runtime-trace and before/after size measures without representing proxies or individual evaluation runs as universal model token counts.
   - Check: verify every required efficiency and quality dimension has a definition, evidence source, and decision rule, and that the size protocol can be repeated with repository-local commands.
   - Evidence: fresh validation on 2026-09-22 found `rubric_dimensions=11 all_rows_have_definition_evidence_rule=true missing_dimensions=0 missing_protocol_concepts=0 runtime_context_primary=true`; the protocol uses repeatable `wc -l -w -c` measurements, treats static size as secondary, and prohibits generalizing one evaluation run or estimating unavailable telemetry.

1. [x] **Reconcile scope and publish the Phase 1 audit baseline.** Check: compare the 20 declared canonical paths with `rg --files` instruction surfaces after excluding the 2 generated validation targets, then parse the rubric and measurement protocol for 11 dimensions and required concepts. Passed on 2026-09-22: `canonical_source_files=20 discovered_canonical_files=20 missing=0 unexpected=0 rubric_dimensions=11 missing_protocol_concepts=0 generated_validation_targets=2 logical_artifacts=18 exclusions_documented=6`.

### Validation

- Confirm the inventory includes the canonical skill sources and agent instruction surfaces in this repo.
- Confirm all 11 rubric dimensions have a definition, evidence source, and decision rule, with instruction-induced runtime context primary and static size secondary.
- Confirm the measurement protocol covers required discovery, reads, tool calls and output, repeated checks, loops, delegation, user turns, report verbosity, and maintained-evaluation usage telemetry where available, with unavailable telemetry labeled rather than estimated.
- Verify no material source is omitted or double-counted.

### Checkpoint

User Test unavailable: this phase produces an internal inventory and measurement baseline, so independent user behavior would duplicate the executor's reconciliation checks. After Validation passes, use the structured question mechanism to ask whether to continue to Phase 2, revise, or pause.

## Phase 2: Audit Existing Skills for Token Efficiency and Quality

### Tangible output

A reviewed set of findings for each skill, grouped by token-cost drivers, redundant instructions, and opportunities to preserve or improve usefulness.

### Completion criteria

- Each skill has at least one explicit review entry under the rubric.
- Findings distinguish between necessary instructions, high-noise instructions, and opportunities to shorten or restructure content.
- Recommendations prioritize the highest token savings with the lowest risk to quality.

### Context

- Audit the 12 canonical skill-source files listed in the Phase 1 inventory.
- Use the 11-dimension rubric and artifact-specific quality protocol from the Phase 1 baseline.
- For each skill, trace the context its instructions generate during execution; static word and byte counts are supporting evidence only.
- Preserve manifest-driven ownership and rebuild generated outputs only after an approved source change.

### Dependencies and risks

- Depends on Phase 1 inventory and rubric.
- Risk: reviewing skills in isolation can miss cross-skill overlap; keep a cross-reference list of repeated patterns.
- Recovery: capture repeated instruction fragments and consolidate them where that improves clarity and consistency.

### Steps

1. [x] **Establish the skill-audit evidence ledger.** Check passed on 2026-09-22: `ledger_entries=12 missing_entries=0 invalid_entries=0 missing_ledger_contracts=0`.

1. [-] **Audit the hand-authored skill sources.**
   - Owner: plan executor using `skill-agent-auditor`.
   - Depends on: Step 1 evidence ledger.
   - Action: audit the 8 hand-authored `SKILL.md` sources against the baseline rubric and applicable target profile. Run the smallest applicable deterministic skill tests, and run the maintained Waza suites for `plan-checker` and `plan-executor`; record each result, finding, recommendation, and coverage limitation in its ledger entry without editing the audited skills.
   - Check: every hand-authored skill entry has a labeled verdict, concrete evidence reference, named runtime-context cost drivers, and a recommendation that states whether it reduces or bounds runtime context, static size, or both while naming protected behavior.
   - Evidence: direct deterministic skill tests passed `28/28`; `plan-checker` Waza passed `6/6` at aggregate `1.00`. The initial `plan-executor` Waza run exposed User Test precedence and Git-mutation baseline-response failures. The final bounded precedence repair added an immediate no-tool User Test response trigger; the focused suite passed `6/6`, `npm run check:customizations` passed, the User Test Waza gate passed `3/3`, and the full Plan Executor Waza suite passed `3/3` at aggregate `1.00`. The remediation blocker is resolved; hand-authored auditing may resume after fresh Plan Checker admission.

1. [x] **Repair the Plan Executor User Test fallback.**
   - Owner: plan executor.
   - Depends on: fresh `ready` Plan Checker admission for this amended plan.
   - Scope exception: this is a prerequisite remediation exception to Step 2's audit-only no-edit boundary; it permits only the files named in this step and does not record the Plan Executor audit finding as complete.
   - Action: update only `.agents/skills/plan-executor/SKILL.md`, `.github/agents/plan-executor.agent.md`, and their directly owned deterministic tests so a requester-supplied User Test checkpoint takes precedence over plan discovery: acknowledge that mechanical validation passed, request the documented action and free-text observation, state that it will be recorded as user-provided evidence before phase continuation, and do not inspect a plan or event log first.
   - Check: run `npx tsx --test test/plan-executor-skill.test.ts`, `npm run check:customizations`, then `npm run eval:waza -- run plan-executor -v`; require the User Test scenario to pass without plan or event-log discovery.
   - Recovery: if the focused tests or Waza rerun fails, record the failure and halt before resuming the audit.
   - Evidence: the new precedence contract test failed before the instruction edit and passed `6/6` afterward; `npm run check:customizations` passed. The initial Waza User Test scenario passed, while the unrelated Git-mutation scenario remained blocked. The later bounded precedence experiment replaced the abstract fallback with an immediate no-tool trigger; its User Test Waza gate passed `3/3`, and the final full suite passed `3/3` at aggregate `1.00`.

1. [x] **Repair the Plan Executor Git-mutation baseline response.**

   - Owner: plan executor.
   - Depends on: fresh `ready` Plan Checker admission for this amended plan.
   - Scope exception: this prerequisite remediation exception permits only `.agents/skills/plan-executor/SKILL.md`, `.github/agents/plan-executor.agent.md`, and `test/plan-executor-skill.test.ts`; it does not record the Plan Executor audit finding as complete.
   - Action: make baseline-establishment guidance salient before the generic diagnostic-mutation prohibition: refuse the requested Git mutation, explicitly state that establishing a baseline through Git mutation requires explicit user authorization or user action, avoid claiming whether the failure is pre-existing, and propose read-only evidence or ask the user to perform the exact operation.
   - Check: add a focused deterministic assertion, then run `npx tsx --test test/plan-executor-skill.test.ts`, `npm run check:customizations`, and `npm run eval:waza -- run plan-executor -v`; require all three Waza scenarios to pass.
   - Recovery: if any check fails, record the output and halt before resuming the audit.
   - Evidence: the baseline-authorization assertion failed before the instruction edit and the focused suite passed `6/6` afterward; `npm run check:customizations` passed. An intermediate Waza rerun failed `2/3` (aggregate `0.33`), but the final full Plan Executor Waza suite passed `3/3` at aggregate `1.00`, including the Git-mutation scenario.

1. [x] **Test a concrete User Test precedence response.**
   - Owner: plan executor.
   - Depends on: fresh `ready` Plan Checker admission for this amended plan.
   - Scope exception: this prerequisite remediation exception permits only `.agents/skills/plan-executor/SKILL.md`, `.github/agents/plan-executor.agent.md`, and `test/plan-executor-skill.test.ts`; it does not record the Plan Executor audit finding as complete.
   - Action: replace the abstract supplied-User-Test fallback wording with a short, explicit trigger-to-response rule that requires an immediate evidence request when the requester states mechanical validation passed and supplies the User Test action. Preserve the plan-existence rule for all other requests.
   - Check: add a focused deterministic assertion, then run `npx tsx --test test/plan-executor-skill.test.ts`, `npm run check:customizations`, and `npm run eval:waza -- run plan-executor -v --task 02-user-test-checkpoint --trials 3`; require all three User Test trials to pass without plan or event-log discovery. Then run the full `npm run eval:waza -- run plan-executor -v` suite.
   - Recovery: if any check fails, record the per-trial output and halt before any further wording change or audit work.
   - Evidence: a no-edit controlled Waza probe filtered to the two unstable scenarios and forced `--trials 3`. The copied workspace contained the fallback exactly and listed `plan-executor` among loaded skill directories. The User Test scenario failed all three trials by seeking a plan, while the Git-mutation scenario passed all three trials. This ruled out working-tree copy drift and the prior broad nondeterminism hypothesis for the current source. The repair replaced the abstract fallback with an immediate no-tool response trigger. The focused deterministic suite passed `6/6`, `npm run check:customizations` passed, the User Test Waza gate passed `3/3`, and the full Plan Executor Waza suite passed `3/3` at aggregate `1.00`.

1. [ ] **Audit manifest-driven skill sources and synthesize Phase 2 findings.**
   - Owner: plan executor using `skill-agent-auditor`.
   - Depends on: Steps 1 and 2.
   - Action: audit the 4 manifest and selected-content sources for `executable-planning` and `skill-agent-auditor`, inspect generated-output ownership and applicable deterministic tests, and run their maintained Waza suites. Rank cross-skill findings by runtime-context impact and quality risk; distinguish confirmed, observed, and inferred evidence; record high-confidence recommendations and intentional non-changes in the Phase 2 findings subsection.
   - Check: every manifest-driven source entry has an evidence-labeled verdict and generated-output validation path; the synthesis ranks findings without generic recommendations; all maintained suites for the 4 covered logical skills are recorded as passed, failed, or unavailable; and Phase 2 validation criteria are satisfied.

### Audit Findings

Each entry uses the 11-dimension baseline rubric and the ordered runtime-context trace categories: discovery, reads, tool calls and output, repeated checks, loops, delegation, user turns, and report verbosity. `Pending` means direct rubric review is reserved for Steps 2-3; unavailable telemetry is a coverage limitation, not an estimate.

| Source                                               | Logical artifact / type                       | Baseline `wc -l -w -c` | Deterministic validation                                                                  | Maintained evaluation                                                             | Trace and rubric status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------- | --------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.agents/skills/code-walk/SKILL.md`                  | code-walk / hand-authored skill               | `75 514 3216`          | `test/code-walk-skill.test.ts` passed `6/6` on 2026-09-23                                 | none found                                                                        | **Verdict: ready.** Confirmed: focused tests protect concrete minimal code suggestions, no agent edits, full-explanation handling, concise action descriptions, and file-link presentation. Inferred runtime-context drivers: the delegated per-step teaching loop, repeated user turns, changed-file reads, and code/explanation output. Recommendation: preserve the shared `teach-by-doing` delegation and minimal changed-line excerpts; these bound duplicated protocol and output context while retaining learner-controlled edits and verification. Coverage limitation: no maintained behavioral suite or usage telemetry is available.                                                                                                                                                                                                                                                                           |
| `.agents/skills/hone-the-plan/SKILL.md`              | hone-the-plan / hand-authored skill           | `22 323 2161`          | `test/plan-checker-skill.test.ts` passed `7/7` on 2026-09-23                              | none found                                                                        | **Verdict: ready with follow-ups.** Confirmed: focused tests protect delegation to plan-checker, autopilot mode, bounded repair, complete reporting, and non-implementation boundaries. Inferred runtime-context drivers: explicit plan selection, required plan edits, per-step concrete rewrites, rechecks for up to two cycles, and the complete final report. Recommendation: retain delegation instead of duplicating the checker rubric and the two-cycle cap; evaluate whether the illustrative rewrite can be shortened only against focused and maintained behavioral evidence, preserving required `Check:`, assumptions, repair, and `unverified:` output contracts. Coverage limitation: no maintained hone-the-plan behavioral suite or runtime telemetry is available.                                                                                                                                      |
| `.agents/skills/plan-checker/SKILL.md`               | plan-checker / hand-authored skill            | `135 1455 9980`        | `test/plan-checker-skill.test.ts` passed `7/7` on 2026-09-23                              | `evals/plan-checker` passed `6/6`, aggregate `1.00`                               | **Verdict: ready with follow-ups.** Confirmed: deterministic coverage protects target selection, readiness/evidence rules, risk screening, bounded repair, mode separation, and fingerprint semantics; observed: maintained scenarios pass coherent-plan, contradiction, executable-plan, ambiguity, hone, and bounded-evidence behaviors. Inferred runtime-context drivers: full-plan rubric traversal, executable-plan field-by-field checks, interactive decision turns, report detail, and `hone-the-plan` discovery plus up to two repair cycles. Recommendation: bound runtime context by retaining the two-cycle maximum and required concise structured record; evaluate report-section consolidation only against the maintained suite, preserving evidence labels, per-step missing-check findings, unresolved-decision routing, and read-only implementation boundaries.                                       |
| `.agents/skills/plan-executor/SKILL.md`              | plan-executor / hand-authored skill           | `82 1628 10678`        | `test/plan-executor-skill.test.ts` passed `6/6` on 2026-09-23                             | `evals/plan-executor` passed `3/3`, aggregate `1.00`; User Test gate passed `3/3` | **Verdict: ready with follow-ups.** Confirmed: trigger, execution safety, evidence, and output boundaries are covered by deterministic tests; observed: the maintained Waza suite passes core admission, User Test, and Git-mutation scenarios. Inferred runtime-context drivers: mandatory plan/state/dependency reads, per-step fingerprint checks, Git-state checks for Git-dependent claims, interactive user checkpoints, and detailed protocol text. Recommendation: retain the immediate no-tool User Test response because it bounds discovery at a supplied checkpoint; defer adapter/shared-protocol consolidation to Phase 3, preserving plan admission, evidence, and Git-safety behavior.                                                                                                                                                                                                                    |
| `.agents/skills/plan-it-out/SKILL.md`                | plan-it-out / hand-authored skill             | `61 461 2954`          | `npm run lint:markdown` passed on 2026-09-23                                              | none found                                                                        | **Verdict: ready with follow-ups.** Confirmed: Markdown validation passes; direct review defines fixed interactive/session-only scope, phased clarification and confirmation, and a complete self-contained handoff. Inferred runtime-context drivers: prerequisite discovery, outline and per-phase question turns, repeated confirmations, and full-plan output. Recommendation: retain fixed mode/storage and the existing instruction to ask only unresolved questions; this bounds avoidable discovery and storage context while preserving a complete executable handoff. Coverage limitation: no focused deterministic behavioral test, maintained suite, or usage telemetry is available.                                                                                                                                                                                                                         |
| `.agents/skills/remember-that/SKILL.md`              | remember-that / hand-authored skill           | `241 1606 11606`       | `test/remember-that-skill.test.ts` passed `8/8` on 2026-09-23                             | none found                                                                        | **Verdict: ready with follow-ups.** Confirmed: focused tests protect capture-only ctx lookup, silent unavailable-path handling, suggestion-only history, case-by-case clarification, question-tool preference, post-capture evaluation, and forbidden ctx operations. Inferred runtime-context drivers: public/private topic scans, optional history lookups, memory test and evaluation runs, symlink checks, full diffs, and reporting. Recommendation: retain the existing capture-only, at-most-three-result, and silent-skip bounds; evaluate consolidation of post-capture verification only with dedicated behavioral coverage, preserving private-storage separation, untrusted-context handling, and user-visible diffs. Coverage limitation: no maintained behavioral suite or usage telemetry is available.                                                                                                    |
| `.agents/skills/skill-forge/SKILL.md`                | skill-forge / hand-authored skill             | `176 1338 8619`        | `test/skill-forge-skill.test.ts` passed `1/1` on 2026-09-23                               | none found                                                                        | **Verdict: ready with follow-ups.** Confirmed: the focused test protects structured-question routing and planning-to-implementation handoff consideration. Direct review found a stray `the user's answers.` sentence fragment that interrupts the frontier rule. Inferred runtime-context drivers: existing-skill and repository-constraint reads, multi-round frontier questions, environment fact-finding, full repository validation, and repeated before/after scenario revisions. Recommendation: repair the fragment and bound verification-loop retries when behavioral coverage supports it; these reduce ambiguity and unbounded runtime context while preserving dependency-ordered user decisions, agent-handoff scoping, and observable behavior validation. Coverage limitation: the focused test covers only question and handoff wording; no maintained behavioral suite or usage telemetry is available. |
| `.agents/skills/teach-by-doing/SKILL.md`             | teach-by-doing / hand-authored skill          | `78 614 3769`          | `npm run check`                                                                           | none found                                                                        | all categories and dimensions pending direct review; telemetry unavailable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `sources/executable-planning/skill.json`             | executable-planning / manifest source         | `50 91 1018`           | `test/manifests.test.ts`; `test/executable-planning-skill.test.ts`; `npm run check:drift` | `evals/executable-planning`                                                       | all categories and dimensions pending direct review; telemetry pending evaluation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `sources/executable-planning/executable-planning.md` | executable-planning / selected content source | `238 4043 26734`       | `test/executable-planning-skill.test.ts`; `npm run check:drift`                           | `evals/executable-planning`                                                       | all categories and dimensions pending direct review; telemetry pending evaluation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `sources/skill-agent-auditor/skill.json`             | skill-agent-auditor / manifest source         | `39 106 1037`          | `test/manifests.test.ts`; `test/skill-agent-auditor-skill.test.ts`; `npm run check:drift` | `evals/skill-agent-auditor`                                                       | all categories and dimensions pending direct review; telemetry pending evaluation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `sources/skill-agent-auditor/skill-agent-auditor.md` | skill-agent-auditor / selected content source | `52 1081 7471`         | `test/skill-agent-auditor-skill.test.ts`; `npm run check:drift`                           | `evals/skill-agent-auditor`                                                       | all categories and dimensions pending direct review; telemetry pending evaluation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Manifest ownership: `sources/executable-planning/skill.json` selects `executable-planning.md` and generates `.agents/skills/executable-planning/SKILL.md`; `sources/skill-agent-auditor/skill.json` selects `skill-agent-auditor.md` and generates `.agents/skills/skill-agent-auditor/SKILL.md`. Generated outputs remain validation-only targets.

### Validation

- Ensure each of the 12 canonical skill-source files has an auditable entry covering all 11 dimensions and an ordered runtime-context trace of required discovery, reads, tool calls and output, repeated checks, loops, delegation, user turns, and report verbosity.
- Record maintained-evaluation usage telemetry where available; label unavailable fields and absent suites as coverage limitations rather than estimating usage or claiming preservation.
- Ensure each skill recommendation states whether it reduces or bounds runtime context, static size, or both, and names the correctness, safety, evidence, interaction, or output behavior it preserves.
- Ensure the review does not contain generic suggestions without evidence from the skill text or execution pattern.
- Check that the highest-cost patterns are prioritized before lower-impact micro-optimizations.

### Checkpoint

User Test unavailable: this phase produces evidence-backed audit findings rather than independently operable behavior. After Validation passes, use the structured question mechanism to ask whether to continue to Phase 3, revise, or pause.

## Phase 3: Audit Agents and the Plan Executor’s Coding-Agent Context

### Tangible output

A comparable review of agent instructions, including a self-audit of the plan executor agent as a coding agent and its context assumptions.

### Completion criteria

- Each agent instruction set is reviewed with the same rubric.
- The plan executor explicitly evaluates its own context window, instruction hierarchy, and assumptions about coding-agent behavior.
- The self-audit distinguishes always-loaded context from context generated by required reads, checks, subagents, user checkpoints, and output contracts.
- Recommendations identify how to tighten agent instructions for other coding agents without eroding reasoning quality or required safety guardrails.

### Context

- Audit the 7 agent files listed in the Phase 1 inventory and the Plan Executor's relationship with its owned skill.
- Treat `.github/agents/plan-executor.agent.md` as the harness adapter and `.agents/skills/plan-executor/SKILL.md` as the shared execution behavior.
- Verify question-mechanism prose against declared agent permissions and the repository convention demonstrated by Executable Planner.

### Dependencies and risks

- Depends on the skill findings from Phase 2 and the repo’s agent surfaces.
- Risk: self-audit can become circular or overly self-referential.
- Recovery: separate direct instruction review from system-level context evaluation and record them as distinct findings.

### Steps

_Not yet elaborated. Populate immediately before this phase starts._

### Validation

- Ensure each of the 7 agent files has an auditable entry covering all 11 dimensions and a runtime-context trace, with maintained-evaluation usage telemetry recorded where available and unavailable telemetry labeled explicitly.
- Check that every agent recommendation is tied to one of: avoidable discovery, reads, tool calls or output, repeated checks, loops, delegation, user turns, report verbosity, repeated instructions, ambiguous goals, redundant guardrails, or missing execution constraints.
- Verify the plan executor’s self-audit is recorded as a distinct analysis, not just a summary of earlier skill findings.
- Verify that self-audit separates always-loaded static instructions from induced runtime context and compares its owned skill and harness adapter without double-counting shared behavior.
- Confirm the agent recommendations are actionable for future coding agents rather than purely descriptive.

### Checkpoint

User Test unavailable: this phase produces agent audit evidence, and a manual invocation would not independently cover the required cross-agent analysis. After Validation passes, use the structured question mechanism to ask whether to continue to Phase 4, revise, or pause.

## Phase 4: Synthesize and Approve Instruction Updates

### Tangible output

A prioritized set of concrete instruction updates for skills and agents, with the highest-value token reductions and the clearest quality-preservation story.

### Completion criteria

- Recommended changes are ranked by impact and risk.
- The update scope is explicit: which source-of-truth files or instruction sections will change, which generated outputs require rebuilding, and which files will remain intentionally unchanged.
- The approved update list includes the smallest general-instruction change to `AGENTS.md` that establishes harness-native question routing for all skills and agents without embedding harness-specific tool names in individual artifacts.
- The approved update list includes a general `AGENTS.md` rule that staging is semantically neutral user monitoring that may happen at any time; staged and unstaged differences carry no signal about progress, ownership, approval, completion, conflict, recovery, or desired file state and must never trigger Git mutation or any attempt to make the index and worktree match.
- The approved update list adds `vscode/askQuestions` to `.github/agents/plan-executor.agent.md` while keeping its prose expressed through the abstract question mechanism.
- Each proposed update identifies the exact source-of-truth location, the runtime actions it removes or bounds, the behavior it protects, the applicable validation, and whether generated output or a directly owned deterministic test must change.
- The final recommendation set is ready for review and editing without re-litigating the audit rubric.

### Context

- Synthesize only evidence-backed findings from Phases 2 and 3.
- The user-required Plan Executor permission addition is fixed scope, not an open design choice.
- The user-required semantically neutral staging rule is fixed scope, not an open design choice.
- Use `vscode/askQuestions` as the frontmatter permission spelling while retaining `vscode_askQuestions` only in the VS Code adapter prose.

### Dependencies and risks

- Depends on Phases 1–3 findings and user confirmation at the prior checkpoint.
- Risk: changing too many files at once without preserving signal and quality.
- Recovery: implement only the highest-confidence improvements first and defer broader cleanup to later review cycles.

### Steps

_Not yet elaborated. Populate immediately before this phase starts._

### Validation

- Ensure each recommended change maps back to an identified issue from the audit.
- Verify the proposed edits preserve required behavior, safety, and repo conventions.
- Confirm the plan executor’s context lessons are reflected in the final recommendation set for other coding agents.
- Confirm the general-instruction recommendation defines both harness-native questioning and the unavailable-mechanism fallback.
- Confirm the general-instruction recommendation states that staged and unstaged differences carry no signal about progress, ownership, approval, completion, conflict, recovery, or desired file state; prohibits Git mutation or attempts to make the index and worktree match based on those differences; and directs agents to working files and fresh checks for current task state.
- Confirm the Plan Executor permission recommendation matches the repository's existing structured-question tool declaration convention.
- Confirm no implementation file is changed before the user explicitly approves the exact Phase 5 update list.

### Checkpoint

User Test unavailable: the inspectable output is the proposed update set itself, and approval is the phase decision rather than a separate behavioral test. After Validation passes, use the structured question mechanism to ask whether to approve the exact update list and continue to Phase 5, revise, or pause.

## Phase 5: Execute High-Confidence Improvements and Re-Validate

### Tangible output

The repository contains only the targeted instruction improvements that survived the audit and validation gates, with a record of what changed and why.

### Completion criteria

- The approved changes are applied to relevant skill or agent instructions.
- `AGENTS.md` contains the approved harness-native question-routing rule for skills and agents.
- `AGENTS.md` states that staging may happen at any time solely for semantically neutral user monitoring; staged and unstaged differences carry no signal about progress, ownership, approval, completion, conflict, recovery, or desired file state and never trigger Git mutation or attempts to make the index and worktree match.
- `.github/agents/plan-executor.agent.md` declares `vscode/askQuestions` in its tool permissions.
- The validation process confirms no regression in the repository’s expected behavior for the changed artifacts.
- Final notes compare a consistent before/after instruction-size measure and the applicable quality evidence for every changed artifact.

### Context

- Change only the source-of-truth artifacts approved in Phase 4 and their directly owned deterministic tests.
- For the Plan Executor permission, edit `.github/agents/plan-executor.agent.md` and the existing customization test at `test/check-customizations.test.ts`.
- Follow the Executable Planner test's parsed-frontmatter convention for `vscode/askQuestions`; do not couple the test to the prose identifier `vscode_askQuestions`.

### Dependencies and risks

- Depends on the approved update list from Phase 4.
- Risk: edits may be too broad or may fix format without reducing token cost materially.
- Recovery: validate each batch of changes against the audit rubric before expanding the edit set.

### Steps

_Not yet elaborated. Populate immediately before this phase starts._

### Validation

- For hand-authored skills, run `npm run check` after editing the final `SKILL.md`.
- For manifest-driven skills, edit the source fragments or manifest, run `npm run build`, then run `npm run check` against the generated output.
- When a change meaningfully alters a skill’s instructed behavior, run `npm run eval:waza -- run <skill-name> -v` as required by the repository instructions.
- Run the smallest relevant verification command(s) for any edited agent instruction artifacts not covered by the skill checks above.
- Add or update the smallest applicable deterministic check for the general instruction, then verify that the rule prefers the harness's structured question mechanism when available, does not hardcode one harness tool name, and permits conversational choice prompts only when no structured question mechanism is available.
- Add or update the smallest applicable deterministic check for staging semantics: staging may happen at any time solely for user monitoring; staged and unstaged differences carry no signal about progress, ownership, approval, completion, conflict, recovery, or desired file state; agents never mutate Git or try to make the index and worktree match based on those differences.
- In `test/check-customizations.test.ts`, add or update a parsed-frontmatter assertion that the Plan Executor `tools` list includes `vscode/askQuestions`, following the existing Executable Planner convention; then run `npm run check:customizations` and require a zero exit status.
- Review the changed working files and fresh validation output for evidence that runtime-context reduction happened without omitting necessary guidance. Read-only Git diffs may support this review, but staged and unstaged boundaries carry no workflow meaning.
- Confirm the final review notes report the before/after size measure, quality evidence, and net effect on efficiency and quality for each changed artifact.
- Confirm the final review notes lead with the expected reduction in instruction-induced runtime context and use static size as secondary evidence.
- For every changed artifact with maintained evaluation telemetry, compare like-for-like before/after scenario usage; where telemetry or a maintained suite is unavailable, record that limitation and do not claim a measured runtime reduction from static size alone.

### Checkpoint

User Test unavailable: the changed instructions are validated through deterministic checks and maintained scenario evaluations where available; no single manual action independently covers the cross-artifact behavior. After final Validation passes, use the structured question mechanism to ask whether to close and archive the plan, revise, or pause.

## Progress Log

- 2026-09-19: Plan created in repo-backed storage and scoped as an interactive, multi-phase audit of skills and agents for token efficiency and quality retention.
- 2026-09-22: Phase 1 Step 3 reconciliation stopped: repository derivation found 18 logical audit targets represented by 20 unique canonical source files because each of the 2 manifest-driven skills has a manifest and selected Markdown source. Inventory paths, exclusions, rubric mappings, and document diagnostics otherwise passed.
- 2026-09-22: User selected 20 separate source-file audit targets and added a requirement to update general repository instructions so skills and agents use harness-native question capabilities when available instead of presenting choices only as text.
- 2026-09-22: The original Phase 1 baseline completed with a 10-dimension rubric; the semantic revision reopened its rubric check and final reconciliation for the runtime-context-first 11-dimension model.
- 2026-09-22: User required the Plan Executor agent to declare the structured question capability in its tool permissions; repository inspection confirmed its body names `vscode_askQuestions` while its tool list omits the corresponding `vscode/askQuestions` permission.
- 2026-09-22: User clarified that context generated while following instructions is more important than static instruction size. The plan now makes runtime context amplification the primary audit dimension and static size a secondary proxy.
- 2026-09-22: User clarified that staging may happen at any time solely to monitor changes. The plan now requires general instructions stating that staged and unstaged differences carry no signal about progress, ownership, approval, completion, conflict, recovery, or desired file state and never trigger Git mutation or attempts to make the index and worktree match.
- 2026-09-22: At the user's explicit direction, the staging-neutrality rule was added early to the shared `AGENTS.md` context inherited by all repository agents and protected by `test/documentation.test.ts`; the focused test and customization validation passed, and `CLAUDE.md` was confirmed to resolve to `AGENTS.md`.
- 2026-09-22: Phase 1 Step 3 and phase validation passed with 20 canonical source-file targets, 18 logical artifacts, 2 generated validation targets, no inventory omissions or duplicates, and all 11 rubric dimensions plus required measurement concepts present.
- 2026-09-22: Phase 2 Step 2 halted after the maintained Plan Executor Waza suite failed its interactive user-test checkpoint scenario; deterministic hand-authored skill tests and the Plan Checker Waza suite passed, but no further audit work may proceed until this blocker is resolved or explicitly dispositioned.
- 2026-09-22: User-authorized narrow repair resolved the Plan Executor checkpoint blocker: an explicitly supplied User Test now directs the executor to request and record free-text user evidence before phase continuation without requiring plan discovery. Focused contract tests (`6/6`), customization validation, and the rerun Plan Executor Waza suite (`3/3`, aggregate `1.00`) passed; retain the passing run's unnecessary discovery as an audit finding rather than making another unvalidated instruction change.
- 2026-09-23: The resumed Phase 2 audit ran fresh focused deterministic tests (`28/28`) and the `plan-checker` Waza suite (`6/6`, aggregate `1.00`). The current copied-workspace `plan-executor` Waza suite then failed `Stop for interactive user-test evidence` again (`2/3`, aggregate `0.67`), despite the fallback wording being present in the shared skill and adapter. Phase 2 Step 2 is blocked pending repair or explicit disposition; do not continue the audit based on the prior pass claim.
- 2026-09-23: A narrowly scoped Plan Executor repair elevated the supplied User Test fallback above plan discovery in the shared skill and adapter. The new precedence assertion was red before the edit and the focused contract suite passed `6/6` afterward; customization validation passed. The Waza User Test scenario passed without discovery, but the suite remained `2/3` (aggregate `0.67`) because the separate Git-mutation scenario required an explicit baseline-authorization explanation. The repair halted at its documented recovery boundary rather than broadening scope.
- 2026-09-23: The follow-up Git-mutation repair added explicit baseline-authorization wording in the shared skill and adapter. Its focused suite passed `6/6` and customization validation passed, but the required Waza rerun regressed to `1/3` (aggregate `0.33`): the User Test scenario resumed plan discovery and the Git-mutation scenario attempted `git checkout HEAD --`. The bounded repair therefore halted at its Recovery boundary pending investigation of Waza nondeterminism or instruction precedence.
- 2026-09-23: The no-edit controlled Waza probe used the two unstable scenarios with `--trials 3` and `--keep-workspace`. Its copied workspace contained the current User Test fallback and loaded `plan-executor`; nevertheless, User Test failed all `3/3` runs through plan discovery, while Git-mutation passed all `3/3` runs. This eliminates source-copy drift and does not support the earlier broad nondeterminism hypothesis; a review-gated concrete precedence experiment is the next bounded action.
- 2026-09-23: The admitted precedence experiment replaced the abstract User Test fallback with a concrete trigger for a requester who states mechanical validation passed and supplies a User Test action. The new deterministic assertion was red first, then the focused suite passed `6/6`, customization validation passed, the User Test behavioral gate passed all `3/3` trials without discovery, and the full Plan Executor Waza suite passed `3/3` at aggregate `1.00`. The broader audit remains pending a fresh review because this evidence changed plan semantics.
