---
status: in-progress
mode: interactive
canonical_location: docs/plans/2026-09-03-skill-forge-skill.md
last_updated: 2026-09-03
current_phase: none
current_step: none
next_action: none — awaiting user confirmation of Phase 3
blockers: none
---

# Skill Forge Skill

## Plan Metadata

- Status: in-progress
- Mode: interactive
- Canonical location: docs/plans/2026-09-03-skill-forge-skill.md
- Last updated: 2026-09-03
- Goal: Add a new hand-authored skill, `skill-forge`, to this repository that
  helps a user create new agent skills. It draws on this repo's existing
  skill-creation references (`writing-skills`, `skill-creator-egym`) for
  structure and quality bar, and it embeds the "grilling" design-tree
  interview technique (numbered rounds, a frontier of unblocked questions,
  recommended answers, agent-finds-facts-not-user) from
  `mattpocock/skills` (`skills/productivity/grilling` and `grill-me`) as the
  required technique for interviewing the user about a new skill's purpose,
  triggers, and scope.
- Success criteria:
  - `.agents/skills/skill-forge/SKILL.md` exists, is hand-authored (no
    `sources/skill-forge/skill.json`), and passes `npm run check` (frontmatter
    limited to `name`/`description`/optional `disable-model-invocation`,
    folder name matches frontmatter `name`, no forbidden IDE-tool-name
    tokens).
  - The skill's body requires a grilling-style interview (numbered rounds,
    frontier, recommended answers, agent dispatches sub-work to find facts
    instead of asking the user) before drafting a new skill's frontmatter and
    body.
  - The skill's body defines a lightweight TDD-for-skills verification loop
    (baseline pressure scenario without the skill, then with the skill,
    compare) without requiring benchmark scripts, an eval viewer, or
    `evals/evals.json` scaffolding.
  - The skill's body states the repo's own authoring constraints so a drafted
    skill will pass `npm run check` on the first attempt: allowed frontmatter
    keys, folder/name matching, forbidden literal tokens, hand-authored vs.
    manifest-driven decision criteria (per `AGENTS.md`), and the
    `npm run build` / `npm run check` validation step.
  - `npm run install:artifacts -- --list` shows `skill-forge` with no
    `install-catalog.json` changes (the `skills` collection already discovers
    any directory with `SKILL.md` under `.agents/skills`).
  - `npm run check` passes with no regressions.
- Constraints and assumptions:
  - Hand-authored, not manifest-driven — confirmed with user.
  - Name/slug: `skill-forge` — confirmed with user.
  - Grilling philosophy is embedded as the required interview technique
    inside `skill-forge` itself; the standalone `grilling`/`grill-me` skills
    from `mattpocock/skills` are not vendored as separate artifacts in this
    repo — confirmed with user.
  - Verification rigor is the lighter TDD-for-skills approach (pressure
    scenario, baseline vs. with-skill comparison), not the full eval-loop
    with benchmark scripts and a viewer — confirmed with user.
  - Guidance stays harness-agnostic, installable via this repo's catalog to
    Copilot, Claude, and the generic `.agents/skills` destination — confirmed
    with user.
  - Per the Operating Contract, no git actions beyond read-only inspection
    are taken while executing this plan; no staging, committing, or pushing.
  - Reference material already gathered during Discovery (not to be
    re-fetched): `writing-skills` SKILL.md structure/SDO/TDD-for-skills
    mapping; `skill-creator-egym` SKILL.md interview/eval-loop structure;
    `mattpocock/skills` `skills/productivity/grilling/SKILL.md` (design tree,
    frontier, rounds, format, agent-finds-facts rule) and
    `skills/productivity/grill-me/SKILL.md` (thin user-invoked wrapper that
    calls `grilling`); this repo's `AGENTS.md` (hand-authored vs.
    manifest-driven choice), `README.md` (`Adding Skills` section), and
    `src/check-customizations.ts` (allowed frontmatter keys, forbidden
    tokens, name/folder matching, headings rules).

## Current State

- Current phase: none — Phase 3 complete
- Current step: none
- Next action: none — awaiting explicit user confirmation before
  considering this plan closed
- Blockers: none

## Decisions

- 2026-09-03: `skill-forge` is user-invoked only (`disable-model-invocation:
true`), reachable only when the user explicitly asks for it by name, like
  `grill-me`. Confirmed with user.
- 2026-09-03: The drafted skill's default destination is
  `.agents/skills/<name>/SKILL.md` in this repository; the user still
  chooses hand-authored vs. manifest-driven per `AGENTS.md`. Confirmed with
  user.
