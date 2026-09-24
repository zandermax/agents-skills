---
status: in-progress
mode: interactive
canonical_location: docs/plans/2026-09-19-skill-agent-audit-token-optimization.md
last_updated: 2026-09-24
current_phase: Phase 8
current_step: Phase 8 elaborated; awaiting confirmation to execute P8.S1
next_action: Confirm the elaborated Phase 8 steps, then execute P8.S1 to inventory approved read-only diagnostic paths and command boundaries.
blockers: "Maintained Waza aggregate evidence is unavailable for executable-planning because the embedded tool adapter rejected the generated apply_patch argument and the run timed out; skill-agent-auditor showed trial variance and hung before completion. Repository-owned runner diagnostics are covered; adapter argument normalization remains upstream-owned."
plan_checker_verdict: not-ready
plan_checker_fingerprint: unavailable
plan_checker_mode: interactive
plan_checker_reviewed_at: 2026-09-24
plan_checker_repair_cycles: 0
recovery_cycle: 1 of 2 maximum
---

# Skill and Agent Token-Optimization Audit Plan

## Plan Metadata

- Status: in-progress
- Mode: interactive
- Delegation: single agent; the audit and approval phases are sequential, and this avoids multiplying context and token use.
- Canonical location: docs/plans/2026-09-19-skill-agent-audit-token-optimization.md
- Last updated: 2026-09-24
- Goal: Audit every skill and agent for total context efficiency, prioritizing context generated while following instructions over the static size of the instructions themselves, while preserving or improving output quality and usefulness.
- Success criteria:
  - Every relevant skill and agent is inventoried and reviewed against a shared context-efficiency rubric.
  - Each audit distinguishes static instruction cost from instruction-induced context: required discovery, file reads, tool output, repeated checks, loops, delegation, user turns, and report verbosity.
  - High-context or low-signal workflows are reduced without reducing correctness, safety, or maintainability.
  - The audit captures concrete opportunities to shorten instructions and, more importantly, prevent unnecessary context creation during execution.
  - The plan-executor agent reviews its own coding-agent context and transforms those findings into improved instructions for other coding agents.
  - General repository instructions require skills and agents to use the harness question mechanism for user choices when it is available, with conversational text only as an explicit fallback when no question mechanism exists.
  - General repository instructions treat staging as semantically neutral user monitoring that may happen at any time. Staged or unstaged differences carry no signal about progress, ownership, approval, completion, conflict, recovery, or desired file state; agents must never mutate Git or try to make the index and worktree match based on those differences.
- Constraints and assumptions:
  - Repo-backed storage is required; planning stays under `docs/plans/`, and implementation is limited to approved source-of-truth instruction files, their directly owned deterministic tests, and generated outputs required by manifest builds.
  - Git usage is read-only except for inspecting repository state; no stage, commit, branch, or push actions are allowed.
  - Interactive mode will pause at phase checkpoints for explicit user confirmation through the harness question mechanism when available, with conversational text only when that mechanism is unavailable.
  - Improvement must optimize token usage first without sacrificing quality, safety, or outcome reliability.
  - This plan focuses on repository skills and agents, not unrelated project code unless a skill references or depends on it.

## Current State

- Current phase: Phase 8
- Current step: Phase 8 elaborated; awaiting confirmation to execute P8.S1
- Next action: Confirm the elaborated Phase 8 steps, then execute P8.S1 to inventory approved read-only diagnostic paths and command boundaries.
- Blockers: Maintained Waza aggregate evidence remains unavailable for `executable-planning` and `skill-agent-auditor`; repository-owned runner diagnostics are covered, and adapter argument normalization remains upstream-owned.

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
13. Minimize tool-output context by default: use commands that filter output or report only the success, failure, or evidence needed for the current decision. Use full output only when it is required to diagnose a failure, resolve ambiguity, make a decision, or retain auditable evidence.
14. After making changes, detect and run the repository's available auto-format command before addressing format diagnostics. Treat remaining format failures as the follow-up scope; do not manually repair format issues first when the auto-format command exists.

### Plan Fingerprint Normalization

For admission freshness, canonicalize the plan with this exact procedure: parse YAML frontmatter and retain only `mode`, `canonical_location`, `goal`, `success_criteria`, `constraints`, and `decisions`; remove every other frontmatter key. Emit every retained key in the listed order, using `key:` followed by an empty value when a key is absent. In Markdown, retain the document from `# Skill and Agent Token-Optimization Audit Plan` through the end, but remove the complete `## Current State`, `## Progress Log`, and `## Audit Findings` sections, the complete `### Evidence` and `### Checkpoint` subsections, every line beginning with `- Evidence:`, `- Check:`, `- Outcome:`, `- Validation result:`, or `- Passed on`, and every `[x]`, `[-]`, `[!]`, or `[?]` status marker while retaining the associated text. Do not remove ordinary `Validation` headings or validation commands in step definitions. Normalize all remaining line endings to LF, trim trailing whitespace on every line, collapse each run of blank lines to one blank line, and preserve all other lines in document order. Serialize the retained frontmatter keys in the listed order, add one LF, then append the normalized Markdown. Hash the resulting UTF-8 bytes with SHA-256 and record it as `sha256:<hex>`.

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
- Add repository-owned Waza diagnostics and fail-fast classification around the observed adapter failure, limited to `scripts/run-waza.ts` and its directly owned deterministic tests; keep `apply_patch` argument normalization upstream because this repository does not own that adapter; user authorized this scope amendment on 2026-09-24.
- Default agent filesystem access to the active workspace; require explicit user approval or a plan-named requirement before external paths, and prevent optional session-history lookups from running merely because the `ctx` skill is available; user authorized this scope amendment on 2026-09-24.
- Add hook enforcement only for tool payloads whose path or command shape can be identified reliably; fail closed with an approval request for external paths, and fail open for unrecognized payloads while documenting that limitation rather than pretending the hook covers every tool.
- Treat tool-output minimization as a general execution rule: use filtered commands or concise success/failure reporting by default, and request or retain full output only when it is needed to interpret a failure, make a decision, or preserve evidence.
- Treat formatting as an ordered validation step: when the project exposes an auto-format command, run it after edits before manually addressing residual formatting diagnostics; only remaining diagnostics require follow-up.
- Treat the Executable Planner handoff as a phase-start transition rather than a generic implementation button: label it to start the first phase, target the named `Plan Executor` agent when the handoff schema supports named agents, and instruct that agent to elaborate the first phase before executing it under the plan's interactive confirmation rules.
- Treat `/tmp/*` and explicitly identified VS Code-owned Application Support or equivalent session-resource paths as permitted read-only diagnostic inputs, while keeping unrelated external paths confirmation-gated and preserving the prohibition on external writes.
- Replace the phase-neutral `Start` handoff with three explicit transitions: `Execute 💀` targets `Plan Executor` and executes only an approved, ready phase; `Elaborate 💬` targets `Executable Planner` and elaborates or clarifies the current phase before confirmation; `Complete ✅` targets `Plan Executor` and marks the plan complete and archives it only after no steps remain and final validation passes.
- Treat existing symlinks by their resolved targets: a symlink whose target is inside the active workspace inherits workspace-local read behavior, while a symlink to an unapproved external target remains confirmation-gated; broken or ambiguous links fail closed.
- Treat `~/.memory/<skill-name>/SKILL.md` memory skill files as shared, read-only resources readable by all agents through supported read tools; do not invent or allow a root-level `/memories/...` namespace.
- Use visually distinct planner handoffs: `Execute 💀` for execution, `Elaborate 💬` for phase elaboration or clarification, and `Complete ✅` for marking a plan complete and archiving it when no steps remain; each handoff must retain its underlying readiness, confirmation, and archive gates.
- When a phase defines a manual test, ask through the question mechanism with a pass option and an issue-reporting free-text option; record either the confirmation or the user's free-text issues as evidence before continuing.

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

