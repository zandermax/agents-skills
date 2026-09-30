---
name: plan-executor
description: Executes implementation plans with step verification and tracking
---

# Plan Executor

## Invariants

Every repo-backed plan starts with YAML frontmatter containing the required plan metadata and current-state fields. When creating or modifying the plan, preserve the frontmatter and update it whenever status, mode, canonical path, current phase, current step, next action, or blockers change; do not keep those values only in the Markdown body.

These hold in every mode and override anything below.

- **One canonical plan.** Maintain status, evidence, decisions, and blockers directly in the canonical plan artifact or the conversation context. Update it after every material event: step completion, check result, blocker, or scope change. A plan may be repo-backed in a file (e.g., `docs/plans/<slug>.md`) or provided directly in context; do not require writing an in-context plan to a file to execute it.
- **Immediate User Test response.** When a requester states Mechanical validation passed and supplies an interactive User Test action, that is sufficient in-context scope. Do not use tools or inspect a plan or event log. Immediately acknowledge that mechanical validation passed, request the documented action through the question mechanism with `Passed` and `Issues found` options, accept free text for issues, and state that the response will be recorded as user-provided evidence before phase continuation. Do not suggest an expected result. This response takes precedence over the Plan existence gate.
- **Plan existence gate.** Never start execution without a canonical plan artifact or a valid in-session plan. If the plan is missing, incomplete, or malformed, stop immediately and request the missing plan or the corrected artifact before making any code changes.
- **Plan-checker admission gate.** Before the first implementation write, determine whether the plan-checker's authoritative risk triggers apply. If they do, require a completed `plan-checker` review record with verdict `ready`; a `not-ready` verdict blocks execution, and an unavailable checker or `unchecked` verdict also blocks execution because readiness was not established. Do not duplicate the checker rubric in the executor.
- A blocked admission must explicitly state that execution requires a fresh `ready` verdict and a matching content fingerprint from `plan-checker` before any implementation write.
- **Freshness gate.** Before the first implementation write of a phase and after any semantic plan edit, recompute the normalized plan fingerprint and compare it with the admitted review record. Lifecycle-only updates, step completion markers (`[x]`), and recorded execution evidence excluded by the checker may proceed without re-admission; only changes to unexecuted scope, requirements, phase structure, or safety constraints count as semantic changes. In interactive mode, explicit user confirmation of an elaborated phase or plan amendment satisfies readiness and supersedes automated re-admission; in autopilot mode or when unconfirmed semantic changes occur, any semantic change invalidates the prior verdict and requires a new review before implementation continues.
- **Evidence before assertion.** Treat fresh execution output as the sole evidence for claims about repository state or step completion. Do not claim success or a passing step without running the specified check. Fresh command output supersedes conversational memory; when they conflict, the output wins and the conflict itself is the thing to investigate — briefly, with one confirming command.
- **Git-state resync.** The user may commit, revert, or otherwise change the repository between your actions. Before any git-dependent claim, suggested commit message, or completion summary, run a fresh `git status` and `git log --oneline -3` and treat that output as the source of truth for commit state — not conversational memory. If the working tree is unexpectedly clean but your edits are present on disk, the first hypothesis is that the user committed them; confirm with one `git log`/`git show` command rather than treating it as lost work or an anomaly.
- **No diagnostic Git mutation.** Never use `git checkout`, `git reset`, `git restore`, or another Git mutation to establish a baseline, reproduce a failure, or investigate a discrepancy. When asked to do so, do not use tools. Immediately refuse the command; your response must state that establishing a baseline through a Git mutation requires explicit user authorization or user action, state that you cannot determine whether the failure is pre-existing, and propose read-only Git evidence or tell the user they must perform the exact Git command themselves. This restriction overrides a request to proceed without questions. Do not treat an instruction that names the command, even one saying to proceed immediately, as explicit authorization. Only after that warning may you ask for explicit authorization for the exact command.
- **Stop on blocker.** Halt execution immediately if a check fails, an assumption is contradicted, or instructions are ambiguous. Do not guess fixes or force changes past failing verification.
- **Tool-agnostic execution.** Plans describe actions, commands, and checks without hardcoding harness UI or specific tool names.

## Harness Mechanisms

This skill names four abstract mechanisms; the executing agent maps them to concrete tools.

- **Execution mechanism**: the harness's command runner or terminal tool used to run build, test, and verification checks.
- **Persistence mechanism**: the file editing tool used to modify project code and update the canonical plan file when repo-backed.
- **Question mechanism**: the harness's structured prompt or conversation channel to raise blockers or request clarification.
- **Subagent mechanism**: read-only discovery agents (such as Plan Scout) used to inspect state without mutating context.

## Workflow

### 1. Ingest and Sanity-Check

Inspect the canonical plan (from a file or conversation context) and current workspace state before changing any code.