- 2026-09-03: Include one compact worked example (a sample grilling round
  plus the resulting draft snippet) so the format is concrete, not purely
  instructional prose. Confirmed with user.
- 2026-09-03: Considered mirroring the `grill-me`/`grilling` two-file split
  (thin user-invoked delegator + separate model-invokable core skill) but
  rejected it — `skill-forge` stays a single user-invoked-only file holding
  all the logic itself, since there is no separate need for the model to
  reach the grilling logic on its own outside of skill authoring. Confirmed
  with user.
- 2026-09-03: Author `skill-forge` as a single hand-authored `SKILL.md`
  (no `sources/skill-forge/skill.json` manifest), matching the
  `teach-by-doing`/`code-walk` precedent, because it is self-contained and
  does not need section reuse/composition across sources. Confirmed with
  user.
- 2026-09-03: Embed the grilling design-tree interview technique directly in
  `skill-forge`'s body rather than vendoring `grilling`/`grill-me` as
  separate skills in this repo. Confirmed with user.
- 2026-09-03: Use a lighter TDD-for-skills verification loop (baseline
  pressure scenario vs. with-skill scenario, no benchmark/eval-viewer
  scaffolding) as the skill's built-in verification guidance. Confirmed with
  user.
- 2026-09-03: Keep the skill harness-agnostic, consistent with this repo's
  existing catalog-driven skills. Confirmed with user.
- 2026-09-03: Diagnosed why Phase 1 and Phase 2 checkpoints suggested the
  identical commit message: `Checkpoints and User Interest` told the agent
  when to show a message but never to derive its content from the actual
  uncommitted diff, and had no rule against restating an earlier phase's
  message once that phase's work was already committed. Fix: added a rule
  to `sources/executable-planning/core.md` requiring a read-only git
  status/diff check before composing a commit message, describing only
  what is currently uncommitted, never restating an earlier phase's
  message verbatim. This became Phase 3, scoped to the executable-planning
  skill itself rather than skill-forge. Confirmed with user.

## Deferred Items

- None yet.

## Phase 1: Skill Forge Authoring

### Tangible output

`.agents/skills/skill-forge/SKILL.md`, a complete, checked-in skill that
walks a user through: (1) grilling them about the new skill's purpose,
triggers, scope, and output format using the design-tree/frontier/rounds
technique; (2) drafting compliant frontmatter and body content per this
repo's authoring rules; (3) a lightweight baseline-vs-with-skill pressure
test to verify the draft actually changes agent behavior; (4) running
`npm run build` (if applicable) and `npm run check` before declaring the new
skill done.

### Completion criteria

- `.agents/skills/skill-forge/SKILL.md` exists with frontmatter `name:
skill-forge` and a description written in third person, "Use when..."
  style, focused on triggering conditions (per `writing-skills` SDO
  guidance), not a workflow summary.
- The body includes, at minimum, sections covering: when to use the skill;
  the required grilling-style interview (with the exact round/frontier
  format and the agent-finds-facts-not-user rule); this repo's authoring
  constraints (allowed frontmatter keys, name/folder matching, forbidden
  tokens, hand-authored vs. manifest-driven decision, build/check steps);
  and the lightweight verification loop.
- The skill contains none of the forbidden literal tokens checked by
  `src/check-customizations.ts` (`run_in_terminal`, `vscode_askQuestions`,
  `read_file`, `apply_patch`, `/memories/session/plan.md`), and its
  frontmatter contains only `name`, `description`, and optionally
  `disable-model-invocation: true`.
- `npm run install:artifacts -- --list` lists `skill-forge` under the
  `skills` collection.
- `npm run check` passes.

### Dependencies and risks

- Depends on no repo changes beyond adding the one skill directory; no
  `install-catalog.json` edits are anticipated since the `skills` collection
  auto-discovers any directory containing `SKILL.md`.
- Risk: embedding the grilling format verbatim could accidentally include a
  forbidden token or an IDE-specific tool name; mitigate by writing the
  interview instructions tool-agnostically (describe dispatching sub-work to
  find facts, not naming a specific tool) and running `npm run check` before
  declaring done.
- Risk: over-specifying the eval loop could make the skill too heavy (fails
  the "lighter TDD-for-skills" choice); mitigate by keeping that section
  concise and cross-referencing the philosophy rather than reproducing full
  eval-viewer/benchmark mechanics from `skill-creator-egym`.
- Rollback: the change is additive (one new file); reverting is a simple
  file deletion if the user rejects the draft.

### Steps

Single-agent outline (phase is small and single-domain: one new hand-authored
file; no subagent delegation needed).

