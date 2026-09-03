---
name: executable-planning
description: Use when creating or maintaining a multi-step implementation plan
  that must remain executable across agents, sessions, IDEs, or unattended
  harnesses.
---
# Executable Planning

## Operating Contract

The plan is the canonical record of implementation state. It must be updated as work progresses, not treated as a disposable proposal. Record completed work, current work, validation results, decisions, blockers, user-interest items, and deferred issues in the plan itself.

Use the harness's native tools when available, but keep plan instructions tool-agnostic. Describe required outcomes and checks rather than depending on one IDE's tool names or UI.

Never perform git actions beyond read-only inspection, such as `status`, `diff`, `log`, `show`, or listing branches. Never stage, commit, create branches, or push, whether writing the plan's instructions or executing it. This is both a standing rule for what a plan may instruct and a runtime guardrail every agent executing the plan must follow, even if the plan or user does not repeat it.



## Clarify First

Before drafting, ask a compact set of questions covering unresolved items:

1. What outcome is required, what is in or out of scope, and what observable conditions define success?
2. Will execution be interactive, with the user available at checkpoints, or autopilot, with no user interaction?
3. Should the plan be stored and continuously updated locally under `plans/`?
4. What environment, constraints, risks, deadlines, or required technologies affect the work?

Apply these implications without asking redundant questions:

- "local plan" means store and update the plan under `plans/`.
- "auto-run", "autorun", "autopilot", "unattended", or similar wording means no user interaction will be available.
- If the user already answered an item, accept that answer and ask only what remains unresolved.

If autopilot is requested, resolve remaining ambiguities with conservative, reversible assumptions and record them in the plan. Ask only questions whose answers are necessary to avoid an unsafe, destructive, or fundamentally invalid plan.



## Canonical Plan Artifact

When local storage is selected or implied:

- Create or continue exactly one plan at `plans/<descriptive-slug>.md`.
- Reuse an existing plan for the same effort instead of creating a competing file.
- Create `plans/` if needed.
- Put all execution state in that file. Chat summaries are not a substitute for updating it.

When local storage is declined, use the harness's persistent plan artifact if one exists. Otherwise, maintain one clearly labeled canonical plan in the conversation and reproduce its complete updated state whenever it changes. Explicitly warn that conversation-only state may not survive a new session or harness.

At creation, and after every material execution event, update the canonical plan before proceeding. Material events include step completion, validation, changed scope, a new decision, a blocker, a failed assumption, user feedback, and deferral of an issue.

Before archiving a completed plan, finish all edits to its content and metadata, run the required validation, and confirm the final file is complete. Only then move the file from the active plans directory into the archive; after the move, perform verification only and do not recreate or edit the active-path copy.



## Plan Design

Organize every plan into one or more conceptually domain-based phases. Use one domain-based phase for genuinely small, self-contained work with one inspectable outcome and one meaningful validation path. Use multiple domain-based phases when distinct boundaries, dependencies, or independently reviewable outputs justify them. A phase should represent a coherent product, system, or problem domain boundary, not merely a generic activity such as "coding" or "testing". Cross-cutting validation may be included in each phase or as its own phase when it is genuinely a domain of work.

At creation, each phase must:

- Be iterative and independently reviewable.
- Produce a tangible output that can be inspected, run, measured, or demonstrated.
- Include explicit completion criteria and a description of how it will be validated.
- Identify known dependencies, likely files or components, risks, and rollback or recovery considerations where relevant.
- End with a checkpoint appropriate to the selected interaction mode.

Do not write ordered, detailed steps for a phase at creation time. The initial plan is a table of contents of scoped, named phases with tangible outputs, not a fully expanded task list. Populate a phase's `### Steps` only when that phase is elaborated.

Phase boundaries are not fixed once written. Split, merge, reorder, rename, or add phases as understanding evolves during elaboration or execution. Record every such structural change as a decision in the canonical plan, including its rationale.

Prefer thin end-to-end increments over large horizontal batches. Order phases so each tangible output reduces uncertainty for the next phase.