1. [x] **Audit the hand-authored skill sources.**
   - Owner: plan executor using `skill-agent-auditor`.
   - Depends on: Step 1 evidence ledger.
   - Action: audit the 8 hand-authored `SKILL.md` sources against the baseline rubric and applicable target profile. Run the smallest applicable deterministic skill tests, and run the maintained Waza suites for `plan-checker` and `plan-executor`; record each result, finding, recommendation, and coverage limitation in its ledger entry without editing the audited skills.
   - Check: every hand-authored skill entry has a labeled verdict, concrete evidence reference, named runtime-context cost drivers, and a recommendation that states whether it reduces or bounds runtime context, static size, or both while naming protected behavior.
   - Evidence: all 8 hand-authored entries have rubric verdicts and runtime traces. Focused deterministic skill tests passed `28/28`; `plan-checker` Waza passed `6/6` at aggregate `1.00`; the final Plan Executor Waza suite passed `3/3` at aggregate `1.00`, including the User Test gate. The teach-by-doing/code-walk focused suite passed `6/6` on 2026-09-23. No maintained Waza suite or runtime telemetry exists for code-walk, hone-the-plan, plan-it-out, remember-that, skill-forge, or teach-by-doing; these are recorded as coverage limitations rather than estimated usage.

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

1. [x] **Audit manifest-driven skill sources and synthesize Phase 2 findings.**
   - Owner: plan executor using `skill-agent-auditor`.
   - Depends on: Steps 1 and 2.
   - Action: audit the 4 manifest and selected-content sources for `executable-planning` and `skill-agent-auditor`, inspect generated-output ownership and applicable deterministic tests, and run their maintained Waza suites. Rank cross-skill findings by runtime-context impact and quality risk; distinguish confirmed, observed, and inferred evidence; record high-confidence recommendations and intentional non-changes in the Phase 2 findings subsection.
   - Check: every manifest-driven source entry has an evidence-labeled verdict and generated-output validation path; the synthesis ranks findings without generic recommendations; all maintained suites for the 4 covered logical skills are recorded as passed, failed, or unavailable; and Phase 2 validation criteria are satisfied.
   - Recovery: investigate only the failing scenarios in `evals/executable-planning` and `evals/skill-agent-auditor`; compare each failure with its selected source (`sources/executable-planning/executable-planning.md` or `sources/skill-agent-auditor/skill-agent-auditor.md`), generated output (`.agents/skills/executable-planning/SKILL.md` or `.agents/skills/skill-agent-auditor/SKILL.md`), deterministic tests (`test/executable-planning-skill.test.ts`, `test/skill-agent-auditor-skill.test.ts`, and `test/manifests.test.ts`), and evaluation task; classify it as source defect, test/evaluator defect, or nondeterministic behavior; add or update only those named deterministic tests and the two selected Markdown sources when the classification proves a source contract defect; rebuild generated outputs only through `npm run build` after source changes; run the focused tests, `npm run check:drift`, and the affected Waza suite after each single repair. Stop and record a new blocker if any affected suite still fails after two bounded repair cycles or if the evidence cannot distinguish source behavior from evaluator instability.
   - Evidence: deterministic manifest, skill, and drift checks passed `20/20` tests plus `npm run check:drift`; the full `npm run check` passed. Repair cycle 1 added an explicit repo-backed persistence trigger to `sources/executable-planning/executable-planning.md` and explicit coverage evidence/severity guidance to `sources/skill-agent-auditor/skill-agent-auditor.md`, with directly owned contract assertions. Post-repair focused tests passed executable-planning `11/11` and skill-agent-auditor `3/3`; `npm run build` and `npm run check:drift` passed. The executable-planning Waza run reached the repaired persistence action but the embedded tool adapter rejected the generated `apply_patch` argument format and timed out; the auditor run passed both low-risk coverage trials, showed structural-mismatch trial variance, and hung during the third scenario before termination. These maintained aggregates are dispositioned as unavailable evaluator evidence, not source failures; no further source repair is justified within the two-cycle boundary.

### Audit Findings

Each entry uses the 11-dimension baseline rubric and the ordered runtime-context trace categories: discovery, reads, tool calls and output, repeated checks, loops, delegation, user turns, and report verbosity. `Pending` means direct rubric review is reserved for Steps 2-3; unavailable telemetry is a coverage limitation, not an estimate.

<!-- markdownlint-disable MD060 -->