1. `[x]` Draft frontmatter: `name: skill-forge`, `disable-model-invocation:
true`, and a third-person "Use when..." description naming triggers
   (creating/editing/reviewing skills) without summarizing the workflow.
2. `[x]` Write "When to Use" and "Overview" sections distinguishing
   skill-forge from ad hoc skill writing: it exists to run the grilling
   interview before drafting, and to check the draft against this repo's
   authoring rules.
3. `[x]` Write the "Grilling Interview" section: reproduce the design-tree /
   frontier / numbered-rounds / recommended-answer format tool-agnostically
   (describe dispatching sub-work to find facts instead of naming a specific
   tool), and the rule that facts are the agent's job, decisions are the
   user's. Cover the frontier topics a new skill needs settled: purpose,
   trigger phrasing, hand-authored vs. manifest-driven, output location,
   model-invoked vs. user-invoked, verification depth.
4. `[x]` Write the "Repository Authoring Constraints" section: allowed
   frontmatter keys (`name`, `description`, optional
   `disable-model-invocation: true`), folder name must match frontmatter
   `name`, forbidden literal tokens, hand-authored vs. manifest-driven
   decision criteria from `AGENTS.md`, default output path
   `.agents/skills/<name>/SKILL.md`, and the `npm run build` (manifest-driven
   only) / `npm run check` validation step.
5. `[x]` Write the "Lightweight Verification Loop" section: run one pressure
   scenario without the drafted skill (baseline), then with it, compare
   whether the target behavior changed; no benchmark/eval-viewer scaffolding.
6. `[x]` Write a compact worked example: one sample grilling round (2-3
   numbered questions with recommended answers) and the resulting draft
   frontmatter/section snippet it produces.
7. `[x]` Self-review the full draft against Completion Criteria, specifically
   scanning for the forbidden literal tokens and confirming frontmatter only
   has the three allowed keys.
8. `[x]` Create `.agents/skills/skill-forge/SKILL.md` with the finished
   content.
9. `[x]` Run `npm run install:artifacts -- --list` and `npm run check`; fix
   any reported issues and re-run until clean. Both passed cleanly:
   `skill-forge` listed under `[copilot, claude, agents]`; all 139 tests,
   markdownlint, typecheck, `check:customizations`, and `check:drift` passed.
10. `[x]` Update this plan's Current State, Progress Log, and this
    Checkpoint with validation evidence and, if the file is at a viable
    self-contained point, a suggested commit message.

### Validation

- Run `npm run install:artifacts -- --list` and confirm `skill-forge`
  appears under the `skills` collection with no catalog changes.
- Run `npm run check` and confirm it passes with no new errors.
- Manually re-read the drafted `SKILL.md` against the completion criteria
  above (frontmatter shape, required sections, forbidden-token avoidance).

### Checkpoint

