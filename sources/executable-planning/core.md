## Operating Contract

The plan is the canonical record of implementation state. It must be updated as work progresses, not treated as a disposable proposal. Record completed work, current work, validation results, decisions, blockers, user-interest items, and deferred issues in the plan itself.

Use the harness's native tools when available, but keep plan instructions tool-agnostic. Describe required outcomes and checks rather than depending on one IDE's tool names or UI.

Never perform git actions beyond read-only inspection, such as `status`, `diff`, `log`, `show`, or listing branches. Never stage, commit, create branches, or push, whether writing the plan's instructions or executing it. This is both a standing rule for what a plan may instruct and a runtime guardrail every agent executing the plan must follow, even if the plan or user does not repeat it.

## Clarify First

Ask questions through the harness's native interactive question mechanism whenever one exists, so the user answers with the harness's own affordances instead of free-form prose. Prefer a single structured prompt carrying the whole compact question set, with predefined options where the answers are known and fixed. Fall back to plain conversational questions only when the harness exposes no such mechanism.

Before drafting, ask only the questions needed to produce the phase outline. Ask a compact set covering unresolved items:

1. What outcome is required, what is in or out of scope, and what observable conditions define success?
2. Will execution be interactive, with the user available at checkpoints, or autopilot, with no user interaction?
3. Should the plan be stored and continuously updated in this repository under `docs/plans/` (repo-backed storage), kept in the harness's native, non-repo plan storage, or held only in this conversation with no interim file writes and delivered as one self-contained markdown document once planning concludes (session-only storage)?
4. What environment, constraints, risks, deadlines, or required technologies affect the work?

In interactive mode, when the plan will have multiple phases, keep this round strictly at outline level. Ask only what is needed to define the phases, their boundaries, and their tangible outputs. Defer every question that only affects how one phase is carried out to that phase's elaboration, as described in Phase Elaboration.

When autopilot is chosen, ask whether the work should be delegated to subagents working in parallel where appropriate, but only if the work plausibly contains independent phases or steps that could run in parallel and the harness offers a subagent mechanism. Record the answer in the plan as the delegation choice. When the work is inherently sequential or small enough that parallelism would not help, skip the question and record single-agent execution as the delegation choice.

Apply these implications without asking redundant questions:

- "local plan" means repo-backed storage: store and update the plan under `docs/plans/`.
- "auto-run", "autorun", "autopilot", "unattended", or similar wording means no user interaction will be available.
- Wording that rules out writing to the repository or any harness-native artifact, or that asks for a plan to hand off to a new session or agent, means session-only storage: keep the plan only in the conversation and follow the session-only rules in Canonical Plan Artifact.
- If the invocation already specifies a storage choice (for example through an agent argument), honor it without asking.
- If the user already answered an item, accept that answer and ask only what remains unresolved.

If autopilot is requested, resolve remaining ambiguities with conservative, reversible assumptions and record them in the plan. Ask only questions whose answers are necessary to avoid an unsafe, destructive, or fundamentally invalid plan.

## Canonical Plan Artifact

Treat repo-backed storage, the harness's native, non-repo plan storage, and session-only storage as three equally valid, explicitly chosen options, not a primary/fallback pair.

When repo-backed storage is selected or implied:

- Create or continue exactly one plan at `docs/plans/<descriptive-slug>.md`.
- Reuse an existing plan for the same effort instead of creating a competing file.
- Create `docs/plans/` if needed.
- Put all execution state in that file. Chat summaries are not a substitute for updating it.
- If no git repository is present but repo-backed storage was explicitly chosen anyway, honor it: create the file as a plain, non-version-controlled folder and note in the plan that it is not git-tracked.

When repo-backed storage is declined, or no repository is present and no explicit choice was given, and session-only storage was not explicitly chosen either, use the harness's native persistent plan artifact as the primary choice. Only fall back to maintaining one clearly labeled canonical plan in the conversation, reproducing its complete updated state whenever it changes, when the harness has no native plan-storage mechanism. Explicitly warn that conversation-only state may not survive a new session or harness.