| Source                                               | Logical artifact / type                       | Baseline `wc -l -w -c` | Deterministic validation                                                                  | Maintained evaluation                                                             | Trace and rubric status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------- | --------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.agents/skills/code-walk/SKILL.md`                  | code-walk / hand-authored skill               | `75 514 3216`          | `test/code-walk-skill.test.ts` passed `6/6` on 2026-09-23                                 | none found                                                                        | **Verdict: ready.** Confirmed: focused tests protect concrete minimal code suggestions, no agent edits, full-explanation handling, concise action descriptions, and file-link presentation. Inferred runtime-context drivers: the delegated per-step teaching loop, repeated user turns, changed-file reads, and code/explanation output. Recommendation: preserve the shared `teach-by-doing` delegation and minimal changed-line excerpts; these bound duplicated protocol and output context while retaining learner-controlled edits and verification. Coverage limitation: no maintained behavioral suite or usage telemetry is available.                                                                                                                                                                                                                                                                           |
| `.agents/skills/hone-the-plan/SKILL.md`              | hone-the-plan / hand-authored skill           | `22 323 2161`          | `test/plan-checker-skill.test.ts` passed `7/7` on 2026-09-23                              | none found                                                                        | **Verdict: ready with follow-ups.** Confirmed: focused tests protect delegation to plan-checker, autopilot mode, bounded repair, complete reporting, and non-implementation boundaries. Inferred runtime-context drivers: explicit plan selection, required plan edits, per-step concrete rewrites, rechecks for up to two cycles, and the complete final report. Recommendation: retain delegation instead of duplicating the checker rubric and the two-cycle cap; evaluate whether the illustrative rewrite can be shortened only against focused and maintained behavioral evidence, preserving required `Check:`, assumptions, repair, and `unverified:` output contracts. Coverage limitation: no maintained hone-the-plan behavioral suite or runtime telemetry is available.                                                                                                                                      |
| `.agents/skills/plan-checker/SKILL.md`               | plan-checker / hand-authored skill            | `135 1455 9980`        | `test/plan-checker-skill.test.ts` passed `7/7` on 2026-09-23                              | `evals/plan-checker` passed `6/6`, aggregate `1.00`                               | **Verdict: ready with follow-ups.** Confirmed: deterministic coverage protects target selection, readiness/evidence rules, risk screening, bounded repair, mode separation, and fingerprint semantics; observed: maintained scenarios pass coherent-plan, contradiction, executable-plan, ambiguity, hone, and bounded-evidence behaviors. Inferred runtime-context drivers: full-plan rubric traversal, executable-plan field-by-field checks, interactive decision turns, report detail, and `hone-the-plan` discovery plus up to two repair cycles. Recommendation: bound runtime context by retaining the two-cycle maximum and required concise structured record; evaluate report-section consolidation only against the maintained suite, preserving evidence labels, per-step missing-check findings, unresolved-decision routing, and read-only implementation boundaries.                                       |
| `.agents/skills/plan-executor/SKILL.md`              | plan-executor / hand-authored skill           | `82 1628 10678`        | `test/plan-executor-skill.test.ts` passed `6/6` on 2026-09-23                             | `evals/plan-executor` passed `3/3`, aggregate `1.00`; User Test gate passed `3/3` | **Verdict: ready with follow-ups.** Confirmed: trigger, execution safety, evidence, and output boundaries are covered by deterministic tests; observed: the maintained Waza suite passes core admission, User Test, and Git-mutation scenarios. Inferred runtime-context drivers: mandatory plan/state/dependency reads, per-step fingerprint checks, Git-state checks for Git-dependent claims, interactive user checkpoints, and detailed protocol text. Recommendation: retain the immediate no-tool User Test response because it bounds discovery at a supplied checkpoint; defer adapter/shared-protocol consolidation to Phase 3, preserving plan admission, evidence, and Git-safety behavior.                                                                                                                                                                                                                    |
| `.agents/skills/plan-it-out/SKILL.md`                | plan-it-out / hand-authored skill             | `61 461 2954`          | `npm run lint:markdown` passed on 2026-09-23                                              | none found                                                                        | **Verdict: ready with follow-ups.** Confirmed: Markdown validation passes; direct review defines fixed interactive/session-only scope, phased clarification and confirmation, and a complete self-contained handoff. Inferred runtime-context drivers: prerequisite discovery, outline and per-phase question turns, repeated confirmations, and full-plan output. Recommendation: retain fixed mode/storage and the existing instruction to ask only unresolved questions; this bounds avoidable discovery and storage context while preserving a complete executable handoff. Coverage limitation: no focused deterministic behavioral test, maintained suite, or usage telemetry is available.                                                                                                                                                                                                                         |
| `.agents/skills/remember-that/SKILL.md`              | remember-that / hand-authored skill           | `241 1606 11606`       | `test/remember-that-skill.test.ts` passed `8/8` on 2026-09-23                             | none found                                                                        | **Verdict: ready with follow-ups.** Confirmed: focused tests protect capture-only ctx lookup, silent unavailable-path handling, suggestion-only history, case-by-case clarification, question-tool preference, post-capture evaluation, and forbidden ctx operations. Inferred runtime-context drivers: public/private topic scans, optional history lookups, memory test and evaluation runs, symlink checks, full diffs, and reporting. Recommendation: retain the existing capture-only, at-most-three-result, and silent-skip bounds; evaluate consolidation of post-capture verification only with dedicated behavioral coverage, preserving private-storage separation, untrusted-context handling, and user-visible diffs. Coverage limitation: no maintained behavioral suite or usage telemetry is available.                                                                                                    |
| `.agents/skills/skill-forge/SKILL.md`                | skill-forge / hand-authored skill             | `176 1338 8619`        | `test/skill-forge-skill.test.ts` passed `1/1` on 2026-09-23                               | none found                                                                        | **Verdict: ready with follow-ups.** Confirmed: the focused test protects structured-question routing and planning-to-implementation handoff consideration. Direct review found a stray `the user's answers.` sentence fragment that interrupts the frontier rule. Inferred runtime-context drivers: existing-skill and repository-constraint reads, multi-round frontier questions, environment fact-finding, full repository validation, and repeated before/after scenario revisions. Recommendation: repair the fragment and bound verification-loop retries when behavioral coverage supports it; these reduce ambiguity and unbounded runtime context while preserving dependency-ordered user decisions, agent-handoff scoping, and observable behavior validation. Coverage limitation: the focused test covers only question and handoff wording; no maintained behavioral suite or usage telemetry is available. |
| `.agents/skills/teach-by-doing/SKILL.md`             | teach-by-doing / hand-authored skill          | `78 614 3769`          | `test/code-walk-skill.test.ts` passed `6/6` on 2026-09-23                                 | none found                                                                        | **Verdict: ready.** Confirmed: focused tests protect full-explanation handling, concise action descriptions, file-link presentation, and description limits. Inferred across all 11 dimensions: runtime context is driven by the one-step user turn, exact action explanation, read-only verification, and repeat-until-complete loop; the explicit stop/wait and no-edit boundaries bound that context while preserving learner ownership and correctness checks. Recommendation: intentional non-change; retain the bounded step loop and read-only verification. Coverage limitation: no maintained behavioral suite or usage telemetry is available.                                                                                                                                                                                                                                                                  |
| `sources/executable-planning/skill.json`             | executable-planning / manifest source         | `50 91 1018`           | `test/manifests.test.ts`; `test/executable-planning-skill.test.ts`; `npm run check:drift` | `evals/executable-planning`                                                       | **Verdict: ready with evaluator limitation.** Deterministic ownership, contract, drift, and full mechanical checks pass. The post-repair Waza aggregate is unavailable because the embedded tool adapter rejected the generated `apply_patch` argument format and timed out; no behavioral preservation claim is made from that run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `sources/executable-planning/executable-planning.md` | executable-planning / selected content source | `238 4043 26734`       | `test/executable-planning-skill.test.ts`; `npm run check:drift`                           | `evals/executable-planning`                                                       | **Verdict: ready with evaluator limitation.** The repaired persistence contract, generated drift, and full mechanical validation pass. The post-repair Waza run reached the persistence action before the tool-adapter schema failure and timeout; behavioral preservation remains unverified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `sources/skill-agent-auditor/skill.json`             | skill-agent-auditor / manifest source         | `39 106 1037`          | `test/manifests.test.ts`; `test/skill-agent-auditor-skill.test.ts`; `npm run check:drift` | `evals/skill-agent-auditor`                                                       | **Verdict: ready with evaluator limitation.** Deterministic ownership, contract, drift, and full mechanical checks pass. The post-repair run passed both low-risk trials but showed structural-mismatch variance and hung before completion; the aggregate is unavailable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `sources/skill-agent-auditor/skill-agent-auditor.md` | skill-agent-auditor / selected content source | `52 1081 7471`         | `test/skill-agent-auditor-skill.test.ts`; `npm run check:drift`                           | `evals/skill-agent-auditor`                                                       | **Verdict: ready with evaluator limitation.** Deterministic tests protect the repaired evidence/severity contract and full mechanical checks pass. The post-repair run passed both low-risk trials but showed structural-mismatch variance and hung before completion; behavioral preservation is partially verified, not claimed as an aggregate pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Manifest ownership: `sources/executable-planning/skill.json` selects `executable-planning.md` and generates `.agents/skills/executable-planning/SKILL.md`; `sources/skill-agent-auditor/skill.json` selects `skill-agent-auditor.md` and generates `.agents/skills/skill-agent-auditor/SKILL.md`. Generated outputs remain validation-only targets.
<!-- markdownlint-enable MD060 -->

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

1. [x] **Audit the seven agent instruction files.**
   - Owner: plan executor.
   - Depends on: completed Phase 2 findings and current agent inventory.
   - Action: review each agent file against all 11 rubric dimensions, tracing required discovery, reads, tool calls and output, repeated checks, loops, delegation, user turns, and report verbosity. Record one evidence-backed ledger entry per agent, including maintained evaluation coverage or an explicit limitation.
   - Check: all seven agent files have labeled verdicts, concrete evidence references, runtime-context drivers, and recommendations tied to a named rubric dimension and protected behavior; run `npm run check:customizations` and applicable deterministic tests.
   - Evidence: all seven entries are recorded under Phase 3 Audit Findings. `npm run check:customizations` passed on 2026-09-24; the applicable deterministic suites passed `41/41` tests with `0` failures. Maintained Waza usage telemetry is unavailable for these agents; the covered owned-skill suites and absent agent-specific suites are labeled per artifact.

2. [x] **Self-audit the Plan Executor coding-agent context.**
   - Owner: plan executor.
   - Depends on: Step 1 agent ledger and the existing Plan Executor skill findings.
   - Action: compare always-loaded repository and agent instructions with context induced by plan reads, admission checks, tool calls, validation loops, subagent delegation, user checkpoints, and output contracts. Keep the shared skill and VS Code adapter distinct and do not double-count their guidance.
   - Check: record a distinct Plan Executor self-audit naming avoidable context, retained safety/evidence boundaries, and actionable tightening recommendations; verify the question-mechanism prose matches declared agent permissions.
   - Evidence: the distinct self-audit below separates the adapter's always-loaded contract from the shared skill's induced execution context. The adapter declares `search`, `read`, `edit`, `execute`, `agent`, and `todo`, but does not declare `vscode/askQuestions`; this is a confirmed Phase 4 recommendation, not an implementation change in this audit phase.

3. [x] **Validate and checkpoint Phase 3 findings.**
   - Owner: plan executor.
   - Depends on: Steps 1 and 2.
   - Action: reconcile the seven agent entries and self-audit into the Phase 3 findings section without changing implementation files.
   - Check: Phase 3 validation criteria pass, unavailable telemetry is labeled rather than estimated, and the plan records whether to continue to Phase 4, revise, or pause.
   - Evidence: the seven agent entries, the distinct self-audit, and the explicit telemetry limitations below satisfy the Phase 3 validation criteria. The interactive checkpoint is now awaiting the user's choice to continue, revise, or pause.

### Phase 3 Audit Findings

The seven adapter entries below apply all 11 rubric dimensions. Static size is secondary evidence; runtime-context drivers are bounded qualitative traces because agent-specific usage telemetry and maintained agent Waza suites are unavailable.

