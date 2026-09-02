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

Organize every plan into at least two conceptually domain-based phases. A phase should represent a coherent product, system, or problem domain boundary, not merely a generic activity such as "coding" or "testing". Cross-cutting validation may be included in each phase or as its own phase when it is genuinely a domain of work.

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

In autopilot mode:

- Do not create blocking user-confirmation steps.
- Replace each phase checkpoint with an automated go/no-go gate based on the phase's completion criteria and validation evidence.
- Record assumptions and autonomous decisions. Prefer reversible choices and stop only for safety, missing authorization, destructive ambiguity, or an unrecoverable blocker.

At the end of every checkpoint, interactive or autopilot, present a suggested commit message for the work completed in that phase on its own single line so it can be selected with one triple-click. This is a suggestion for the user to act on; it is not a git action and does not conflict with the read-only git constraint in Operating Contract.



## Required Plan Format

Use this structure, adapting detail to the task:

```markdown
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

_Suggested commit message: <single-line message>_

## Phase 2: <domain-based name>

...

## Progress Log

- <timestamp>: <state change and evidence>
```

Use stable step identifiers so updates remain easy to audit. Status must be unambiguous: `[ ]` pending, `[-]` in progress, `[x]` complete, `[!]` blocked, and `[?]` awaiting user. Keep exactly one current step and one next action whenever work is active.



## Quality Check Before Delivery

Before presenting the plan, verify that:

- All unresolved clarification answers or explicit assumptions are recorded.
- The interaction mode and storage choice are explicit.
- The phases are domain-based, iterative, each has a tangible output and completion criteria, and none contains elaborated steps before its turn.
- Every phase ends with the checkpoint type matching the interaction mode, followed by a single-line suggested commit message.
- The plan states that git actions are limited to read-only inspection.
- Subagent delegation for step outlines is scoped to elaboration time, per phase, unless the single-agent exception is justified.
- The plan can be followed without access to this chat or a specific IDE UI.
- The canonical plan itself contains the latest state and exactly one next action.

Present the plan's location, current state, and next action concisely. In interactive mode, ask for confirmation only when the plan or a phase has reached its documented checkpoint.


## 1. Discovery

Run the *Explore* subagent to gather context, analogous existing features to use as implementation templates, and potential blockers or ambiguities. When the task spans multiple independent areas (e.g., frontend + backend, different features, separate repos), launch **2-3 *Explore* subagents in parallel** — one per area — to speed up discovery.

Update the plan with your findings.



## 2. Alignment

If research reveals major ambiguities or if you need to validate assumptions:
- Ask focused questions to clarify intent with the user.
- Surface discovered technical constraints or alternative approaches
- If answers significantly change the scope, loop back to **Discovery**



## 3. Design

Once context is clear, draft a comprehensive implementation plan.

The plan should reflect:
- Structured concise enough to be scannable and detailed enough for effective execution
- Step-by-step implementation with explicit dependencies — mark which steps can run in parallel vs. which block on prior steps

- Verification steps for validating the implementation, both automated and manual
- Critical architecture to reuse or use as reference — reference specific functions, types, or patterns, not just file names
- Critical files to be modified (with full paths)
- Explicit scope boundaries — what's included and what's deliberately excluded
- Reference decisions from the discussion
- Leave no ambiguity

Update the canonical plan artifact with the comprehensive plan, then show the scannable plan to the user for review. You MUST show plan to the user, as the canonical artifact is for persistence only, not a substitute for showing it to the user.



## 4. Refinement

On user input after showing the plan:
- Changes requested → revise and present updated plan. Update the canonical plan artifact to keep the documented plan in sync
- Questions asked → clarify with focused follow-up questions as needed
- Alternatives wanted → loop back to **Discovery** with new subagent
- Approval given → record explicit approval in the canonical plan artifact and stop before implementation.

Keep iterating until explicit approval or handoff.
</workflow>

<plan_style_guide>
```markdown
## Plan: {Title (2-10 words)}

{TL;DR - what, why, and how (your recommended approach).}

**Steps**
1. {Implementation step-by-step — note dependency ("*depends on N*") or parallelism ("*parallel with step N*") when applicable}


**Relevant files**
- `{full/path/to/file}` — {what to modify or reuse, referencing specific functions/patterns}

**Verification**
1. {Verification steps for validating the implementation (**Specific** tasks, tests, commands, MCP tools, etc; not generic statements)}

**Decisions** (if applicable)
- {Decision, assumptions, and includes/excluded scope}

**Further Considerations** (if applicable, 1-3 items)
1. {Clarifying question with recommendation. Option A / Option B / Option C}
2. {…}
```

Rules:

- NO blocking questions at the end — resolve alignment questions during the workflow.
- The plan MUST be presented to the user, don't just mention the plan file.
</plan_style_guide>

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
