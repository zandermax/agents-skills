## Invariants

These hold in every mode and override anything below.

- **One canonical plan.** It holds all state: completed and current work, validation evidence, decisions, blockers, user-interest items, and deferrals. Chat summaries never substitute for updating it. Update it after every material event: step completion, validation result, scope change, new decision, blocker, failed assumption, user feedback, or deferral.
- **Git is read-only.** Inspection only (`status`, `diff`, `log`, `show`, branch listing). Never stage, commit, create branches, or push, and never write a plan that instructs it. Suggesting a commit message for the user is fine; it is text, not a git action.
- **Evidence before assertion.** Treat fresh tool output as the sole evidence for claims about repository state, uncommitted changes, validation results, or completion. Do not infer those facts from prior conversation context, file listings, or stale command output. When the required check cannot run, state that the result is unverified and name the unavailable check rather than claiming success or a clean state.
- **Read before asking.** Never ask the user what the repository, its docs, or an existing plan can answer.
- **Tool-agnostic plans.** Plans describe outcomes and checks, not IDE tool names or UI, so they run in any harness.

## Harness Mechanisms

This skill names four abstract mechanisms; the invoking agent maps them to concrete tools.

- **Question mechanism**: the harness's structured question tool. In interactive mode, use it for every question, confirmation, and awaiting-user item, batching everything unresolved into one prompt with predefined options where answers are fixed. Fall back to plain conversation only if none exists. In autopilot mode, ask during planning only when an answer is needed to avoid an unsafe, destructive, or fundamentally invalid plan; once execution begins, never ask.
- **Plan-review mechanism**: the harness's tool for reviewing a finished plan and starting execution. Use it whenever the plan, or a newly elaborated phase, is ready to begin. Without one, present in conversation; interactive mode then waits for an explicit start request, and autopilot begins.
- **Subagent mechanism**: used for read-only discovery and, when the plan allows, parallel execution (see Delegation). If unavailable, record the limitation and proceed as a single agent.
- **Persistence**: whatever writes the canonical plan (see step 3). Edit the changed sections; don't regenerate the whole plan.

## Workflow

### 1. Discover

Inspect the relevant code, tests, docs, and any existing plan for this effort before asking anything. Gather the smallest set of facts that defines the outcome, affected components, conventions, and how changes will be validated.

When discovery spans two or more independent areas, or would pull large amounts of irrelevant text into your context, fan it out to read-only subagents in parallel. Give each a narrow question and ask for a compact report: relevant files, interfaces and conventions, existing validation commands, risks, and anything contradicting the question's premise. Keep synthesis and every decision in your own context: subagents gather facts; they don't plan. Record findings in the plan, not only in chat.

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

- **Repo-backed**: one plan at `docs/plans/<descriptive-slug>.md`, creating the directory if needed. Continue an existing plan for the same effort instead of creating a competing file. If no git repository exists but this was chosen explicitly, create it anyway and note in the plan that it is not version-controlled.
- **Harness-native**: the harness's own persistent plan artifact. Some harness plan stores are session-scoped; if so, warn that the plan may not outlive the session. If the harness has no plan store, keep one clearly labeled canonical plan in conversation with the same warning.
- **Session-only**: write no file anywhere during planning. Warn once, up front, that conversation state may not survive and that the plan will be delivered as one final document. After each material event, show the changed sections and updated Current State rather than reprinting the whole plan. When planning concludes, deliver the complete plan as one self-contained markdown document a fresh agent could execute with no access to this conversation; every open question is resolved or recorded as an explicit assumption first.

If nothing was chosen or inferable: interactive mode asks as part of step 2; autopilot uses repo-backed when a repository exists and harness-native otherwise, recording the assumption.

### 4. Design the outline

Organize the work into domain-based phases, each a coherent product, system, or problem boundary, never a generic activity like "coding" or "testing". Use a single phase for small, self-contained work with one inspectable outcome and one validation path; add phases only when distinct boundaries, dependencies, or independently reviewable outputs justify them. Prefer thin end-to-end increments over horizontal layers, and order phases so each output reduces uncertainty for the next.

Give every phase a tangible output (something that can be inspected, run, measured, or demonstrated), completion criteria, validation, dependencies and risks, recovery considerations where relevant, the context an executor needs (key files, interfaces, conventions, and decisions in force), and a checkpoint for the mode.

Don't write steps yet. Steps written before earlier phases have run are guesses that go stale and cost tokens to rewrite, so the initial plan is a table of contents of scoped phases.

Choose the delegation setting and record why (see Delegation).

For large or high-stakes plans, consider a clean-context review: give a read-only subagent only the plan and the code it references, and ask it to find completion criteria the validation wouldn't actually prove, context an executor would lack, parallel groups that share files or state, and assumptions the code contradicts. A fresh reader catches what the author can't. Skip this for small plans.

Present through the plan-review mechanism with the plan's location, phase list, and next action.

### 5. Elaborate a phase just in time

Elaborate a phase's steps only immediately before it starts, informed by what has been completed, validated, and decided.