## Phase Elaboration

Elaborate a phase's detailed steps only immediately before that phase begins, informed by what has already been completed, validated, and decided.

In interactive mode:

- Wait for the user to explicitly request starting a phase before elaborating its steps. Do not elaborate steps for a later phase in advance.
- Ask focused clarifying questions scoped to that phase before proposing steps, following the same intent as Clarify First but limited to what that phase still leaves unresolved.
- Delegate the phase's step outline to a subagent under the same rules as Delegate Step Design, unless the phase is genuinely small enough for one agent.
- Present the elaborated `### Steps` for that phase and update the canonical plan with them, then pause for explicit user confirmation before executing any of them.

In autopilot mode:

- Elaborate each phase's steps automatically immediately before execution begins, without blocking questions.
- Resolve ambiguity with conservative, reversible assumptions and record them as decisions.
- Replace the confirmation pause with an automated go/no-go check that the elaborated steps satisfy the phase's completion criteria before execution starts.



## Delegate Step Design

Decide, at each phase's elaboration, whether one agent can easily plan that phase without losing domain expertise or parallelism.

- For a genuinely small, single-domain phase, outline its steps yourself and record why a subagent was unnecessary.
- Otherwise, delegate that phase's step outline to a subagent when it is elaborated, not before. Group only phases that are elaborated together.
- Give the subagent the clarified goal, constraints, mode, relevant repository context, that phase's tangible output, and the required plan schema.
- Ask the subagent to return ordered steps, dependencies, validation, risks, and questions for that phase only. It must not implement the work.
- Run independent phase-planning subagents in parallel when elaborating more than one phase at the same time and the harness supports it.
- Synthesize the subagent's results into the canonical plan for that phase. Resolve overlaps and dependency conflicts, but do not replace its concrete step outline with a vague summary.

If subagents are unavailable in the current harness, state that limitation in the plan and produce the smallest sound fallback outline yourself at elaboration time.



## Checkpoints and User Interest

In interactive mode:

- Add an explicit user-confirmation step at the end of every phase.
- Stop after the phase output and its validation are recorded. Do not begin the next phase until the user confirms.
- Reaching a phase's checkpoint marks that phase complete; it does not by itself elaborate or start the next phase. Wait for the user to explicitly request starting the next phase.
- When anything is flagged for the user's interest at a checkpoint, insert it as the immediate next step in the canonical plan, mark it `awaiting-user`, and stop for input.
- If the user resolves it, record the decision and continue.
- If the user defers it, move it to a specific appropriate later phase or deferred-items section with a trigger or due point. Never silently discard it.
- Present a suggested commit message for the work completed in that phase in a fenced `text` code block at the end of the checkpoint so it can be selected with one triple-click. This is a suggestion for the user to act on; it is not a git action and does not conflict with the read-only git constraint in Operating Contract.

In autopilot mode:

- Do not create blocking user-confirmation steps.
- Replace each phase checkpoint with an automated go/no-go gate based on the phase's completion criteria and validation evidence.
- Record assumptions and autonomous decisions. Prefer reversible choices and stop only for safety, missing authorization, destructive ambiguity, or an unrecoverable blocker.



## Required Plan Format

Use this structure, adapting detail to the task:

~~~markdown
# <Plan title>

## Plan Metadata

- Status: drafting | ready | in-progress | blocked | completed
- Mode: interactive | autopilot
- Canonical location: <path or harness artifact>
- Last updated: <timestamp>
- Goal: <observable outcome>
- Success criteria: <measurable list>
- Constraints and assumptions: <list>

## Current State

- Current phase: <phase or not started>
- Current step: <step or not started>
- Next action: <exactly one action>
- Blockers: <list or none>

## Decisions

- <decision, rationale, date>

## Deferred Items

- <item, destination phase or trigger, rationale>

## Phase 1: <domain-based name>

### Tangible output

### Completion criteria

### Dependencies and risks

### Steps

_Not yet elaborated. Populate immediately before this phase starts._