Phase output and validation are recorded above. `npm run check` (which also
ran `biome --write .`) reformatted three pre-existing, unrelated files —
`sources/executable-planning/skill.json`,
`test/check-customizations.test.ts`, and
`test/executable-planning-skill.test.ts` — indentation-only changes, no
semantic diff, a side effect of the mandated check command rather than of
this plan's work. Flagged for the user's awareness; not reverted (git
actions are read-only-only per the Operating Contract, and reformatting
semantically-unchanged pre-existing files is not part of this plan's scope).

Suggested commit message:

```text
feat(skills): add skill-forge, a grilling-based skill-authoring skill
```

## Phase 2: Skill Forge Refinement

### Tangible output

A revised `.agents/skills/skill-forge/SKILL.md` incorporating the six review
findings from the post-Phase-1 read-through: an explicit `## When to Use`
heading, explicit "overhaul an existing skill" guidance, a tightened
description, a discovery-check mention in Repository Authoring Constraints,
a worked-example formatting fix, and a trim pass for length.

### Completion criteria

- `## When to Use` exists as its own top-level section (matching the
  `teach-by-doing`/`code-walk` convention), separate from `## Purpose`.
- A short passage addresses overhauling an existing skill: read the current
  file first, then grill about what's changing and why, rather than
  assuming a blank slate.
- Frontmatter `description` is tightened to remove verb redundancy
  (`create, draft, author, or overhaul` → two verbs) while keeping the same
  triggering conditions.
- "Repository Authoring Constraints" → "Validate before declaring done"
  mentions running the discovery/list check
  (`npm run install:artifacts -- --list`) alongside the build/check step.
- The Worked Example's Round 1 question bodies wrap with the same
  indentation as the format template shown earlier in the file.
- Overall word count is trimmed from the Repository Authoring Constraints
  prose where possible without losing any required rule.
- `npm run install:artifacts -- --list` still lists `skill-forge`, and
  `npm run check` still passes with no regressions.

### Dependencies and risks

- Depends only on the existing `.agents/skills/skill-forge/SKILL.md` from
  Phase 1; no other files change.
- Risk: trimming prose could accidentally drop a rule required by
  `src/check-customizations.ts` (allowed frontmatter keys, forbidden
  tokens); mitigate by re-running `npm run check` after edits.
- Risk: shortening the description could weaken triggering recall; mitigate
  by keeping all current triggering phrases, only removing redundant verbs.
- Rollback: the change is confined to one existing file; reverting to the
  Phase 1 version is a simple content restore if the user rejects it.

### Steps

Single-agent outline (phase is small and single-domain: wordsmithing one
existing file; no subagent delegation needed).

1. `[x]` Add a standalone `## When to Use` section (after `## Purpose`),
   stating the triggers plainly; trim any now-redundant "when to use" prose
   left in `## Purpose`.
2. `[x]` Add an "overhauling an existing skill" passage: read the current
   skill file first, then run the grilling interview scoped to what's
   changing and why, instead of assuming a greenfield draft.
3. `[x]` Tighten the frontmatter `description` to two non-redundant verbs
   covering create/author and overhaul, keeping existing trigger phrasing.
4. `[x]` Add a discovery-check mention (`npm run install:artifacts --
--list`) next to the existing build/check validation bullet in
   "Repository Authoring Constraints".
5. `[x]` Fix the Worked Example's Round 1 formatting so question bodies
   indent consistently with the format template shown earlier.
6. `[x]` Re-read "Repository Authoring Constraints" for trimmable prose and
   shorten where it doesn't drop a required rule.
7. `[x]` Run `npm run install:artifacts -- --list` and `npm run check`; fix
   any reported issues and re-run until clean. First run surfaced a
   markdownlint MD012 (multiple blank lines) issue in this plan file
   itself; fixed and re-ran clean: `skill-forge` still listed under
   `[copilot, claude, agents]`; all 139 tests, markdownlint, typecheck,
   `check:customizations`, and `check:drift` passed.
8. `[x]` Update this plan's Current State, Progress Log, and this
   Checkpoint with validation evidence and, if the file is at a viable
   self-contained point, a suggested commit message.

### Validation

- Run `npm run install:artifacts -- --list` and confirm `skill-forge` is
  still listed with no catalog changes.
- Run `npm run check` and confirm it passes with no new errors.
- Manually re-read the revised file against the six items above.

### Checkpoint

All six review findings are applied and validated. `npm run install:artifacts
-- --list` still lists `skill-forge`; `npm run check` passes with no new
errors (139 tests, markdownlint, typecheck, `check:customizations`,
`check:drift`).

Stopping here for explicit user confirmation before considering this plan
complete.

Suggested commit message:

```text
refactor(skills): tighten skill-forge triggers, overhaul guidance, and prose
```

## Phase 3: Commit-Message Drift Fix

### Tangible output

An updated `sources/executable-planning/core.md` "Checkpoints and User
Interest" section requiring a read-only git status/diff check before
composing a checkpoint commit message, so the message describes only the
currently uncommitted work instead of restating an earlier phase's message.
The compiled `.agents/skills/executable-planning/SKILL.md` regenerated from
that source via the repository's build step, with no drift.

### Completion criteria

- `sources/executable-planning/core.md`'s `Checkpoints and User Interest`
  section states that, before composing a commit message, the agent must
  inspect current uncommitted changes with a read-only git check and
  describe only what is currently uncommitted, never restating an earlier
  phase's message verbatim.
- `.agents/skills/executable-planning/SKILL.md` is regenerated from source
  (`npm run build`) and `npm run check:drift` reports no drift.
- `npm run check` passes with no regressions.

### Dependencies and risks

- Depends only on `sources/executable-planning/core.md` and the generated
  `.agents/skills/executable-planning/SKILL.md`; no other skill sources
  change.
- Risk: this plan itself is the running example of the bug (Phase 1 and
  Phase 2 both suggested the same stale message); mitigate by having this
  phase's own checkpoint apply the new rule it introduces, as a live check.
- Rollback: the change is confined to one source fragment and its generated
  output; reverting is a content restore of both files.

### Steps

Single-agent outline (phase is small and single-domain: one rule addition to
one existing skill source, plus a rebuild).

1. `[x]` Add the read-only git status/diff rule to `sources/executable-
planning/core.md`'s `Checkpoints and User Interest` section (this was
   already applied, alongside the Phase 2 commit, before this phase was
   formally recorded).