1. **`.github/agents/code-walk.agent.md` — Verdict: ready.** Confirmed evidence: the adapter exposes only `search`, `read`, `todo`, and `execute`, requires `code-walk`, prohibits edits, and delegates the step loop to the owned skill; `test/code-walk-skill.test.ts` passed `6/6`. Runtime context is induced by one-step explanations, repeated user turns, changed-file reads, and read-only checks. The output contract is concrete suggestions with file links and concise action descriptions. Recommendation: intentional non-change; retain the narrow read/check permissions and delegation because they bound tool output and preserve learner-controlled edits, verification, trigger accuracy, and safety. No agent-specific evaluation or usage telemetry exists.

2. **`.github/agents/executable-planner.agent.md` — Verdict: ready with follow-up.** Confirmed evidence: the adapter requires `executable-planning`, permits question routing, read-only discovery, delegation, plan edits, and todo tracking, and hands off implementation through a native transition; `test/executable-planning-skill.test.ts` passed its applicable assertions and `npm run check:customizations` passed. Runtime context is induced by plan discovery, unresolved-question turns, Plan Scout and Plan Checker delegation, plan persistence, and full handoff output. Redundancy is limited because the adapter maps abstract mechanisms rather than duplicating the skill rubric. Recommendation: preserve the adapter/skill split; in Phase 4 consider shortening repeated mechanism prose only if the handoff still exposes question routing, checker ownership, persistence boundary, and no-implementation scope. No agent-specific telemetry exists.

3. **`.github/agents/plan-checker.agent.md` — Verdict: ready.** Confirmed evidence: the adapter has only `read` and `edit`, requires the shared `plan-checker` skill, limits review to the canonical plan and planning metadata, and forbids implementation edits; `test/plan-checker-skill.test.ts` passed `7/7` and the maintained Waza suite passed `6/6` at aggregate `1.00`. Runtime context is induced by complete-plan reads, field-by-field rubric traversal, bounded repair edits, and the structured final report. The safety and output contracts are explicit and avoid delegation duplication. Recommendation: intentional non-change; preserve the read/edit boundary, checker-owned verdict, and bounded repair protocol. Agent-specific telemetry is unavailable; Waza evidence belongs to the owned skill behavior.

4. **`.github/agents/plan-executor.agent.md` — Verdict: ready with follow-up.** Confirmed evidence: the adapter requires `plan-executor`, exposes execution and delegation tools, repeats the immediate User Test precedence and Git-mutation rules, and requires admission/freshness checks; `test/plan-executor-skill.test.ts` passed `6/6`, the maintained Waza suite passed `3/3` at aggregate `1.00`, and `npm run check:customizations` passed. Runtime context is induced by mandatory plan/state/dependency reads, checker admission, per-step edits and checks, Git resync for Git-dependent claims, user checkpoints, and final archive verification. The main confirmed interaction-routing gap is that prose names `vscode_askQuestions` but frontmatter omits `vscode/askQuestions`. Recommendation: Phase 4 should add that permission and a parsed-frontmatter assertion; retain the detailed safety/evidence contracts, while evaluating adapter prose consolidation against the maintained scenarios. No separate agent telemetry exists.

5. **`.github/agents/plan-scout.agent.md` — Verdict: ready.** Confirmed evidence: the adapter exposes only `search` and `read`, requires narrow read-only discovery, prohibits edits, execution, and planning, and specifies a compact five-section report. Runtime context is bounded by the single narrow question, relevant-file selection, under-400-word target, and omission of unrelated findings. The output contract and safety boundary are stronger than a generic discovery prompt. Recommendation: intentional non-change; preserve the narrow permissions and compact report because they reduce delegation output and prevent scope expansion. No deterministic agent-specific suite, maintained Waza suite, or usage telemetry exists.

6. **`.github/agents/remember-that.agent.md` — Verdict: ready with follow-up.** Confirmed evidence: the adapter requires `remember-that`, permits search/read/edit/execute for private-memory operations, forbids writes to this repository and global instructions, and requires tests plus a unified diff; `test/remember-that-skill.test.ts` passed `8/8`. Runtime context is induced by public/private topic scans, optional capture-only history lookup, memory test execution, and diff reporting. The output contract protects private storage, suggestion-only context, and verification. Recommendation: preserve the private-storage boundary and capture-only lookup; Phase 4 may evaluate whether the adapter's repeated memory-operation summary can be shortened without weakening the owned skill's routing, test, or diff requirements. No agent-specific telemetry exists.

7. **`.github/agents/teach-by-doing.agent.md` — Verdict: ready.** Confirmed evidence: the adapter requires `teach-by-doing`, allows only `search`, `read`, and `todo`, and prohibits performing the user's steps; `test/code-walk-skill.test.ts` passed `6/6` for the shared teaching surface. Runtime context is induced by one-step explanations, a user wait, read-only verification, and repeat-until-complete turns. The output contract and stopping boundary are explicit and concise. Recommendation: intentional non-change; retain the minimal permission set and user-owned step loop because they bound tool output and preserve correctness, trigger accuracy, and learner agency. No agent-specific evaluation or usage telemetry exists.

### Plan Executor Coding-Agent Self-Audit

- **Always-loaded context:** `AGENTS.md` supplies universal evidence, minimal-change, read-before-action, read-only Git, and skill-loading rules; the Plan Executor adapter supplies the role, tool declarations, required-skill handoff, immediate User Test precedence, plan existence, checker admission/freshness, Git-mutation refusal, mechanism mapping, and archive requirement; the shared `plan-executor` skill supplies the full invariant and workflow contract. The adapter and skill are one behavior surface, but their guidance is not double-counted as two independent runtime workflows.
- **Induced context:** each execution adds canonical-plan and workspace reads, current-state and dependency checks, checker review metadata, per-step edits and command output, possible Plan Scout or Plan Checker delegation, interactive checkpoint turns, Git status/log evidence for Git-dependent claims, and final archive-path verification. These actions are justified by evidence, safety, or user-decision requirements; the avoidable cost is repeated adapter prose that mirrors high-detail skill sections and repeated plan-state narration after evidence is already recorded.
- **Retained boundaries:** do not shorten the plan-existence gate, checker readiness and fingerprint gate, stop-on-blocker behavior, fresh-evidence rule, no-diagnostic-Git-mutation rule, immediate supplied-User-Test response, or archive verification. Removing any of these would trade token savings for correctness or safety risk.
- **Actionable tightening:** in Phase 4, consider a thinner adapter that keeps only role, required skill, tool/agent declarations, the immediate User Test exception, and harness-specific mechanism mappings; move duplicated general protocol text to the shared skill. Add `vscode/askQuestions` to the declared permissions so the documented question mechanism is callable. Preserve explicit adapter text only for behavior that the harness can otherwise miss, especially the User Test precedence and Git-mutation response. Validate any consolidation with the focused tests and the maintained Plan Executor Waza scenarios; no runtime token reduction may be claimed without like-for-like telemetry.

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

1. [x] **Specify the workspace-boundary contract and hook payload boundary.**
   - Owner: plan executor.
   - Depends on: completed Phase 3 findings and user-approved boundary policy.
   - Action: define the exact `AGENTS.md` rule and identify which `PreToolUse` command/tool-input fields the existing hook can inspect without guessing. Treat workspace folders as the default root; external access requires explicit user approval, either in the current request or through an approved plan-named requirement, with a stated path and reason. Optional history/session lookups are prohibited unless requested or required by the active plan.
   - Check: `AGENTS.md` now defines workspace-default access, explicit path-and-reason approval for external access, and no optional history lookup. The existing hook reliably exposes `command`, `cmd`, `script`, and object path fields `path`, `filePath`, `directory`, `cwd`, and `workspaceFolder`; unrecognized payload shapes remain allowed and are outside the enforcement claim.

2. [x] **Approve the exact Phase 5 update list.**
   - Owner: user and plan executor.
   - Depends on: Step 1.
   - Action: present the exact source files, deterministic tests, and hook files to be changed: `AGENTS.md`, `test/documentation.test.ts`, `.github/hooks/deny-non-read-git.js`, `.github/hooks/deny-non-read-git.mts`, `.github/hooks/deny-non-read-git.d.ts`, `.github/hooks/deny-non-read-git.json`, and directly owned hook tests if needed. Keep `ctx` global skill files out of scope unless separately requested.
   - Check: user confirmed implementation on 2026-09-24; implementation began only after that approval. The approved source set was `AGENTS.md`, `test/documentation.test.ts`, `.github/hooks/deny-non-read-git.js`, `.github/hooks/deny-non-read-git.mts`, `.github/hooks/deny-non-read-git.d.ts`, `.github/hooks/deny-non-read-git.json`, and directly owned hook tests; the JSON registration remained unchanged because no registration change was needed.

