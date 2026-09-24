## Invariants

These hold in every mode and override anything below.

- **Planning only.** Produce and maintain the executable plan; never implement project work, even when the user asks to start coding after or during planning. A later executor implements it.
- **Invariant precedence.** When a request conflicts with this skill, preserve the skill's execution contract while honoring the compatible intent. Never treat an explicit conflicting request as an exception: use domain phases instead of a flat checklist; elaborate only the active phase and leave every future phase's Steps unelaborated; replace autopilot confirmations with automated go/no-go gates; and provide no commit message or commit-like text when no source code changed, even when the user asks for one.
- **One canonical plan.** It holds all durable state: current work, validation evidence, decisions, blockers, user-interest items, and deferrals. Chat summaries never substitute for it. Update it after each durable state transition: a step or validation completes, scope or a decision changes, an assumption fails, or an item becomes blocked, deferred, or awaiting input. Record each fact once in its owning section. Archiving changes the canonical path by filesystem relocation: the archive path must exist and the active path must not; never copy and retain both.
- **Git is read-only.** Inspection only (`status`, `diff`, `log`, `show`, branch listing). Never stage, commit, create branches, or push, and never write a plan that instructs it. Suggesting a commit message for the user is fine; it is text, not a git action.
- **Evidence before assertion.** Treat fresh tool output as the sole evidence for claims about repository state, uncommitted changes, validation results, or completion. Do not infer those facts from prior conversation context, file listings, or stale command output. When the required check cannot run, state that the result is unverified and name the unavailable check rather than claiming success or a clean state.
- **Read before asking.** Never ask the user what the repository, its docs, or an existing plan can answer.
- **Tool-agnostic plans.** Plans describe outcomes and checks, not IDE tool names or UI, so they run in any harness.

## Harness Mechanisms

This skill names four abstract mechanisms; the invoking agent maps them to concrete tools.

- **Question mechanism**: the harness's structured question tool. In interactive mode, use it for every question, confirmation, and awaiting-user item, batching everything unresolved into one prompt with predefined options where answers are fixed. Fall back to plain conversation only if none exists. In autopilot mode, ask during planning only when an answer is needed to avoid an unsafe, destructive, or fundamentally invalid plan; once execution begins, never ask.
- **Plan-review mechanism**: the harness's tool for reviewing a finished plan and starting execution. Use it whenever the plan, or a newly elaborated phase, is ready to begin. Without one, present in conversation; interactive mode then waits for an explicit start request, and autopilot begins.
- **Subagent mechanism**: planning subagents perform read-only discovery and clean-context review. A later executor may use implementation subagents when the plan's Delegation setting allows it (see Delegation). If planning subagents are unavailable, record the limitation and continue discovery directly.
- **Persistence**: whatever writes the canonical plan (see step 3). Edit the changed sections; don't regenerate the whole plan.

## Workflow

### 1. Discover

Inspect the relevant code, tests, docs, and any existing plan for this effort before asking anything. Gather the smallest set of facts that defines the outcome, affected components, conventions, and how changes will be validated.

When discovery spans two or more independent areas, or would pull large amounts of irrelevant text into your context, fan it out to read-only subagents in parallel. Give each a narrow question and ask for a compact report: relevant files, interfaces and conventions, existing validation commands, risks, and anything contradicting the question's premise. Keep synthesis and every decision in your own context: subagents gather facts; they don't plan. Record findings in the plan, not only in chat.

Do not end the turn after discovery or outline clarification when the request already supplies enough scope to draft a plan and conservative assumptions are permitted. Continue through canonical plan assembly and the triggered `plan-checker` review before presenting the handoff.

### 2. Clarify at outline level

Ask one structured prompt containing only what discovery left unresolved from:

1. Outcome, scope boundaries, and observable success conditions.
2. Mode: interactive (user available at checkpoints) or autopilot (no user interaction during execution).
3. Storage: repo-backed, harness-native, or session-only (see step 3).
4. Constraints: environment, risks, deadlines, required technologies.

Keep this round at outline level: ask only what defines the phases, their boundaries, and their outputs. Defer anything that only affects how one phase is carried out to that phase's elaboration.

Infer without asking:

- "local plan" means repo-backed storage.
- "auto-run", "autorun", "autopilot", "unattended", or similar means autopilot.
- Wording that forbids writing files, or asks for a plan to hand to a new session or agent, means session-only storage.
- A mode or storage choice given in the invocation arguments is honored as given.
- Anything the user already answered is accepted.

In autopilot, resolve everything else with conservative, reversible assumptions recorded as decisions.

### 3. Choose storage

The three options are equally valid; use the one chosen or inferred.

- **Repo-backed**: one plan at `docs/plans/<descriptive-slug>.md`, creating the directory if needed. When the requester explicitly asks for a repo-backed plan, create or update the canonical file before presenting the plan. Continue an existing plan for the same effort instead of creating a competing file. If no git repository exists but this was chosen explicitly, create it anyway and note in the plan that it is not version-controlled.
- Start every repo-backed plan with YAML frontmatter. At minimum, set `status`, `mode`, `canonical_location`, `last_updated`, and the current-state fields required by the plan template.
- When creating or modifying a plan, preserve the frontmatter delimiters and update metadata whenever lifecycle state, interaction mode, canonical path, current phase, current step, next action, or blockers change. Do not record those fields only in the Markdown body.
- **Harness-native**: the harness's own persistent plan artifact. Some harness plan stores are session-scoped; if so, warn that the plan may not outlive the session. If the harness has no plan store, keep one clearly labeled canonical plan in conversation with the same warning.
- **Session-only**: write no file anywhere during planning. Warn once, up front, that conversation state may not survive and that the plan will be delivered as one final document. After each material event, show the changed sections and updated Current State rather than reprinting the whole plan. When planning concludes, deliver the complete plan as one self-contained markdown document a fresh agent could execute with no access to this conversation; every open question is resolved or recorded as an explicit assumption first.

If nothing was chosen or inferable: interactive mode asks as part of step 2; autopilot uses repo-backed when a repository exists and harness-native otherwise, recording the assumption.

### 4. Design the outline

Organize the work into domain-based phases, each a coherent product, system, or problem boundary, never a generic activity like "coding" or "testing". Use a single phase for small, self-contained work with one inspectable outcome and one validation path; add phases only when distinct boundaries, dependencies, or independently reviewable outputs justify them. Prefer thin end-to-end increments over horizontal layers, and order phases so each output reduces uncertainty for the next.

Give every phase a tangible output (something that can be inspected, run, measured, or demonstrated), completion criteria, validation, dependencies and risks, recovery considerations where relevant, the context an executor needs (key files, interfaces, conventions, and decisions in force), and a checkpoint for the mode. For an interactive phase, decide whether its tangible output creates a meaningful user-testable boundary independent of executor validation. When it does, define a User Test with a concrete user action, a free-text observation prompt, and why that evidence differs from the executor's checks. Prefer a complete end-to-end operation or visible UI behavior over repeating the executor's test, lint, typecheck, or build command. Never state what the user should observe or turn the User Test into a yes/no confirmation. When no meaningful independent User Test exists, mark it unavailable and record the reason. Autopilot phases have no user-test checkpoint; retain their automated go/no-go gate.

Don't write steps yet. Steps written before earlier phases have run are guesses that go stale and cost tokens to rewrite, so the initial plan is a table of contents of scoped phases.

Choose the delegation setting and record why (see Delegation).

After the complete plan has been assembled, and before presenting it through the plan-review mechanism or beginning autopilot execution, apply the shared `plan-checker` risk screen. Invoke it when any authoritative trigger is present: three or more phases; high-risk, destructive, security-sensitive, migration, production, permission, or irreversible work; work crossing repositories, services, environments, or externally coordinated systems; material unverified or assumption-dependent claims; or a concrete complexity reason recorded by the planner. This must be an independent delegation: pass the complete canonical plan and context to a clean `plan-checker` review task or subagent and use its returned structured record. Loading the checker's instructions and reproducing its rubric in the planner's own narrative is not delegation and does not satisfy the gate. Do not duplicate a second planning rubric here.

Pass the complete canonical plan and its available context to `plan-checker`. The checker owns readiness, evidence labels, severity classification, bounded repair cycles, and the final verdict. In interactive mode, preserve unresolved decisions for the question mechanism; in autopilot, apply only conservative fixes within the plan mutation boundary. A checker verdict of `not-ready` blocks handoff or execution until repaired and rechecked. Do not wait indefinitely for delegation: if the independent review task does not return a structured result in the available turn, treat the checker as unavailable. If the checker is unavailable, continue only as `unchecked`, record the limitation and affected risk, and do not claim that the plan passed review. Smaller, reversible plans may skip this separate review when no trigger is present.

