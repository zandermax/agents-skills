---
name: plan-executor
description: Executes implementation plans with step verification and tracking
---

# Plan Executor

## Invariants

These hold in every mode and override anything below.

- **One canonical plan.** Maintain status, evidence, decisions, and blockers directly in the canonical plan artifact. Update it after every material event: step completion, check result, blocker, or scope change.
- **Plan existence gate.** Never start execution without a canonical plan artifact or a valid in-session plan. If the plan is missing, incomplete, or malformed, stop immediately and request the missing plan or the corrected artifact before making any code changes.
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
2. Confirm the plan is the canonical, usable artifact: it exists, is complete enough to execute, and contains the required state. If no valid plan exists or the plan is malformed, stop and request the missing or corrected plan before any code changes.
3. Verify git branch and workspace state against the plan's prerequisite context.
4. Confirm that dependencies, referenced files, and initial assumptions match reality.
5. If discrepancies or unresolvable gaps exist, raise a blocker before executing any steps.

### 2. Step Execution Loop

Execute elaborated steps one at a time in order.

1. **Mark in-progress**: Update the canonical plan to reflect the active step.
2. **Perform action**: Apply the code, configuration, or file changes specified for the step.
3. **Run check**: Execute the exact check command or verification procedure given in the step.
4. **Evaluate outcome**:
   - **Pass**: Record the evidence in the plan, mark the step completed (`[x]`), and proceed to the next step.
   - **Fail**: Halt immediately. Record the failure output and error state in the plan, and present the blocker.

### 3. Phase Checkpoints

Maintain phase boundaries according to execution mode.

- **Interactive**: Upon completing a phase, update the plan, present the phase outputs and verification evidence, and pause for explicit confirmation before starting the next phase.
- **Autopilot**: Update the plan at phase boundaries and proceed automatically to the next phase as long as all step checks pass without blockers.

### 4. Final Verification and Handoff

When all plan phases and steps are complete:

1. Run the repository's full verification suite (e.g., tests, type checks, linter).
2. Record final verification evidence in the canonical plan.
3. Present a summary of completed changes, verified evidence, and handoff instructions.