### Validation

- Ensure each recommended change maps back to an identified issue from the audit.
- Verify the proposed edits preserve required behavior, safety, and repo conventions.
- Confirm the plan executor’s context lessons are reflected in the final recommendation set for other coding agents.
- Confirm the general-instruction recommendation defines both harness-native questioning and the unavailable-mechanism fallback.
- Confirm the general-instruction recommendation states that staged and unstaged differences carry no signal about progress, ownership, approval, completion, conflict, recovery, or desired file state; prohibits Git mutation or attempts to make the index and worktree match based on those differences; and directs agents to working files and fresh checks for current task state.
- Confirm the Plan Executor permission recommendation matches the repository's existing structured-question tool declaration convention.
- Confirm no implementation file is changed before the user explicitly approves the exact Phase 5 update list.
- Confirm the workspace-boundary recommendation distinguishes instruction-level prevention from hook-level enforcement and names the unobservable-tool limitation.
- Confirm external access is not silently permitted merely because a skill, environment variable, or home-directory path exists.

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

1. [x] **Implement the approved workspace-boundary guidance and hook checks.**
   - Check: changed `AGENTS.md`, its deterministic documentation test, the hook implementation and declarations, and the directly owned hook tests. No global `ctx` or home-directory skill files were changed.
   - Outcome: explicit path-bearing fields and command arguments outside the active workspace return `ask`; workspace-relative and workspace-absolute paths remain allowed; unknown payload shapes preserve the existing allow behavior.

2. [x] **Run focused validation.**
   - Check: `npx tsx --test test/deny-non-read-git.test.ts test/documentation.test.ts`, `npm run typecheck`, `npm run lint:markdown`, and `npm run check:customizations`.
   - Outcome: all 25 focused tests passed; typecheck, Markdown lint, and customization checks passed.

3. [x] **Run full repository validation and review the final diff.**
   - Check: `npm run check` must pass; inspect read-only working-file evidence and record any residual evaluator limitations.
   - Outcome: `npm run check` passed with 232 tests, zero failures, formatting, Markdown lint, typecheck, customization checks, and drift checks. The final focused hook/documentation suite passed `25/25`. npm emitted only an `always-auth` deprecation warning.

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

User Test unavailable: the changed instructions are validated through deterministic checks and maintained scenario evaluations where available; no single manual action independently covers the cross-artifact behavior. After final Validation passes, continue to Phase 6 before any closeout or User Test checkpoint.

## Phase 6: Organize Hook Responsibilities and Naming

### Tangible output

The pre-tool safety hook has an accurate public name and clear internal policy boundaries while retaining one registered entrypoint and consistent decision precedence.

### Completion criteria

- The hook family name describes all enforced pre-tool policies rather than only Git mutation checks.
- Git mutation protection, mutating GitHub tool confirmation, and workspace-boundary checks have clear internal ownership and focused tests.
- The hook remains registered as one `PreToolUse` entrypoint; policy splitting does not create competing hook decisions or duplicate bootstrap logic.
- Existing allow/ask behavior is preserved, including the documented limitation for unrecognized payload shapes.
- Focused and full repository validation pass after the refactor.

### Context

- This phase follows the completed Phase 5 implementation and validation.
- Prefer an internal module split plus an entrypoint rename over multiple independently registered hooks.
- Keep the refactor limited to the hook implementation, wrappers/configuration, declarations, and directly owned tests; do not modify global hook copies or home-directory skills.

### Dependencies and risks

- Depends on Phase 5's validated workspace-boundary behavior.
- Risk: renaming the hook can break bootstrap lookup, installed copies, or direct test imports.
- Recovery: preserve compatibility aliases or update every repository-owned reference in one validated change; do not broaden the policy behavior during this refactor.

### Steps

1. [x] **Inventory and lock repository-owned hook references.**
   - Owner: plan executor.
   - Depends on: Phase 5 validation and current hook source.
   - Action: search only the workspace for hook filenames, bootstrap paths, direct imports, wrappers, declarations, and tests. Select `pre-tool-safety` as the canonical public family name and retain `deny-non-read-git` compatibility entrypoints where required by installed-copy or direct-import paths.
   - Check: every repository-owned reference is classified as canonical, updated, or compatibility-only; no home-directory hook copy is edited; the one-entrypoint constraint remains explicit. Passed on 2026-09-24: workspace search found mirrored `.github/hooks` and `.agents/hooks` implementations, wrappers, declarations, bootstrap configs, and one focused test; `test/artifact-arguments.test.ts` references the hook name only as an artifact-selection fixture and remains unrelated. No external path was accessed or edited; both configs retain one `PreToolUse` entrypoint.
   - Recovery: if an external or unobservable reference is required, stop and record it rather than editing outside the workspace.

2. [x] **Split policy ownership behind one orchestrator.**
   - Owner: plan executor.
   - Depends on: Step 1.
   - Action: extract Git/GitHub mutation checks and workspace-boundary checks into focused modules, with `pre-tool-safety` retaining `evaluateToolUse`, CLI input/output handling, and decision precedence. Keep compatibility wrappers thin and behavior-preserving.
   - Check: focused tests cover read-only Git allow, Git mutation ask, mutating GitHub tool ask, workspace-relative and external path decisions, unknown payload allow behavior, and precedence when multiple policies apply. Passed on 2026-09-24: `npx tsx --test test/deny-non-read-git.test.ts` passed `23/23`; canonical and compatibility evaluators returned identical Git-mutation decisions.
   - Recovery: if extraction changes a decision or command parser behavior, revert the local refactor through edits and repair only the affected module before proceeding.

3. [x] **Update repository-owned registration, declarations, and tests.**
   - Owner: plan executor.
   - Depends on: Step 2.
   - Action: update the canonical hook config, `.mts` and shell wrappers, declarations, direct imports, and test organization to use the new family name while preserving legacy compatibility paths.
   - Check: workspace search finds no unintended stale canonical references; both canonical and compatibility entrypoints resolve to the same orchestrator; no duplicate `PreToolUse` registration is introduced. Passed on 2026-09-24: both mirrored hook trees target `pre-tool-safety.mts`, legacy wrappers remain compatibility-only, and focused tests verified one `PreToolUse` registration per config.
   - Recovery: restore compatibility wrappers or update the affected repository-owned reference; do not modify global installed copies.

4. [x] **Run focused and full validation.**
   - Owner: plan executor.
   - Depends on: Steps 1-3.
   - Action: run focused hook tests first, then repository validation.
   - Check: focused hook tests pass; `npm run typecheck`, `npm run lint:markdown`, `npm run check:customizations`, and `npm run check` all exit zero. Record any non-failing npm warnings separately. Passed on 2026-09-24: focused tests passed `23/23`; `npm run typecheck`, `npm run lint:markdown`, `npm run check:customizations`, and `npm run check` passed; full check reported `234` tests, `0` failures, `6` suites. npm emitted only the existing `always-auth` warning.
   - Recovery: stop on the first failing check, record its output in this plan, and repair only the implicated Phase 6 slice.

### Validation

- Verify all repository-owned hook references and bootstrap paths use the selected name.
- Run focused policy and orchestration tests before broader checks.
- Run `npm run typecheck`, `npm run lint:markdown`, `npm run check:customizations`, and `npm run check`.
- Confirm no user test is required for the refactor; if a User Test is later defined, place it after this phase's validation.

### Checkpoint

User Test unavailable unless the refactor produces a separately documented interactive action. After validation passes, use the structured question mechanism to ask whether to close and archive the plan, revise, pause, or perform any defined User Test.

## Phase 7: Enforce Efficient Tool Output and Format-First Validation

### Tangible output

Shared agent guidance and execution-specific instructions explicitly minimize unnecessary tool output and establish auto-format-before-format-repair behavior, with deterministic tests proving both rules are discoverable and unambiguous.

### Completion criteria

