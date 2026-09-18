---
name: plan-executor
description: Executes implementation plans with step verification and tracking
---

# Plan Executor

## Invariants

Every repo-backed plan starts with YAML frontmatter containing the required plan metadata and current-state fields. When creating or modifying the plan, preserve the frontmatter and update it whenever status, mode, canonical path, current phase, current step, next action, or blockers change; do not keep those values only in the Markdown body.

These hold in every mode and override anything below.

- **One canonical plan.** Maintain status, evidence, decisions, and blockers directly in the canonical plan artifact. Update it after every material event: step completion, check result, blocker, or scope change. If the plan is held only in conversation, first write it to a file (e.g., `docs/plans/<slug>.md`) and treat that file as the canonical artifact for all subsequent updates.
- **Plan existence gate.** Never start execution without a canonical plan artifact or a valid in-session plan. If the plan is missing, incomplete, or malformed, stop immediately and request the missing plan or the corrected artifact before making any code changes.
- **Plan-checker admission gate.** Before the first implementation write, determine whether the plan-checker's authoritative risk triggers apply. If they do, require a completed `plan-checker` review record with verdict `ready`; a `not-ready` verdict blocks execution, and an unavailable checker or `unchecked` verdict also blocks execution because readiness was not established. Do not duplicate the checker rubric in the executor.
- A blocked admission must explicitly state that execution requires a fresh `ready` verdict and a matching content fingerprint from `plan-checker` before any implementation write.
- **Freshness gate.** Before each implementation step and after any semantic plan edit, recompute the normalized plan fingerprint and compare it with the admitted review record. Lifecycle-only updates excluded by the checker may proceed; any semantic change invalidates the prior verdict and requires a new review before implementation continues.
- **Evidence before assertion.** Treat fresh execution output as the sole evidence for claims about repository state or step completion. Do not claim success or a passing step without running the specified check.
- **Stop on blocker.** Halt execution immediately if a check fails, an assumption is contradicted, or instructions are ambiguous. Do not guess fixes or force changes past failing verification.
- **Tool-agnostic execution.** Plans describe actions, commands, and checks without hardcoding harness UI or specific tool names.

## Harness Mechanisms

This skill names four abstract mechanisms; the executing agent maps them to concrete tools.

- **Execution mechanism**: the harness's command runner or terminal tool used to run build, test, and verification checks.
- **Persistence mechanism**: the file editing tool used to modify project code and update the canonical plan file.
- **Question mechanism**: the harness's structured prompt or conversation channel to raise blockers or request clarification.
- **Subagent mechanism**: read-only discovery agents (such as Plan Scout) used to inspect state without mutating context.

## Workflow

### 1. Ingest and Sanity-Check

Inspect the canonical plan and current workspace state before changing any code.

1. Read the plan document (e.g., under `docs/plans/` or held in conversation).
2. Confirm the plan is the canonical, usable artifact: it exists and contains the required state (phases with tangible outputs and completion criteria, at minimum). A phase's detailed steps are not required at this point; they may be elaborated just-in-time per step 2 below. If no valid plan exists or the plan is malformed, stop and request the missing or corrected plan before any code changes.
3. Verify git branch and workspace state against the plan's prerequisite context.
4. Confirm that dependencies, referenced files, and initial assumptions match reality.
5. If discrepancies or unresolvable gaps exist, raise a blocker before executing any steps.
6. Run the plan-checker admission gate before any implementation write. Record the checker verdict and matching fingerprint in the execution context; stop on `not-ready`, `unchecked`, missing review metadata, or fingerprint mismatch.

### 2. Elaborate Phase Steps Just-in-Time

A plan may arrive as a table of contents of phases with no steps, or with steps only for phases already completed. Elaborate a phase's detailed steps immediately before that phase begins, never earlier, folding in everything completed, validated, and decided in prior phases.

- **Interactive**: Present the elaborated steps for that phase and update the canonical plan with them, then pause for explicit user confirmation before executing any of them.
- **Autopilot**: Elaborate the phase's steps automatically, verify they satisfy the phase's completion criteria, and proceed without a blocking pause.

If a phase's steps are already elaborated and recorded in the plan, skip elaboration and proceed directly to executing them.

### 3. Step Execution Loop

Execute the current phase's elaborated steps one at a time in the order listed. A step is executable only if it specifies both an action and a check; if a step lacks either, raise a blocker via the question mechanism instead of guessing. If the plan already contains steps marked `[x]`, verify their recorded evidence is present and resume from the first incomplete step; do not re-execute completed steps unless their check is re-run and fails.

1. **Mark in-progress**: Update the canonical plan to reflect the active step.
2. **Recheck freshness**: Recompute the normalized plan fingerprint. If it differs from the admitted review record, stop and require the plan-checker to review the changed plan before any implementation write.
3. **Perform action**: Apply the code, configuration, or file changes specified for the step.
4. **Run check**: Execute the exact check command or verification procedure given in the step. If a step specifies no check, treat this as a plan defect: halt and raise a blocker requesting a verification procedure; do not invent one or mark the step complete.
5. **Evaluate outcome**:
   - **Pass**: Record the evidence in the plan, mark the step completed (`[x]`), and proceed to the next step.
   - **Fail**: Halt immediately. Record the failure output and error state in the plan, and present the blocker.

### 4. Phase Checkpoints

Maintain phase boundaries according to execution mode. The execution mode is set by the plan's `mode:` field or by explicit user instruction; if neither specifies a mode, default to Interactive.

- **Interactive**: Upon completing a phase, update the plan and present the phase outputs and verification evidence. When the checkpoint defines a User Test, stop and ask the user to perform its documented action and provide the requested free-text observation. Do not state an expected result or accept a bare confirmation as the preferred evidence. Record the response as user-provided evidence, compare it with the completion criteria, and raise a blocker or clarification question when the observation is contradictory or insufficient. Only after resolving the User Test may the executor ask for confirmation before starting the next phase (and, per step 2, before elaborating its steps). When User Test is unavailable, preserve its documented rationale and use the normal confirmation checkpoint.
- **Autopilot**: Update the plan at phase boundaries and proceed automatically to elaborating and executing the next phase as long as all step checks pass without blockers. Do not stop for a User Test or request user evidence.

### 5. Final Verification and Handoff

When all plan phases and steps are complete:

1. Run the repository's full verification suite (e.g., tests, type checks, linter). If the full suite fails, record the failing output in the plan, do not present a completion summary, and raise a blocker identifying which steps are most likely implicated.
2. Record final verification evidence in the canonical plan.
3. For a completed repo-backed plan, immediately move the canonical plan to its archive location before presenting a completion summary. Archive only when the archive path exists and the active path does not; verify both paths. Do not recreate or edit the active-path file after relocation.
4. Present a summary of completed changes, verified evidence, and handoff instructions.