In the handoff response, explicitly report that the shared `plan-checker` risk screen ran and state its verdict. Name the checker-owned responsibilities (readiness, evidence labels, severity, bounded repair cycles, and final verdict) rather than presenting a second planner rubric. If the verdict is `not-ready`, state that handoff is blocked; if the checker was unavailable, state `unchecked`, name the limitation and affected risk, and do not describe the plan as passed or approved.

Use this exact status shape when the risk screen is triggered: `Plan-checker: <ready|not-ready|unchecked>; owns readiness, evidence labels, severity, bounded repair cycles, and final verdict.` Add `Handoff: blocked` for `not-ready`, or `Handoff: unchecked; limitation: <reason>; affected risk: <risk>` for `unchecked`.

Present through the plan-review mechanism with the plan's location, phase list, and next action.

### 5. Elaborate a phase just in time

Elaborate a phase's steps only immediately before it starts, informed by what has been completed, validated, and decided.

- **Interactive**: only when the user asks to start that phase. First ask that phase's unresolved questions (not outline-level ones already answered, and nothing about other phases). Write the steps into the plan, present them, and wait for confirmation before executing.
- **Interactive + session-only handoff**: when the user wants a complete plan delivered in this conversation rather than later phase-by-phase execution, treat outline confirmation as the request to elaborate phases in order. A request to continue "starting with Phase 1" is an explicit pre-execution trigger: treat the phase summary in that request as the approved outline even if no earlier transcript or file is available, infer the smallest coherent Phase 1 output and steps, stop broad discovery, immediately write or present only Phase 1's concrete steps with Checks, ask only Phase 1's unresolved questions, and wait for the user's confirmation before executing or elaborating the next phase. The first response must stop after the Phase 1 steps and checkpoint; it may mention later phase names only, never their steps, questions, or validation. Do not ask the user to resend the approved outline, assemble all phase steps, or run an optional risk screen before this Phase 1 checkpoint. After Phase 1 is confirmed/completed, repeat the same scoped question-and-confirmation checkpoint for Phase 2 and later phases.
- **Autopilot**: elaborate automatically before each phase, record any assumptions as decisions, and run a go/no-go check that the steps together satisfy the completion criteria before executing.

Write the steps yourself. Your context holds the decisions, rejected alternatives, and discovery results; a subagent planning the phase would rebuild them from a summary and lose some. If the phase needs more facts, send read-only discovery subagents for them, then plan.

Keep each step small enough to finish and verify in one pass, and give it:

- An imperative action and the files or components it touches.
- A **Check**: the command or observable result that proves it's done. If no mechanical check exists, say how a reviewer judges it.
- **Depends**: prerequisite steps, if any.
- A **Group** label, only if parallel-safe: it touches no files or state that another step in the group touches, and has no ordering dependency within the group.
- A **Tier** hint, only when steps may be delegated: `light` for short, conventional work with a mechanical Check; `deep` for judgment across many files, unfamiliar territory, security- or data-sensitive changes, or anything without a mechanical Check; `standard` otherwise. Smaller models are cost-effective on well-trodden, verifiable work; mistakes in unverifiable work are expensive to catch, which is where capability pays for itself.

Split along context boundaries, not work types. The step that implements a change should also write its tests, because it already holds the context; separating implement, test, and review of the same change into different steps or agents forces lossy handoffs. Separate verification is worth it only when it can be done from outside, such as running a test suite.

Phase boundaries can change as understanding improves. Split, merge, reorder, or rename phases as needed, and record each change as a decision with its rationale.

### 6. Execute and maintain

These rules bind whoever executes, and the plan's Execution Protocol restates them.