- The repository-wide instruction source states that agents should filter command output or report only the needed result by default, while permitting full output when diagnosis, interpretation, decisions, or audit evidence require it.
- The execution protocol used by planning and coding agents contains the same bounded output rule without requiring a specific shell, IDE, or harness.
- The repository-wide instruction source states that an available project auto-format command is run after changes before remaining format issues are addressed.
- The execution protocol makes clear that format-only issues are deferred to the auto-format command when one exists, and only residual diagnostics are manually handled afterward.
- Deterministic tests protect the wording or parsed instruction contract, and the repository's actual format command is used as the first formatting validation after the edits.
- The update does not require agents to suppress diagnostic evidence needed to understand failures or support a completion claim.
- The Executable Planner handoff is labeled as starting the first phase rather than generic implementation, targets `Plan Executor` by name when supported by the handoff schema, and instructs it to elaborate the first phase before execution.

### Context

- The canonical general source is `AGENTS.md`, which is also the target resolved by `CLAUDE.md`.
- The execution-specific source is `.agents/skills/plan-executor/SKILL.md`; inspect `.github/agents/plan-executor.agent.md` and change it only if the harness-facing contract needs a concise reminder beyond the shared rule.
- The existing repository format command is `npm run format`, defined in `package.json`; it runs Biome and Prettier and is already the first stage of `npm run check`.
- Directly owned deterministic coverage belongs in `test/documentation.test.ts` for the shared rule and `test/plan-executor-skill.test.ts` for execution behavior. Do not add a new evaluator merely to restate the policy.
- Handoff coverage belongs in the Executable Planner adapter contract and its applicable customization test; verify the supported frontmatter syntax for a named `Plan Executor` target before editing it, and preserve a fallback or record the schema limitation if named targets are unsupported.

### Dependencies and risks

- Depends on the completed Phase 6 validation and the existing `AGENTS.md` policy conventions.
- Risk: “minimize output” could be interpreted as hiding failure evidence or as requiring lossy output filtering for every command.
- Recovery: preserve the explicit exceptions for diagnosis, interpretation, decisions, and audit evidence; use concise summaries only after the relevant evidence has been captured.
- Risk: auto-format may modify unrelated files or expose pre-existing formatting drift.
- Recovery: run the repository format command in the normal project workflow, inspect its result, and address only residual diagnostics relevant to the current change; record unrelated drift rather than broadening scope.
- If no project auto-format command exists, record that fact as an unavailable check and proceed with the repository's remaining applicable validation without inventing a formatter.

### Steps

- [x] P7.S1: Keep the repository-wide bounded tool-output and format-first rules in `AGENTS.md`, preserving full-output exceptions for diagnosis, interpretation, decisions, and evidence. Files: `AGENTS.md`, with `test/documentation.test.ts` as directly owned coverage. Check: the documentation test asserts both rules, their exceptions, and the no-formatter fallback; the Plan Executor skill remains free of duplicate policy text. Outcome: `npm run format` exited 0 with no file changes; it reported one unrelated warning in `.github/hooks/deny-non-read-git.js:72`. Focused tests passed `13/13` before the duplicate was removed; the focused regression test is rerun in P7.S3. Depends: none. Tier: standard.
- [x] P7.S2: Replace the Executable Planner's generic implementation handoff with a first-phase handoff targeting `Plan Executor` when supported, and add a parsed-frontmatter assertion for its label, target, and prompt. Files: `.github/agents/executable-planner.agent.md`, `test/check-customizations.test.ts`. Check: `npm run check:customizations` proves phase start, named target when supported, and elaboration-before-execution, or records the schema limitation and fallback. Outcome: named `agent: Plan Executor` syntax was accepted by the repository frontmatter contract; the handoff now uses label `Start First Phase` and prompts elaboration plus confirmation. `npm run format` exited 0 with no file changes and reported two warnings; `npm run check:customizations` passed. Depends: P7.S1. Tier: deep.
- [x] P7.S3: Run the repository formatter immediately after the edits, resolve only remaining diagnostics, and run focused validation. Files: changed files from P7.S1-P7.S2. Check: run `npm run format` first, then `npx tsx --test test/documentation.test.ts test/plan-executor-skill.test.ts`, `npm run check:customizations`, and the focused Markdown lint; record formatter output or the no-formatter fallback. Outcome: `npm run format` exited 0 and rewrote already-touched files; it reported an npm deprecated `always-auth` config warning and one Biome lint warning. Focused tests passed `13/13`, `npm run check:customizations` passed, and focused plan Markdown lint passed. Depends: P7.S1, P7.S2. Tier: light.
- [x] P7.S4: Run complete repository validation and reconcile Phase 7 completion criteria before the interactive checkpoint. Action: compare each completion criterion with fresh validation evidence, record warnings, formatting changes, unavailable checks, and residual evaluator limitations in this plan, then prepare the checkpoint decision. Files: validation outputs and this plan. Check: `npm run check` passes and every Phase 7 criterion has a recorded disposition. Outcome: `npm run check` passed all `237` checks with `0` failures; three unknown npm `always-auth` config warnings remain. Phase 7 criteria are satisfied: shared policy is single-sourced in `AGENTS.md`, the handoff targets `Plan Executor` with phase-oriented copy, formatter-first validation ran, focused checks passed, and full validation passed. Depends: P7.S3. Tier: standard.

### Validation

- Confirm the changed instruction sources contain both rules with the required exceptions and no harness-specific command requirement.
- Run `npx tsx --test test/documentation.test.ts test/plan-executor-skill.test.ts` as the smallest deterministic coverage for the shared documentation and Plan Executor execution contract.
- Run `npm run format` immediately after the instruction edits when it exists, then run the focused checks and address only diagnostics that remain after formatting; when it does not exist, record the unavailable check and continue with the remaining validation.
- Run the applicable repository validation, including `npm run check`, and record whether formatting changed files or surfaced unrelated drift.
- Review the final instruction-size and runtime-context impact: output minimization should bound captured tool context, while format-first ordering should reduce manual format-repair loops without suppressing failure evidence.

### Checkpoint

User Test unavailable: these are agent-execution policies whose evidence is deterministic instruction coverage and repository validation, not an independent end-user workflow. After Validation passes, use the structured question mechanism to ask whether to close and archive the plan, revise, pause, or define a separate User Test.

## Phase 8: Permit Scoped Read-Only Diagnostic Resources

### Tangible output

The workspace-boundary policy and its hook tests distinguish approved read-only diagnostic resources from unrelated external paths: `/tmp/*` and narrowly identified VS Code-owned Application Support or equivalent session-resource roots are readable without confirmation, while external writes and unapproved paths remain confirmation-gated.

### Completion criteria

- The approved path set is explicit and limited to `/tmp/*` plus the exact VS Code-owned Application Support or equivalent roots needed for session diagnostics; the entire home directory and unrelated Application Support data remain outside the allowlist.
- Read-only commands such as `grep`, `cat`, and `sed` can inspect approved resources without confirmation when their command shape is identifiable.
- Existing symlinks resolving into the workspace are allowed for reads; symlinks resolving outside approved roots, broken symlinks, and ambiguous link targets ask for confirmation.
- The identified `~/.memory/<skill-name>/SKILL.md` memory skill files are readable by all agents through supported read tools and read-only shell commands; this does not grant writes or access to a root-level `/memories` path.
- Writes, mutating Git/GitHub operations, unapproved external paths, and ambiguous or unrecognized payloads retain their existing safety behavior.
- Directly owned deterministic hook tests cover approved paths, sibling or unrelated external paths, read-only command examples, write attempts, and path-boundary traversal cases.
- Full repository validation passes, and the plan records any platform-specific path variants or limitations instead of broadening the allowlist by assumption.
- The final Phase 8 step audits `AGENTS.md`, the relevant agent guidance, and `.agents/skills/remember-that/SKILL.md` to confirm that every agent resolves memory skills under `~/.memory/<skill-name>/SKILL.md`, reads them without unnecessary confirmation, and does not construct root-level `/memories/...` paths.
- The planner exposes exactly three distinct handoffs: `Execute 💀` -> `Plan Executor` with an approved-phase execution prompt; `Elaborate 💬` -> `Executable Planner` with a current-phase elaboration prompt; and `Complete ✅` -> `Plan Executor` with a no-steps-remain, final-validation, and archive-gated completion prompt.
- Manual-test checkpoints offer a structured pass choice or a free-text issue path, and neither path is treated as complete until the response is persisted as evidence and evaluated against the phase criteria.
- Safety decisions are explicit: approved identifiable read-only resources allow; unrelated external reads ask; external writes ask; Git/GitHub mutations ask; ambiguous commands with external paths ask; and unrecognized payload shapes continue to allow under the existing fail-open limitation.