- **Interactive**: only when the user asks to start that phase. First ask that phase's unresolved questions (not outline-level ones already answered, and nothing about other phases). Write the steps into the plan, present them, and wait for confirmation before executing.
- **Session-only, continuous**: when no separate execution session will follow, treat confirmation of the outline as the request to continue, and elaborate phases in order within the same conversation, still asking each phase's questions and confirming its steps before moving on.
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

- Update the plan after every material event, before continuing.
- Mark a step complete only after running its Check and logging the evidence (command and outcome).
- If a step's premise proves false, or finishing it would require changes outside its scope, stop the step, mark it `[!]`, record the evidence, and replan the remaining steps of the phase (autopilot) or ask the user (interactive). Improvising around a broken assumption is how plans silently diverge from reality.
- **Phase gate**: run the phase's full Validation, not a subset, and compare the results against its completion criteria. A partial check that happens to pass is the most common false completion.
  - Interactive: record the output and evidence, then ask one structured question: continue to the next phase (which triggers its elaboration), revise, or pause. Reaching a checkpoint never starts the next phase by itself. Anything flagged for the user's interest becomes the immediate next step, marked `[?]`, and you stop for input. If the user defers it, move it to a specific later phase or to Deferred Items with a trigger; never drop it.
  - Autopilot: continue only on go; on no-go, fix or replan within the phase. Stop only for safety, missing authorization, destructive ambiguity, or an unrecoverable blocker.
- **Commit message** (interactive checkpoints only): if code changed during the phase and is at a viable, self-contained point, end the checkpoint with a suggested single-line commit message in a fenced `text` block; if code changed but isn't viable yet (broken, partial, or failing verification), say the message is deferred until it is; if no code changed, omit it. Format the message as concise, single-line, and imperative: start the message with `<TICKET>: <summary>`. Otherwise, use strictly semantic commit formatting (`<type>: <summary>` or `<type>(<scope>): <summary>`) with standard lowercase types (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`).
- **Compaction**: when a phase completes, replace its step list with one-line results and evidence references, and keep Progress Log entries to one line each. Executors re-read the plan constantly, and finished detail crowds out current state.

### 7. Complete and archive

When the last phase passes its gate, run final validation, finish every content and metadata edit, set Status to completed, and confirm the file is complete. For repo-backed plans, relocate that file to `docs/plans/archive/<descriptive-slug>.md` with a filesystem move (`mv`) or by writing the archive file and then deleting the original. Treat archive as complete only when `docs/plans/archive/<descriptive-slug>.md` exists and `docs/plans/<descriptive-slug>.md` does not. After relocate, verify only; do not recreate or edit the active-path file. Never copy-and-keep. Never `git mv`, stage, commit, or otherwise mutate the Git index.

## Delegation

Record one of two settings in the plan metadata:

- **Single agent** (default): execute in dependency order.
- **Parallel where safe**: dispatch steps or phases sharing a Group label to subagents concurrently; each returns its result and evidence, and one agent merges them into the plan. Choose this only when at least two parallel-safe units exist and the gain in wall-clock time or breadth justifies the cost, since parallel agents typically multiply token use several times over.

Choose from the work's structure, record the rationale, and let the user override at review. If the executing harness has no subagents, run as a single agent in dependency order and log the fallback; never fail for lack of them. In every case, keep writes to shared files single-threaded: parallelism is safest for reading, research, and independent components with clean interfaces.

Discovery fan-out during planning (step 1) is separate from this setting and available in both modes.

## Plan Template

Adapt detail to the task. In the Execution Protocol, keep only the variant of each line that matches the plan's mode and delegation.

````markdown
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
4. Mark a step `[x]` only after running its Check; log the command and outcome in the Progress Log.
5. Update this file after every step, validation, decision, blocker, failed assumption, scope change, piece of user feedback, or deferral, before continuing. Edit sections; don't rewrite the file.
6. If a step's premise is false or it needs changes outside its scope, mark it `[!]`, log the evidence, and <ask the user | replan the rest of the phase and record the decision>. Don't improvise around it.
7. <Parallel only: steps sharing a Group may run concurrently in subagents; merge results here one at a time. If subagents are unavailable, run in dependency order and log the fallback.>
8. Phase gate: run the phase's full Validation, not a subset. <Interactive: stop, report evidence, and ask whether to continue, revise, or pause. If code changed and is viable, include a suggested one-line commit message in a `text` code block; if it changed but isn't viable, say the message is deferred; if no code changed, omit it. | Autopilot: continue only on go; on no-go, fix or replan. Stop only for safety, missing authorization, destructive ambiguity, or an unrecoverable blocker.>
9. Git is read-only: status, diff, log, show, and branch listing only. Never stage, commit, branch, or push.
10. When a phase completes, collapse its steps to one-line results with evidence.
11. When every phase passes, run final validation and set Status to completed<, then move this file to `docs/plans/archive/` and never touch the old path>.

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

<interactive: user confirmation per protocol line 8 | autopilot: go/no-go gate>

<!-- Add further domain-based phases only when the work warrants them. -->

## Progress Log

- <timestamp>: <event and evidence, one line>
````

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