- Update the plan after every durable state transition, before continuing. Do not duplicate evidence across Current State, the active step, and Progress Log.
- Mark a step complete only after running its Check and recording the command and outcome on that step. In interactive mode, whenever completing an operation or step while the plan is not yet complete, prompt the user to perform any actions that require manual testing; when there is nothing yet to have the user test, state "No checkpoint tests yet."
- If a step's premise proves false, or finishing it would require changes outside its scope, stop the step, mark it `[!]`, record the evidence, and replan the remaining steps of the phase (autopilot) or ask the user (interactive). Improvising around a broken assumption is how plans silently diverge from reality.
- **Phase gate**: run the phase's full Validation, not a subset, and compare the results against its completion criteria. A partial check that happens to pass is the most common false completion.
  - Interactive: record the output and evidence. When the checkpoint defines a User Test, stop and ask the user to perform its action and answer the free-text observation prompt; record the response as user-provided evidence and resolve contradictions or insufficient observations before asking one structured question: continue to the next phase (which triggers its elaboration), revise, or pause. When User Test is unavailable, record its reason and then ask that continuation question. Reaching a checkpoint never starts the next phase by itself. Anything flagged for the user's interest becomes the immediate next step, marked `[?]`, and you stop for input. If the user defers it, move it to a specific later phase or to Deferred Items with a trigger; never drop it.
  - Autopilot: continue only on go; on no-go, fix or replan within the phase. Record a non-blocking user-interest item under Deferred Items with a literal review trigger such as `after implementation` and continue. Preserve the user's requested trigger wording when one is supplied. Stop only for safety, missing authorization, destructive ambiguity, or an unrecoverable blocker.
- **Commit message** (interactive checkpoints only): if source code changed during the phase and is at a viable, self-contained point, end the checkpoint response with a suggested single-line commit message in a fenced `text` block before asking for any awaiting-user input; if source code changed but isn't viable yet (broken, partial, or failing verification), explicitly say the message is deferred and that it should be suggested once further changes make the code self-contained and verification passes; if no source code changed, provide no commit message or commit-like text. Format the message as concise, single-line, and imperative: start the message with `<TICKET>: <summary>`. Otherwise, use strictly semantic commit formatting (`<type>: <summary>` or `<type>(<scope>): <summary>`) with standard lowercase types (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`).
- **Compaction**: when a phase completes, replace each step with a one-line result that preserves its exact Check command or observation and outcome. The compacted step is the sole owner of that evidence: Validation continues to describe the prescribed phase gate, while Progress Log records only the transition without restating the command or outcome. Remove command and outcome details from every Progress Log entry for the completed phase, then verify each evidence pair appears only on its owning step (excluding prescriptive Validation commands). Never discard the evidence needed to audit completion.

### 7. Complete and archive

When the last phase passes its gate, run final validation, finish every content and metadata edit, set Status to completed, and confirm the file is complete. For every completed repo-backed plan, immediately perform a filesystem move (`mv`) to `docs/plans/archive/<descriptive-slug>.md`; do not merely describe the move or ask for confirmation. Use a filesystem move (`mv`) or by writing the archive file and then deleting the original. If the requester asks to copy it and leave the active file, refuse that part and still perform the required relocation. Treat archive as complete only when `docs/plans/archive/<descriptive-slug>.md` exists and `docs/plans/<descriptive-slug>.md` does not, then verify both paths. After relocate, verify only; do not recreate or edit the active-path file. Never copy-and-keep. Never `git mv`, stage, commit, or otherwise mutate the Git index.

## Delegation

Record one of two settings in the plan metadata:

- **Single agent** (default): execute in dependency order.
- **Parallel where safe**: dispatch steps or phases sharing a Group label to subagents concurrently; each returns its result and evidence, and one agent merges them into the plan. Choose this only when at least two parallel-safe units exist and the gain in wall-clock time or breadth justifies the cost, since parallel agents typically multiply token use several times over.

Choose from the work's structure, record the rationale, and let the user override at review. If the executing harness has no subagents, run as a single agent in dependency order and log the fallback; never fail for lack of them. In every case, keep writes to shared files single-threaded: parallelism is safest for reading, research, and independent components with clean interfaces.

Discovery fan-out during planning (step 1) is separate from this setting and available in both modes.

## Plan Template

Adapt detail to the task. In the Execution Protocol, keep only the variant of each line that matches the plan's mode and delegation.