### Context

- The current hook resolves every identifiable path against the active workspace and asks for confirmation when it is outside; this correctly protects external paths but blocks VS Code-owned session artifacts.
- The current path check uses lexical resolution and does not follow symlinks before comparing the path with the workspace root; this causes workspace-targeting symlink aliases such as `~/.copilot/skills/minimal-changes-notes/SKILL.md` to be classified by their link location instead of their target.
- The concrete diagnostic example is under `~/Library/Application Support/Code/User/workspaceStorage/**/chat-session-resources/**` on macOS. The implementation must verify whether stable, Insiders, or equivalent VS Code-owned roots require separate explicit patterns.
- `/tmp/*` is a temporary diagnostic workspace, not a general external filesystem grant; read-only access is the intended exception.
- The current handoff label `Start First Phase` is phase-specific and must be replaced by the three exact transitions above; prompts must use current-plan state rather than naming Phase 7 or Phase 8.
- The screenshot path `/memories/repo/skill-invocation-paradigm.md` does not match the actual memory-skill layout and should be treated as hallucinated or malformed. A valid memory resource follows `~/.memory/<skill-name>/SKILL.md`, for example `~/.memory/git-workflow-notes/SKILL.md`. P8.S1 must verify the supported read-tool path contract before allowing reads.

### Dependencies and risks

- Depends on completed Phase 7 validation and the existing workspace hook module/test boundaries.
- Risk: a broad Application Support or home-directory exception could expose unrelated user data.
- Recovery: use explicit product-owned path patterns, test near-miss paths, and fail closed for paths that cannot be classified.
- Risk: command parsing may not prove that a shell command is read-only when wrappers or substitutions obscure its behavior.
- Recovery: allow only identifiable read-only command shapes; retain confirmation for ambiguous payloads and document the limitation.
- Risk: following symlinks or trusting virtual namespaces too broadly could expose unrelated home-directory data.
- Recovery: resolve existing link targets, keep broken or ambiguous links confirmation-gated, allow `~/.memory/<skill-name>/SKILL.md` files as read-only resources for all agents, reject root-level `/memories/...` and non-skill memory paths, and test near-miss paths through supported read tools and shell payloads.

### Steps

- [ ] P8.S1: Inventory the exact approved `/tmp`, VS Code-owned session-resource, workspace-targeting symlink, and shared `~/.memory/<skill-name>/SKILL.md` path patterns and define the read-only boundary. Action: inspect the existing path-policy modules and tests, identify supported read-tool payloads, verify the memory skill path contract, and record the approved and negative path categories. Owner: the executing agent. Files: `.github/hooks/pre-tool-safety-workspace.js`, `.github/hooks/pre-tool-safety-git.js`, `.github/hooks/pre-tool-safety.js`, `test/deny-non-read-git.test.ts`, and this plan. Check: record a path matrix under the Phase 8 Evidence subsection, distinguishing lexical paths from resolved symlink targets, valid `~/.memory/<skill-name>/SKILL.md` resources readable by all agents from malformed root-level `/memories/...` and non-skill paths, allowed roots, near-miss external roots, and write or ambiguous cases. Depends: P7. Tier: standard.
- [ ] P8.S2: Implement the narrow path-policy exception and deterministic tests for the supplied `grep` example plus equivalent `cat` and `sed` reads, workspace-targeting symlinks, and the shared `~/.memory/<skill-name>/SKILL.md` resource. Action: update only the owning workspace-policy modules and directly owned hook tests, preserving existing Git/GitHub and unknown-payload behavior. Owner: the executing agent. Files: `.github/hooks/pre-tool-safety-workspace.js`, `.github/hooks/pre-tool-safety.js`, and `test/deny-non-read-git.test.ts`. Check: focused hook tests prove approved identifiable reads allow; workspace-targeting symlink reads and valid `~/.memory/<skill-name>/SKILL.md` reads through supported tools allow; malformed root-level `/memories/...` reads, unrelated external reads, external writes, Git/GitHub mutations, broken or external symlinks, non-skill memory paths, and ambiguous external-path commands ask; unrecognized payload shapes retain the existing allow behavior. Depends: P8.S1. Tier: deep.
- [ ] P8.S3: Replace the single phase-specific planner handoff with visually distinct `Execute 💀`, `Elaborate 💬`, and `Complete ✅` handoffs, verify their targets and prompts, and remove the old `Start` handoff. Action: update the agent frontmatter and its parsed customization fixture; `Execute 💀` -> `Plan Executor` executes only an approved ready phase, `Elaborate 💬` -> `Executable Planner` elaborates or clarifies the current phase and requests confirmation, and `Complete ✅` -> `Plan Executor` marks complete and archives only when no steps remain and final validation passes. Owner: the executing agent. Files: `.github/agents/executable-planner.agent.md`, `test/check-customizations.test.ts`, and this plan. Check: parsed frontmatter proves all three exact labels, targets, phase-aware prompts, and completion/archive gating; the customization test confirms their distinct semantics and absence of `Start`. Depends: P8.S2. Tier: standard.
- [ ] P8.S4: Define the manual-test question contract for phase checkpoints. Action: update the execution guidance and directly owned tests so the question mechanism offers a pass/confirm option and a free-text option for reporting issues, records either response as evidence, and blocks continuation on contradictory or insufficient observations. Owner: the executing agent. Files: `AGENTS.md`, `.agents/skills/plan-executor/SKILL.md`, `.github/agents/plan-executor.agent.md`, `test/documentation.test.ts`, and `test/plan-executor-skill.test.ts`. Check: deterministic assertions prove the two response paths, persisted evidence recording before continuation, and no expected-result coaching. Depends: P8.S3. Tier: standard.
- [ ] P8.S5: Run `npm run format` first, then focused hook/documentation tests, customization validation, Markdown lint, and full repository validation. Action: execute the listed checks in order and record formatter changes, warnings, platform-specific limitations, the final safety matrix, and handoff/manual-test evidence. Owner: the executing agent. Files: changed hook sources, agents, guidance, tests, and this plan. Check: run `npx tsx --test test/deny-non-read-git.test.ts test/documentation.test.ts test/plan-executor-skill.test.ts`, `npm run check:customizations`, `npm run lint:markdown -- --no-globs docs/plans/2026-09-19-skill-agent-audit-token-optimization.md`, and `npm run check`; all pass. Depends: P8.S4. Tier: light.
- [ ] P8.S6: Perform the final memory-path guidance audit. Action: inspect `AGENTS.md`, `.github/agents/plan-executor.agent.md`, `.github/agents/executable-planner.agent.md`, and `.agents/skills/remember-that/SKILL.md`; correct any guidance that invents `/memories/...`, omits the `~/.memory/<skill-name>/SKILL.md` layout, or makes memory reads unavailable to agents, then run the directly owned documentation and skill tests. Owner: the executing agent. Files: the listed guidance sources, `test/documentation.test.ts`, `test/plan-executor-skill.test.ts`, `test/memory-skills.test.ts`, and this plan. Check: direct review plus `npx tsx --test test/documentation.test.ts test/plan-executor-skill.test.ts test/memory-skills.test.ts` confirms the canonical memory path, all-agent read access, and absence of the hallucinated root-level path; if guidance changes, rerun `npm run format` before addressing residual diagnostics. Depends: P8.S5. Tier: standard.

### Evidence

- Pending Phase 8 execution; record the approved path matrix, safety decisions, exact platform variants, and validation outcomes here.

### Validation

- Verify the exact approved path matrix and its negative cases through deterministic hook tests.
- Run the formatter before addressing any remaining format diagnostics.
- Run focused hook tests, `npm run check:customizations`, focused plan Markdown lint, and `npm run check`.

### Checkpoint

When a manual User Test is defined, use the structured question mechanism with `Passed` and `Issues found` options; the issue option must accept free text. Record the selected response and observation before continuation. When no manual test is defined, ask whether to close and archive, revise, or pause.

## Progress Log