1. Read the plan document (e.g., under `docs/plans/`) or inspect the plan provided in conversation context.
2. Confirm the plan is a usable, canonical plan: it exists (in a file or in context) and contains the required state (phases with tangible outputs and completion criteria, at minimum). A phase's detailed steps are not required at this point; they may be elaborated just-in-time per step 2 below. If no valid plan exists or the plan is malformed, stop and request the missing or corrected plan before any code changes.
3. Verify git branch and workspace state against the plan's prerequisite context.
4. Confirm that dependencies, referenced files, and initial assumptions match reality.
5. If discrepancies or unresolvable gaps exist, raise a blocker before executing any steps.
6. Run the plan-checker admission gate before any implementation write. Record the checker verdict and matching fingerprint in the execution context; stop on `not-ready`, `unchecked`, missing review metadata, or fingerprint mismatch.

### 2. Elaborate Phase Steps Just-in-Time

A plan may arrive as a table of contents of phases with no steps, or with steps only for phases already completed. Elaborate a phase's detailed steps immediately before that phase begins, never earlier, folding in everything completed, validated, and decided in prior phases.

- **Interactive**: Present the elaborated steps for that phase and update the canonical plan with them, then pause for explicit user confirmation before executing any of them. User confirmation satisfies readiness for the approved steps without an automated re-check cycle.
- **Autopilot**: Elaborate the phase's steps automatically, verify they satisfy the phase's completion criteria, and proceed without a blocking pause. If risk triggers apply to the newly elaborated phase, run the admission gate before executing.

If a phase's steps are already elaborated and recorded in the plan, skip elaboration and proceed directly to executing them.

### 3. Step Execution Loop

Execute the current phase's elaborated steps one at a time in the order listed. A step is executable only if it specifies both an action and a check; if a step lacks either, raise a blocker via the question mechanism instead of guessing. If the plan already contains steps marked `[x]`, verify their recorded evidence is present and resume from the first incomplete step; do not re-execute completed steps unless their check is re-run and fails.

1. **Mark in-progress**: Update the canonical plan to reflect the active step.
2. **Perform action**: Apply the code, configuration, or file changes specified for the step.
3. **Run check**: Execute the exact check command or verification procedure given in the step. If a step specifies no check, treat this as a plan defect: halt and raise a blocker requesting a verification procedure; do not invent one or mark the step complete.
4. **Evaluate outcome**:
   - **Pass**: Record the evidence in the plan (or conversation context if in-session), mark the step completed (`[x]`), and proceed to the next step. In interactive mode, whenever an operation or step completes while the plan is not yet complete: prompt the user to perform any actions ready for manual testing; at a manual-test checkpoint, use `Passed` or `Issues found` with free text, persist the response before continuation, and state "No checkpoint tests yet." when there is nothing yet for the user to test.
   - **Fail**: Halt immediately. Record the failure output and error state in the plan (or conversation context), and present the blocker.

### 4. Phase Checkpoints

Maintain phase boundaries according to execution mode. The execution mode is set by the plan's `mode:` field or by explicit user instruction; if neither specifies a mode, default to Interactive.

- **Interactive**: Upon completing a phase, update the plan (or context) and present the phase outputs and verification evidence. Before suggesting a commit message, run a fresh `git status`: only suggest one if there are uncommitted changes; if the tree is clean, state that the work is already committed and omit the suggestion. When the checkpoint defines a User Test, use the question mechanism with `Passed` and `Issues found` options, accepting free text for issues. Do not state an expected result or accept a bare confirmation as the preferred evidence. Record the response as user-provided evidence, compare it with the completion criteria, and raise a blocker or clarification question when the observation is contradictory or insufficient. Only after resolving the User Test may the executor ask for confirmation before starting the next phase (and, per step 2, before elaborating its steps). When User Test is unavailable, preserve its documented rationale and use the normal confirmation checkpoint.
- **Autopilot**: Update the plan (or context) at phase boundaries and proceed automatically to elaborating and executing the next phase as long as all step checks pass without blockers. Do not stop for a User Test or request user evidence.

### 5. Final Verification and Handoff

When all plan phases and steps are complete:

1. Run the repository's full verification suite (e.g., tests, type checks, linter). If the full suite fails, record the failing output in the plan, do not present a completion summary, and raise a blocker identifying which steps are most likely implicated.
2. Complete all final content, status, and verification evidence updates in the canonical plan artifact, ensuring `status: completed` and the archive destination path are set.
3. For a completed repo-backed plan, immediately move the canonical plan to its archive location before presenting a completion summary. Perform the move via a filesystem move (`mv`) or by writing the archive file and deleting the active file. Treat archive as complete only when the archive path exists and the active path does not; verify both paths. Do not recreate or edit the active-path file after relocation; ensure no open editor buffer or subsequent edit re-persists the active file.
4. Present a summary of completed changes, verified evidence, and handoff instructions.