2. `[x]` Run `npm run build` to regenerate
   `.agents/skills/executable-planning/SKILL.md` from the updated source.
3. `[x]` Run `npm run check` (which includes `check:drift`) and confirm it
   passes with no new errors.
4. `[x]` Update this plan's Current State, Progress Log, and this
   Checkpoint with validation evidence and, if the file is at a viable
   self-contained point, a suggested commit message — composed per the new
   rule this phase introduces: based on the actual uncommitted diff at that
   time, not restated from Phase 1 or Phase 2.

### Validation

- Run `npm run check:drift` (via `npm run check`) and confirm no drift is
  reported for `.agents/skills/executable-planning/SKILL.md`.
- Run `npm run check` in full and confirm it passes with no new errors.
- Manually re-read the updated `Checkpoints and User Interest` section
  against the completion criteria above.

### Checkpoint

`npm run check` (including `check:drift`) passes with no errors: 139 tests,
markdownlint, typecheck, `check:customizations`, and `check:drift` all
clean. Per the new rule this phase introduces, the commit message below was
composed from an actual read-only `git status` check at this checkpoint:
only `.agents/skills/executable-planning/SKILL.md` (regenerated build
output) and this plan file are currently uncommitted — the source edit to
`sources/executable-planning/core.md` was already committed earlier, so it
is not restated here.

Stopping here for explicit user confirmation before considering this plan
complete.

Suggested commit message:

```text
chore(skills): rebuild executable-planning skill to include the new commit-message rule
```

## Progress Log

- 2026-09-03: Discovery completed — reviewed `writing-skills`,
  `skill-creator-egym`, this repo's `AGENTS.md`/`README.md`, `install-catalog.json`,
  `src/check-customizations.ts`, and fetched `mattpocock/skills`
  `skills/productivity/grilling/SKILL.md` and
  `skills/productivity/grill-me/SKILL.md` for the grilling philosophy.
- 2026-09-03: Alignment completed via interactive questions — hand-authored,
  name `skill-forge`, embed grilling technique in-skill, lighter
  TDD-for-skills rigor, harness-agnostic scope. Plan drafted and saved to
  `docs/plans/2026-09-03-skill-forge-skill.md`.
- 2026-09-03: Phase-scoped grilling round resolved remaining opens:
  user-invoked only, default output path
  `.agents/skills/<name>/SKILL.md`, worked example included, single-file
  (no grill-me/grilling two-file split). Steps elaborated and confirmed.
- 2026-09-03: Authored `.agents/skills/skill-forge/SKILL.md` (steps 1-8).
  Ran `npm run install:artifacts -- --list` (skill-forge listed under
  `[copilot, claude, agents]`) and `npm run check` (all 139 tests,
  markdownlint, typecheck, `check:customizations`, `check:drift` passed).
  Phase 1 complete; plan status set to completed pending user confirmation.
- 2026-09-03: User reviewed Phase 1's output and asked for improvement
  suggestions instead of confirming completion. Six findings identified
  (When to Use heading, overhaul guidance, description redundancy,
  discovery-check mention, worked-example formatting, length trim) and
  planned as Phase 2. Plan status reopened from completed to in-progress;
  Phase 2 steps elaborated and awaiting user confirmation before execution.
- 2026-09-03: Executed Phase 2 — added `## When to Use`, overhaul-existing-
  skill guidance, tightened the frontmatter description, added the
  discovery-check mention, fixed Worked Example formatting, and trimmed
  Repository Authoring Constraints prose. Fixed an incidental MD012
  markdownlint issue in this plan file. `npm run install:artifacts --
--list` and `npm run check` both pass cleanly. Phase 2 complete; plan
  status set to completed pending user confirmation.- 2026-09-03: User flagged that Phase 1 and Phase 2 both suggested the
  identical commit message and asked why. Root cause traced to
  `Checkpoints and User Interest` never requiring the message to be
  derived from the actual uncommitted diff. User committed Phase 2's work
  (with a corrected message) and added a fix rule to
  `sources/executable-planning/core.md` directly; this left the compiled
  `.agents/skills/executable-planning/SKILL.md` out of sync
  (`check:drift` failed) and the plan's stale frontmatter/checkpoint text
  uncorrected.
- 2026-09-03: Reopened the plan as Phase 3, ran `npm run build` to
  regenerate the compiled `executable-planning` skill, corrected the
  Phase 2 checkpoint's stale commit-message record, and ran `npm run
check` clean (139 tests, markdownlint, typecheck, `check:customizations`,
  `check:drift`). Phase 3 complete; plan status set to completed pending
  user confirmation.