- 2026-09-24: P7.S1 scope was corrected to keep bounded tool-output and format-first rules only in `AGENTS.md`; the duplicate Plan Executor skill block and its stale assertions were removed. The shared documentation test remains the policy contract; the focused regression test is rerun in P7.S3.
- 2026-09-24: P7.S2 completed. The Executable Planner handoff now uses label `Start First Phase`, targets `Plan Executor`, and prompts first-phase elaboration followed by confirmation. The parsed frontmatter fixture was updated; `npm run check:customizations` passed. Formatter-first validation exited 0 without file changes and reported two warnings.
- 2026-09-24: P7.S3 completed after the single-source correction. Formatter-first validation exited 0; focused tests passed `13/13`, customization validation passed, and focused plan Markdown lint passed. The Plan Executor skill no longer duplicates the repository-wide policy.
- 2026-09-24: P7.S4 completed. `npm run check` passed all `237` checks with `0` failures; three unknown npm `always-auth` config warnings remain. Phase 7 is complete and awaiting the documented interactive checkpoint decision.
- 2026-09-24: User requested a follow-up phase to permit read-only access to `/tmp/*` and narrowly identified VS Code-owned Application Support or equivalent session-resource files, based on the `grep` diagnostic against a VS Code chat-session resource. Phase 8 was added as an outline; implementation is not started.
- 2026-09-24: User clarified that the planner handoff must be phase-neutral: Phase 8 now requires changing `Start First Phase` to `Start`. The plan also records that multiple handoffs are supported as an option when their targets or prompts represent genuinely distinct transitions.
- 2026-09-24: User clarified that the shared memory root is `~/.memory/**`, readable by all agents. Phase 8 now treats that home-relative root as read-only, requires correcting the malformed root-level `/memories/...` path construction, adds workspace-targeting symlink resolution, and keeps host writes, broken or external links, and ambiguous paths confirmation-gated.
- 2026-09-24: User corrected the memory layout: individual memory skills live at `~/.memory/<skill-name>/SKILL.md`, for example `~/.memory/git-workflow-notes/SKILL.md`. Phase 8 now rejects the hallucinated `/memories/repo/...` form and ends with an audit of `AGENTS.md`, agent guidance, and `remember-that`.
- 2026-09-24: User requested visual planner handoffs (`Execute 💀`, `Elaborate 💬`, `Complete ✅`) and structured manual-test responses offering pass confirmation or free-text issue reporting. Phase 8 now includes those handoff and checkpoint contracts; implementation remains paused pending fresh review.

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
- 2026-09-23: Fresh Plan Checker admission returned `ready` with fingerprint `sha256:7032ae6232aa1fd23db13ca5a51cc4db4865c39c10278bc6ddf6518f839003df`. The teach-by-doing audit then passed its shared focused suite `6/6`; its one-step/read-only loop was assessed `ready` with no remediation, and the hand-authored skill audit step is complete. The remaining Phase 2 work is the manifest-driven source audit.
- 2026-09-24: Repair cycle 1 isolated and addressed two source-contract gaps: explicit repo-backed persistence in executable-planning and explicit coverage evidence/severity classification in skill-agent-auditor. Focused deterministic checks passed after rebuilding generated output. Waza validation exposed an `apply_patch` argument-format adapter failure and an incomplete auditor run with trial variance; no further source edit is justified until those harness results are reproducible and classified.
- 2026-09-24: The bounded recovery completed. `npm run check` passed, focused manifest-skill tests passed `20/20`, `npm run build` and `npm run check:drift` passed, and the plan lints clean. The executable-planning Waza aggregate is unavailable because the embedded adapter rejected the generated `apply_patch` argument and timed out; the auditor aggregate is unavailable because of trial variance and a hung scenario. Both are recorded as evaluator limitations rather than source failures, and Phase 2 is paused at its interactive checkpoint for the user's choice.
- 2026-09-24: User authorized the preventive Waza fixes. `scripts/run-waza.ts` now runs a sandboxed `waza --version` preflight, verifies workspace write access, forwards evaluator output while classifying and stopping on adapter-format or sandbox-denial signatures, and reports actionable diagnostics. Directly owned runner tests pass `5/5`; Biome validation passes. The observed `apply_patch` argument normalization remains outside this repository's ownership and is recorded as an upstream follow-up.
- 2026-09-24: Phase 2 validation passed after the preventive runner changes: `npm run check` passed formatting, Markdown lint, typecheck, all `227` tests, customization checks, and drift checks. Maintained Waza aggregates remain explicitly unavailable evaluator evidence. Phase 2 is now at its interactive checkpoint; no User Test is defined for this evidence-producing phase.
- 2026-09-24: Phase 3 agent audit completed. All seven agent entries and the distinct Plan Executor coding-agent self-audit were recorded with runtime-context traces, protected behavior, recommendations, and explicit telemetry limitations. `npm run check:customizations` passed and the applicable deterministic suites passed `41/41`; `npm run lint:markdown -- --no-globs docs/plans/2026-09-19-skill-agent-audit-token-optimization.md` passed with zero diagnostics. Phase 3 is now at its interactive checkpoint; no User Test is defined for this evidence-producing phase.
- 2026-09-24: User approved the Phase 5 update list. `AGENTS.md` now establishes the workspace boundary and approval rule for external paths, with optional history lookups prohibited unless requested or plan-required. The existing pre-tool hook now asks for confirmation on identifiable external paths in `path`, `filePath`, `directory`, `cwd`, `workspaceFolder`, `command`, `cmd`, and `script` payloads while preserving allow behavior for unrecognized shapes. Focused tests passed `25/25`; typecheck, Markdown lint, and customization validation passed. Full repository validation is pending.
- 2026-09-24: Phase 5 implementation and validation completed. Final `npm run check` passed with `232` tests and zero failures, and the final focused hook/documentation suite passed `25/25`. The plan is at its interactive closeout checkpoint; no plan archive move has been made yet.
- 2026-09-24: User requested a final hook-organization phase before any closeout or User Test. Phase 6 now covers renaming the hook family, separating internal policy ownership, preserving one `PreToolUse` entrypoint, and revalidating all behavior. No Phase 6 implementation has started.
- 2026-09-24: Plan Checker reviewed the Phase 6 outline and returned `not-ready` because executable steps and focused checks were missing. Phase 6 was elaborated with the proposed `pre-tool-safety` name, legacy compatibility wrappers, one-orchestrator constraint, policy-precedence coverage, workspace-only reference inventory, and ordered validation. Implementation remains paused pending confirmation of these steps.
- 2026-09-24: User continued the plan, satisfying interactive confirmation for the elaborated Phase 6. Workspace-only inventory found mirrored hook trees and compatibility references; no external files were accessed or edited.
- 2026-09-24: Phase 6 implementation completed: `pre-tool-safety` orchestrators now own CLI handling and precedence, Git/GitHub and workspace policies have focused module boundaries, legacy `deny-non-read-git` entrypoints remain behavior-preserving, and both configs retain one `PreToolUse` registration.
- 2026-09-24: Phase 6 validation passed: focused hook tests `23/23`, TypeScript validation, Markdown lint, customization checks, and full repository check `234/234` with zero failures. The only warning was npm's existing `always-auth` deprecation notice. Awaiting interactive closeout decision before archiving the plan.
- 2026-09-24: User requested two additional always-follow execution rules: minimize tool output by default while retaining full output when interpretation or evidence requires it, and run an available project auto-format command after changes before addressing remaining format issues. Phase 7 was added to update shared and execution-specific guidance, add deterministic coverage, run `npm run format` first, and then validate residual diagnostics before closeout.
- 2026-09-24: Independent Plan Checker reviewed the amended plan and returned `not-ready`: the prior readiness metadata is stale after the semantic Phase 7 amendment, and Phase 7 is intentionally not yet elaborated with executable steps. Its non-blocking outline warnings were resolved by naming `AGENTS.md`, `.agents/skills/plan-executor/SKILL.md`, the conditional adapter scope, the two deterministic test files, and the no-format-command fallback. Handoff remains blocked until the user starts Phase 7 and its steps are elaborated and reviewed.
- 2026-09-24: User requested a more appropriate planner handoff because the current button says “Start Implementation” and targets a generic agent. Phase 7 now also requires a phase-start handoff labeled for the first phase, targeting `Plan Executor` by name when supported, with a prompt to elaborate the first phase before execution; schema support must be verified and any limitation recorded.
