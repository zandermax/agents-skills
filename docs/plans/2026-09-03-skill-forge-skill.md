---
status: drafting
mode: interactive
canonical_location: docs/plans/2026-09-03-skill-forge-skill.md
last_updated: 2026-09-03
current_phase: "Phase 1: Skill Forge Authoring"
current_step: none
next_action: "Elaborate Phase 1 steps, then present them for user confirmation before implementing"
blockers: none
---

# Skill Forge Skill

## Plan Metadata

- Status: drafting
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

- Current phase: Phase 1: Skill Forge Authoring
- Current step: not started — steps not yet elaborated
- Next action: Elaborate Phase 1 steps, then present them for user
  confirmation before implementing
- Blockers: none

## Decisions

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

_Not yet elaborated. Populate immediately before this phase starts._

### Validation

- Run `npm run install:artifacts -- --list` and confirm `skill-forge`
  appears under the `skills` collection with no catalog changes.
- Run `npm run check` and confirm it passes with no new errors.
- Manually re-read the drafted `SKILL.md` against the completion criteria
  above (frontmatter shape, required sections, forbidden-token avoidance).

### Checkpoint

_Interactive mode: stop after this phase's output and validation are
recorded, and wait for explicit user confirmation before considering the
work complete. A suggested commit message will be added here once the file
is authored and validated, if it is at a viable, self-contained point._

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