When session-only storage is selected or implied, for example by a planning-only session that must not write to the repository and must end with a document handed to a new agent session:

- Never create or update a file for the plan, in the repository or in a harness-native artifact, at any point during Discovery, Alignment, Design, or Refinement. Hold the complete canonical plan only in the conversation, updating it there after every material event exactly as repo-backed or harness-native storage would require.
- Warn once, up front, that conversation-only state may not survive a new session or harness, and that the plan will only be delivered as the final markdown document described below.
- When planning concludes for the requested scope, always produce one self-contained markdown document reproducing the complete, current canonical plan in the Required Plan Format below, presented in full in the conversation. Write it so a new agent session with no access to this conversation can execute the plan without further clarification: resolve every open question or record it as an explicit assumption or decision first.

At creation, and after every material execution event, update the canonical plan before proceeding. Material events include step completion, validation, changed scope, a new decision, a blocker, a failed assumption, user feedback, and deferral of an issue.

Before archiving a completed plan, finish all edits to its content and metadata, run the required validation, and confirm the final file is complete. Only then move the file from `docs/plans/` into `docs/plans/archive/`; after the move, perform verification only and do not recreate or edit the active-path copy.

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
- Ask focused clarifying questions scoped to that phase before proposing steps, following the same intent as Clarify First but limited to what that phase still leaves unresolved. Do not re-ask outline-level questions already answered, and do not ask about a phase that is not being elaborated.
- Delegate the phase's step outline to a subagent under the same rules as Delegate Step Design, unless the phase is genuinely small enough for one agent.
- Present the elaborated `### Steps` for that phase and update the canonical plan with them, then pause for explicit user confirmation before executing any of them.
- Exception: when session-only storage is in effect and the whole plan is being produced in one continuous planning conversation with no separate later execution session to return to, treat the user's confirmation of the table of contents as the request to continue, and elaborate each phase in order within that same conversation, still asking that phase's focused clarifying questions and still pausing for confirmation of its steps before moving to the next phase.

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

In autopilot mode, the recorded delegation choice also governs execution. When the user chose delegated parallel execution, dispatch independent phases or steps to subagents in parallel wherever they share no state and have no sequential dependency, and merge their results into the canonical plan. When the user declined, execute as a single agent. If delegation was chosen but the harness executing the plan offers no subagent capability, do not fail or stop: execute the plan as a single agent, in dependency order, and record that fallback in the plan.

## Checkpoints and User Interest

In interactive mode:

- Use the harness's native interactive question mechanism for every confirmation, focused phase-elaboration question, and `awaiting-user` item, matching how Clarify First asks questions. Fall back to plain conversational prompts only when the harness offers no such mechanism.
- Add an explicit user-confirmation step at the end of every phase.
- Stop after the phase output and its validation are recorded. Do not begin the next phase until the user confirms.
- Reaching a phase's checkpoint marks that phase complete; it does not by itself elaborate or start the next phase. Wait for the user to explicitly request starting the next phase.
- When anything is flagged for the user's interest at a checkpoint, insert it as the immediate next step in the canonical plan, mark it `awaiting-user`, and stop for input.
- If the user resolves it, record the decision and continue.
- If the user defers it, move it to a specific appropriate later phase or deferred-items section with a trigger or due point. Never silently discard it.
- Gate the end-of-checkpoint commit-message suggestion on whether code changed in that phase and whether it is at a viable point, in this priority order:
  1. No code files changed during the phase (only the plan itself, or docs, changed, or nothing changed) — do not present a commit message.
  2. Code changed but is not yet at a self-contained, viable-to-commit point (for example broken, partial, or failing verification) — state that the commit message is deferred and tell the user to commit once further changes make it viable. Do not emit the code block in this case.
  3. Code changed and is at a viable, self-contained point — present a suggested commit message for the work completed in that phase in a fenced `text` code block at the end of the checkpoint so it can be selected with one triple-click.