```markdown
# <Plan title>

## Plan Metadata

- Status: drafting | ready | in-progress | blocked | completed
- Mode: interactive | autopilot
- Delegation: single agent | parallel where safe (<rationale>)
- Storage: docs/plans/<slug>.md | harness-native (<description>) | session-only
- Last updated: <timestamp>
- Goal: <observable outcome>
- Success criteria: <measurable list>
- Constraints and assumptions: <list>

## Current State

- Current phase: <phase or not started>
- Current step: <step id, active group id, or not started>
- Next action: <exactly one action>
- Blockers: <list or none>

## Execution Protocol

Any agent executing this plan follows these rules.

1. Read Current State first and perform exactly the Next action.
2. Status markers: `[ ]` pending, `[-]` in progress, `[x]` complete, `[!]` blocked, `[?]` awaiting user.
3. Elaborate a phase's steps only when it starts. <Interactive: only after the user asks to start it; confirm the steps with the user before executing. | Autopilot: automatically, then check that the steps cover the completion criteria before executing.>
4. Phase boundaries are revisable: split, merge, reorder, or rename phases when evidence changes the design, and record the decision and rationale.
5. Mark a step `[x]` only after running its Check; record the command and outcome on the step. <Interactive: when completing a step while the plan is not yet complete, prompt the user to perform any actions ready for manual testing, or state "No checkpoint tests yet." if there is nothing yet to test. | Autopilot: proceed to the next step.>
6. Update this file after every durable state transition, before continuing. Record each fact once in its owning section; don't rewrite the file.
7. If a step's premise is false or it needs changes outside its scope, mark it `[!]`, log the evidence, and <ask the user | replan the rest of the phase and record the decision>. Don't improvise around it.
8. <Parallel only: steps sharing a Group may run concurrently in subagents; merge results here one at a time. If subagents are unavailable, run in dependency order and log the fallback.>
9. Phase gate: run the phase's full Validation, not a subset. <Interactive: stop, report evidence, and ask whether to continue, revise, or pause. If code changed and is viable, include a suggested one-line commit message in a `text` code block; if it changed but isn't viable, say the message is deferred; if no code changed, omit it. | Autopilot: continue only on go; on no-go, fix or replan. Stop only for safety, missing authorization, destructive ambiguity, or an unrecoverable blocker.>
10. Git is read-only: status, diff, log, show, and branch listing only. Never stage, commit, branch, or push.
11. When a phase completes, collapse each step to a one-line result that retains its Check and outcome as the sole evidence record. Keep Validation prescriptive; remove commands and outcomes from completed-phase Progress Log entries; verify each evidence pair appears only on its owning step.
12. When every phase passes, run final validation and set Status to completed<, then move this file to `docs/plans/archive/` and never touch the old path>.

## Decisions

- <decision; rationale; date> (include conventions and interfaces executors must follow)

## Deferred Items

- <item; destination phase or trigger; rationale>

## Phase 1: <domain-based name>

### Tangible output

### Completion criteria

### Context

<key files, interfaces, conventions, and decisions an executor needs>

### Dependencies and risks

### Steps

_Not yet elaborated. Populate immediately before this phase starts._

<!-- Elaborated form:
- [ ] P1.S1: <imperative action>
  - Files: <paths>
  - Check: <command or observable>
  - Depends: <step ids or none>
  - Group: <id, only if parallel-safe>
  - Tier: <light | standard | deep, only if delegation may occur>
-->

### Validation

<commands or observations that prove the completion criteria>

### Checkpoint

<interactive: User Test action, free-text observation prompt, and independent-evidence rationale; or User Test unavailable with reason, then user confirmation per protocol line 8 | autopilot: go/no-go gate with no user-test checkpoint>

<!-- Add further domain-based phases only when the work warrants them. -->

## Progress Log

- <timestamp>: <event and evidence, one line>
```

Step identifiers stay stable so updates are easy to audit. Whenever work is active there is exactly one Next action; during parallel execution, Current step names the active group.

## Before Presenting

Confirm that:

- Every clarification is answered or recorded as an assumption, and mode, storage, and delegation (with rationale) are explicit.
- Up-front questions stayed at outline level, with phase-level questions deferred.
- Phases are domain-based, each with a tangible output, completion criteria, validation, context, and checkpoint, and none has steps before its turn.
- The Execution Protocol is present, matches the mode and delegation, and includes the read-only git rule.
- Every elaborated step has a Check, and Group labels appear only on parallel-safe steps.
- A fresh agent could execute the plan without this conversation or a specific IDE.
- Current State reflects the latest state with exactly one Next action.
- For session-only storage, the final deliverable is the complete, self-contained document.