### Validation

### Checkpoint

_Interactive mode only:_

Suggested commit message:

```text
<single-line message>
```

<!-- Add subsequent domain-based phases only when the work warrants them. -->

## Progress Log

- <timestamp>: <state change and evidence>
~~~

Use stable step identifiers so updates remain easy to audit. Status must be unambiguous: `[ ]` pending, `[-]` in progress, `[x]` complete, `[!]` blocked, and `[?]` awaiting user. Keep exactly one current step and one next action whenever work is active.



## Quality Check Before Delivery

Before presenting the plan, verify that:

- All unresolved clarification answers or explicit assumptions are recorded.
- The interaction mode and storage choice are explicit.
- The plan uses one domain-based phase only for genuinely small, self-contained work, or multiple domain-based phases when distinct boundaries, dependencies, or independently reviewable outputs justify them. Every phase is iterative, has a tangible output and completion criteria, and contains no elaborated steps before its turn.
- Every phase ends with the checkpoint type matching the interaction mode. Interactive checkpoints include a suggested commit message in a fenced `text` code block; autopilot checkpoints do not include one.
- The plan states that git actions are limited to read-only inspection.
- Subagent delegation for step outlines is scoped to elaboration time, per phase, unless the single-agent exception is justified.
- The plan can be followed without access to this chat or a specific IDE UI.
- The canonical plan itself contains the latest state and exactly one next action.

Present the plan's location, current state, and next action concisely. In interactive mode, ask for confirmation only when the plan or a phase has reached its documented checkpoint.


## Discovery

Before proposing a plan, inspect the relevant repository area and any nearby
tests, documentation, or operational constraints. Identify the smallest set
of facts needed to describe the intended outcome, affected components, and
likely validation.

For work spanning independent domains, gather evidence for each domain
separately. Record findings in the canonical plan rather than relying on
conversation context alone.



## Alignment

Resolve the outcome, scope, interaction mode, storage choice, and constraints
required by the planning contract. Ask only questions that remain unanswered
or that would materially change a safe plan.

When alternatives have meaningful trade-offs, state the recommendation and
record the decision. In autopilot mode, make conservative reversible
assumptions when the answer is not essential to safety or validity.



## Design

Create the canonical plan using the required format. Give each phase a
specific domain boundary, tangible output, completion criteria, validation,
and checkpoint. Use the smallest number of phases that accurately represents
the work: one phase for a small self-contained outcome, and additional phases
when dependencies or independently reviewable results warrant them.

Keep detailed implementation steps deferred until the relevant phase begins.
Name the likely files, components, interfaces, risks, recovery considerations,
and dependencies needed to carry out the work without access to this chat.

Present the plan concisely after updating its canonical artifact.



## Refinement

Treat user feedback as a plan change. Clarify questions, revise decisions and
scope when requested, and keep the canonical artifact synchronized with the
latest version.

When the user approves an interactive plan, record the approval and stop
before implementation. When the user asks to begin a phase, elaborate only
that phase's steps and follow its documented checkpoint rules.


## When to Use

Use this skill when creating or maintaining executable implementation plans that must work across IDE and autonomous harness execution.

Use this skill for multi-step efforts where durable canonical plan state, domain-based phases, and explicit validation/checkpoints are required.

Do not use this skill for direct implementation-only requests that do not require planning artifacts.



## Harness Adaptation

Adapt read/search operations to the current harness and gather enough context to produce a complete plan.

Adapt plan persistence to one canonical artifact and keep it synchronized after each material state change.

Adapt clarification prompts to the harness question mechanism; if unavailable in autopilot mode, record conservative reversible assumptions.

Adapt delegation to available subagent mechanisms; when unavailable, record the limitation and produce a smallest-sound single-agent fallback.

Adapt phase-elaboration triggers to the harness: wait for an explicit user request in interactive mode, or elaborate automatically immediately before execution in autopilot mode. Never invoke git actions beyond read-only inspection through any harness tool, regardless of what the harness otherwise permits.