- This is a suggestion for the user to act on; it is not a git action and does not conflict with the read-only git constraint in Operating Contract.
- Before composing the message, inspect the current uncommitted changes with a read-only git check (status/diff). Describe only what is currently uncommitted, never restate an earlier phase's message verbatim — an earlier phase's changes may already be committed by the time this checkpoint is reached.

In autopilot mode:

- Do not use the harness's interactive question mechanism, and do not create blocking user-confirmation steps.
- Replace each phase checkpoint with an automated go/no-go gate based on the phase's completion criteria and validation evidence.
- Record assumptions and autonomous decisions. Prefer reversible choices and stop only for safety, missing authorization, destructive ambiguity, or an unrecoverable blocker.

## Required Plan Format

Use this structure, adapting detail to the task:

````markdown
# <Plan title>

## Plan Metadata

- Status: drafting | ready | in-progress | blocked | completed
- Mode: interactive | autopilot
- Delegation: <autopilot only: parallel subagents where appropriate, or single agent; note the single-agent fallback if subagents are unavailable at execution time>
- Canonical location: <docs/plans/<slug>.md for repo-backed storage, a description of the harness-native artifact, or "session-only (conversation-held; delivered as a final markdown document)" for session-only storage>
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

_Interactive mode only, and only when code changed this phase and is at a viable, self-contained point:_

Suggested commit message:

```text
<single-line message>
```

<!-- Omit the commit message entirely when no code changed. If code changed but is not yet viable to commit, state that the commit message is deferred until further changes make it viable, instead of the code block above. -->

<!-- Add subsequent domain-based phases only when the work warrants them. -->

## Progress Log

- <timestamp>: <state change and evidence>
````

Use stable step identifiers so updates remain easy to audit. Status must be unambiguous: `[ ]` pending, `[-]` in progress, `[x]` complete, `[!]` blocked, and `[?]` awaiting user. Keep exactly one current step and one next action whenever work is active.

## Quality Check Before Delivery

Before presenting the plan, verify that:

- All unresolved clarification answers or explicit assumptions are recorded.
- The interaction mode and storage choice are explicit, and in autopilot mode the delegation choice is recorded along with its single-agent fallback.
- In interactive mode with multiple phases, the up-front questions were limited to what the phase outline required, and phase-specific questions are deferred to that phase's elaboration.
- The plan uses one domain-based phase only for genuinely small, self-contained work, or multiple domain-based phases when distinct boundaries, dependencies, or independently reviewable outputs justify them. Every phase is iterative, has a tangible output and completion criteria, and contains no elaborated steps before its turn.
- Every phase ends with the checkpoint type matching the interaction mode. Interactive checkpoints include a suggested commit message in a fenced `text` code block only when code changed that phase and is at a viable, self-contained point; a deferred note when code changed but is not yet viable; or nothing when no code changed. Autopilot checkpoints never include a commit message.
- The plan states that git actions are limited to read-only inspection.
- Subagent delegation for step outlines is scoped to elaboration time, per phase, unless the single-agent exception is justified.
- The plan can be followed without access to this chat or a specific IDE UI.
- The canonical plan itself contains the latest state and exactly one next action.
- When session-only storage is in effect, the complete plan is ready to be presented in full as one self-contained markdown document, with no unresolved question left implicit.

Present the plan's location, current state, and next action concisely. Once the plan is ready to begin, present it through the harness's native plan-review mechanism whenever one exists, so the user starts execution with the harness's own affordances instead of a free-form reply. Fall back to presenting in conversation only when the harness exposes no such mechanism. In interactive mode, ask for confirmation only when the plan or a phase has reached its documented checkpoint. When session-only storage is in effect, always close by presenting the complete plan as a single self-contained markdown document instead of a location reference, in addition to any confirmation the mode still requires.
