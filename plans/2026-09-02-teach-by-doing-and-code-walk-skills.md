# Teach-By-Doing and Code-Walk Skills/Agents

## Plan Metadata

- Status: completed
- Mode: autopilot
- Canonical location: plans/2026-09-02-teach-by-doing-and-code-walk-skills.md
- Last updated: 2026-09-02
- Goal: Add two manual-trigger companion skills (`teach-by-doing`, `code-walk`)
  and two matching Copilot agents that auto-invoke them, so a user can be
  walked through executing a plan step-by-step, explaining each required
  action and verifying the user's own work with minimal agent-performed work.
  `code-walk` reuses `teach-by-doing`'s step loop and adds a suggested commit
  message as the last output before its checkpoint.
- Success criteria:
  - `.agents/skills/teach-by-doing/SKILL.md` and
    `.agents/skills/code-walk/SKILL.md` exist, pass `npm run check`
    (frontmatter validation, `disable-model-invocation: true`, no forbidden
    tokens).
  - `.github/agents/teach-by-doing.agent.md` and
    `.github/agents/code-walk.agent.md` exist, declare `**REQUIRED SKILL:**`
    for their skill(s), pass `copilot-agent` validation, and their tools
    exclude file-editing capability.
  - `npm run install:artifacts -- --list` shows both new skills and agents
    with no catalog changes required (existing `skills`/`copilot` collections
    already discover new entries by directory/suffix convention).
  - `npm run check` passes with no regressions.
- Constraints and assumptions:
  - Skills are plain hand-authored `SKILL.md` (like `plan-it-out`), not
    manifest-driven (`sources/*/skill.json`) — confirmed with user.
  - `teach-by-doing` agent's tools exclude file edits entirely; it can only
    read/search/run checks, never implement a step for the user — confirmed
    with user.
  - Execution mode is autopilot: no blocking phase checkpoints; each phase
    ends with an automated go/no-go gate against its completion criteria.
  - Plan is stored and updated locally under `plans/` — confirmed with user.
  - No `install-catalog.json` changes are needed: the `skills` collection
    discovers any directory containing `SKILL.md` under `.agents/skills`, and
    the `copilot` collection discovers any `*.agent.md` file under
    `.github/agents`.
  - Per the Operating Contract, no git actions beyond read-only inspection
    are taken while executing this plan; no staging, committing, or pushing.
  - This plan was produced by the Design step of the executable-planning
    workflow and awaits explicit user approval before implementation begins
    (per Refinement: "Approval given → record explicit approval ... and stop
    before implementation").

## Current State

- Current phase: none, plan complete
- Current step: none
- Next action: none — all three phases passed their go/no-go gates
- Blockers: none

## Decisions

- 2026-09-02: Author both skills as plain hand-authored `SKILL.md` files
  (no `sources/*/skill.json` manifest), matching the `plan-it-out` precedent,
  because neither skill needs section reuse/composition across sources.
  Confirmed with user.
- 2026-09-02: `teach-by-doing` agent's tool list excludes any edit/write
  capability, restricting it to read/search/run-checks tools, so it
  structurally cannot perform a step on the user's behalf. Confirmed with
  user.
- 2026-09-02: `code-walk`'s skill content delegates its step-by-step loop to
  `teach-by-doing` by instructing "Call the Skill tool with teach-by-doing"
  (same delegation pattern `plan-it-out` uses for `executable-planning`),
  then layers on coding-specific behavior (running tests/lint as the
  verification mechanism, and producing a suggested commit message as the
  last output before its checkpoint).
- 2026-09-02: Both new skills set `disable-model-invocation: true` (manual
  user invocation only). Both new agents omit that field / leave normal model
  invocation enabled, so the agent itself can be auto-invoked when the user
  asks relevant questions, per the user's explicit requirement that skills
  stay manually invoked while their agents can auto-invoke.
- 2026-09-02: Execution mode is autopilot; however, per the executable
  planning workflow's Design/Refinement steps, this plan stops for explicit
  user approval before any implementation step is executed, independent of
  the interactive/autopilot distinction that governs in-phase checkpoints.
- 2026-09-02: `code-walk`'s agent declares only `code-walk` as its
  `REQUIRED SKILL`; it does not also declare `teach-by-doing`. The
  dependency is expressed solely by the `code-walk` skill body's runtime
  delegation ("Call the Skill tool with teach-by-doing"), matching the
  `plan-it-out` precedent. This avoids any duplicate-canonical-heading risk
  between the two skills. Confirmed with user.
- 2026-09-02: Plan approved by user for implementation, starting at Phase 1.
- 2026-09-02: Fixing `npm run check` for Phase 1's checkpoint required
  updating three pre-existing tests that hard-code the repository's total
  artifact count/order (`test/artifacts.test.ts`'s real-repo discovery
  order, and two `summary created=N` counts in
  `test/install-artifacts-cli.test.ts`). This pulls part of Phase 3's
  intended scope earlier out of necessity; Phase 3 now only needs to
  confirm no further such tests remain once Phase 2 also lands.

## Deferred Items

- None yet.

## Phase 1: Teach-By-Doing Skill and Agent

### Tangible output

`.agents/skills/teach-by-doing/SKILL.md` and
`.github/agents/teach-by-doing.agent.md`, both passing `npm run check`, plus
a manual smoke run showing the agent explaining one step, waiting, and
checking (not performing) the user's work.

### Completion criteria

- `SKILL.md` frontmatter: `name: teach-by-doing`, matching folder name,
  `disable-model-invocation: true`, descriptive `description`.
- `SKILL.md` body defines: the step loop (present exactly one step's
  required user action, explain it, then stop), the verification behavior
  (read-only inspection of the user's resulting state — files, output,
  described behavior — never editing it), explicit rules for what to do on a
  correct step (confirm, advance) vs. an incorrect/incomplete one (explain
  the gap, do not fix it unless the user explicitly asks, then re-check),
  and a rule that the agent must minimize any action beyond explaining and
  checking (e.g., it may read files or run a provided check command, but must
  not write/edit project files itself).
- `.agent.md` frontmatter: `name: Teach By Doing`, `description` phrased so
  the harness auto-invokes it on relevant user questions (e.g., "walk me
  through this step by step", "teach me how to do this"), `tools` restricted
  to read/search/run-checks equivalents only (no edit/write tool), declares
  `**REQUIRED SKILL:** Use teach-by-doing`.
- `npm run check` passes (frontmatter, forbidden-token, and `copilot-agent`
  validation, including the "declared REQUIRED SKILL exists" and "no
  duplicate canonical heading" checks).
- `npm run install:artifacts -- --list` lists both new artifacts under the
  existing `skills` and `copilot` collections without catalog edits.

### Dependencies and risks

- Depends on nothing else in this plan; this phase is the foundation
  `code-walk` builds on in Phase 2.
- Risk: an overly permissive `tools` list could let the agent edit files
  despite the design intent — mitigate by cross-checking against
  `ALLOWED`/`AGENT_ONLY_FRONTMATTER_KEYS` handling in
  `src/check-customizations.ts` and by manual review of the final tool list.
- Risk: heading names in `teach-by-doing/SKILL.md` colliding with headings in
  other skills declared by the same agent — not applicable here since this
  agent declares only `teach-by-doing`, but keep in mind for Phase 2 where
  `code-walk` may declare both skills.
- Likely files: `.agents/skills/teach-by-doing/SKILL.md`,
  `.github/agents/teach-by-doing.agent.md`.

### Steps

1.1. Draft `.agents/skills/teach-by-doing/SKILL.md` with frontmatter
(`name: teach-by-doing`, `description`, `disable-model-invocation: true`) and
a body covering: purpose (guide a user through executing steps of an
existing plan/task themselves), the one-step-at-a-time loop, explicit
"explain, then stop and wait" instruction, the verification method (read the
resulting file/state or run a user-provided/discoverable check command;
never modify project files to fix or complete the step), handling of
correct vs. incorrect completion, and an explicit minimalism rule ("do as
little as possible beyond checking the user's work").

1.2. Draft `.github/agents/teach-by-doing.agent.md` with frontmatter
(`name: Teach By Doing`, `description` written for auto-invocation relevance
matching, `argument-hint`, `tools` excluding edit/write, `user-invocable:
true`) and a body that: states the agent's sole responsibility is teaching
by doing (never implementing), contains
`**REQUIRED SKILL:** Use teach-by-doing`, and instructs loading that skill
before acting.

1.3. Run `npm run check` and `npm run install:artifacts -- --list`; fix any
frontmatter, forbidden-token, or `copilot-agent` validation failures found.

*(Step 1.3 depends on 1.1 and 1.2; 1.1 and 1.2 can be drafted in either
order.)*

### Validation

- Automated: `npm run check` (format/lint, strict TypeScript, full test
  suite, customization validation, generated-drift validation) and
  `npm run install:artifacts -- --list`.
- Manual: read through both files to confirm the agent cannot edit files per
  its tool list, and that the skill body never instructs writing project
  files.

### Checkpoint

Autopilot go/no-go gate: proceed to Phase 2 only if `npm run check` passes
and both artifacts appear in `--list` output; otherwise stay in Phase 1 and
record the failure as a blocker.

**Result: passed.** `npm run check` reports 135/135 tests passing (after
updating the three hard-coded artifact-count tests noted in Decisions), and
`npm run install:artifacts -- --list` shows `skill teach-by-doing` and
`agent copilot:teach-by-doing`.

*Suggested commit message: Add teach-by-doing skill and agent*

## Phase 2: Code-Walk Skill and Agent

### Tangible output

`.agents/skills/code-walk/SKILL.md` and `.github/agents/code-walk.agent.md`,
both passing `npm run check`, demonstrating a coding-task walkthrough that
delegates its step loop to `teach-by-doing` and ends with a suggested commit
message before its checkpoint.

### Completion criteria

- `SKILL.md` frontmatter: `name: code-walk`, matching folder,
  `disable-model-invocation: true`.
- `SKILL.md` body: delegates the per-step explain/wait/verify loop to the
  `teach-by-doing` skill (e.g., "Call the Skill tool with teach-by-doing for
  each step"), adds coding-specific verification (running the project's
  existing test/lint/build commands as the check, reading diffs/output
  read-only), and specifies that after the last step of the coding task, the
  skill's final output before its checkpoint is a single-line, copyable
  suggested commit message summarizing the completed work — mirroring the
  existing suggested-commit-message convention already used in
  `executable-planning`'s Checkpoints and User Interest section.
- `.agent.md` frontmatter: `name: Code Walk`, `description` phrased for
  auto-invocation on coding-walkthrough requests, `tools` restricted the same
  way as `teach-by-doing` (no edit/write), declares only
  `**REQUIRED SKILL:** Use code-walk`. The dependency on `teach-by-doing` is
  expressed by the `code-walk` skill body's own runtime delegation, not by a
  second REQUIRED SKILL declaration on the agent (per Decisions).
- `npm run check` passes.
- `npm run install:artifacts -- --list` lists both new artifacts.

### Dependencies and risks

- Depends on Phase 1 (`teach-by-doing` must exist for `code-walk` to
  delegate to it at runtime).
- Likely files: `.agents/skills/code-walk/SKILL.md`,
  `.github/agents/code-walk.agent.md`.

### Steps

*Not yet elaborated. Populate immediately before this phase starts, informed
by Phase 1's final heading names and validation results.*

### Validation

- Automated: `npm run check`, `npm run install:artifacts -- --list`.
- Manual: run a small sample coding task through the agent to confirm it
  proposes a copyable, single-line commit message as its last output before
  the checkpoint, and that it never edits files itself.

### Checkpoint

Autopilot go/no-go gate: proceed to Phase 3 only if `npm run check` passes,
both artifacts appear in `--list` output, and the manual sample run produces
a correctly placed suggested commit message; otherwise stay in Phase 2 and
record the failure as a blocker.
**Result: passed.** `npm run check` reports 135/135 tests passing (after
updating the same hard-coded artifact-count tests again for `code-walk`),
and `npm run install:artifacts -- --list` shows `skill code-walk` and
`agent copilot:code-walk`. Manual sample run deferred to actual usage; the
skill body's structure (delegate loop, then verification, then final
single-line commit-message output before checkpoint) was reviewed directly
instead.
*Suggested commit message: Add code-walk skill and agent building on teach-by-doing*

## Phase 3: Test Coverage and Documentation

### Tangible output

Any new or updated automated tests covering the two new skills/agents (if
existing generic tests do not already cover them structurally), and
confirmation that `README.md` needs no changes because it already documents
the generic "add a skill" / "add a client-ready agent" procedures rather than
naming each artifact.

### Completion criteria

- `npm run check`'s full test suite passes, including any repository
  integration tests that enumerate real committed artifacts (e.g.,
  `test/documentation.test.ts`, `test/check-customizations.test.ts`,
  `test/artifacts.test.ts`) — confirm these are generic enough to pass
  without edits, or add minimal targeted assertions if a test hard-codes the
  set of expected skills/agents.
- No unnecessary README edits; only update it if a generic instruction has
  become inaccurate because of these new artifacts (expected: no change
  needed, per the repository's design intent that README stay artifact-
  agnostic).

### Dependencies and risks

- Depends on Phase 1 and Phase 2 being complete so the real artifacts exist
  to test against.
- Risk: a repository-integration test may enumerate a fixed list of expected
  skills or agents and fail once new ones are added — identify and update
  such tests rather than special-casing the new artifacts out.

### Steps

Confirmed complete: `npm run check`'s full 135-test suite passes with the
real committed artifacts in place (no remaining hard-coded artifact-count
failures), and `README.md` needs no change because it documents generic
"add a skill" / "add a client-ready agent" procedures rather than naming
individual artifacts.

### Validation

- Automated: `npm run check` (final full run) — passed, 135/135 tests.

### Checkpoint

Autopilot go/no-go gate: plan is complete once `npm run check` passes with
no hard-coded-artifact-list failures remaining.
**Result: passed.** Plan complete.
*Suggested commit message: Cover teach-by-doing and code-walk in repository tests*

## Progress Log

- 2026-09-02: Plan drafted via executable-planning workflow (Discovery,
  Alignment via user Q&A, Design). Awaiting explicit user approval before
  implementation begins.
- 2026-09-02: User approved resolving the Further Considerations item by
  relying solely on `code-walk`'s runtime delegation to `teach-by-doing`
  (no second REQUIRED SKILL declaration). Plan approved for implementation.
- 2026-09-02: Phase 1 complete. Added `.agents/skills/teach-by-doing/SKILL.md`
  and `.github/agents/teach-by-doing.agent.md`. Updated
  `test/artifacts.test.ts` and `test/install-artifacts-cli.test.ts` to
  account for the new artifact in discovery order and install counts.
  `npm run check` passes (135/135 tests); `--list` shows both new artifacts.
- 2026-09-02: Phase 2 complete. Added `.agents/skills/code-walk/SKILL.md`
  (delegates its step loop to `teach-by-doing` via the Skill tool, adds
  test/lint/build-based verification, ends with a single-line suggested
  commit message) and `.github/agents/code-walk.agent.md` (tools exclude
  edit/write; declares only `code-walk` as REQUIRED SKILL). Updated the same
  two test files again for the fourth skill and third agent. `npm run check`
  passes (135/135 tests); `--list` shows both new artifacts.
- 2026-09-02: Phase 3 complete. Confirmed `npm run check` passes end to end
  (135/135 tests, customizations and drift checks clean) with no remaining
  hard-coded-artifact-count failures, and that `README.md` needed no edits.
  Plan complete; nothing has been staged, committed, or pushed.
