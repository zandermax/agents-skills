# Plan Archive Filesystem Move

## Summary

Completed and abandoned repo-backed plans must be relocated into
`docs/plans/archive/`. Archiving is a filesystem move, not a copy. Git
remains read-only: no `git mv`, staging, commit, branch, or push.

The current skill sentence is easy to half-follow. Agents write
`docs/plans/archive/<slug>.md` and leave `docs/plans/<slug>.md` in place,
especially in harnesses that have no rename tool. The leftover
skill-forge plan is that failure.

## Goals

- Make archive success observable: the archive file exists and the active
  path is gone.
- Allow either a filesystem `mv` or write-archive-then-delete-original.
- Forbid copy-and-keep and `git mv`.
- Keep the existing git read-only contract unchanged.
- Encode the rule in the generated skill, a required phrase, rule `R50`,
  and a behavioral pressure scenario.
- Remove the leftover active skill-forge plan.

## Non-Goals

- A new `checkCustomizations` duplicate-slug checker. A leftover
  `completed` or `abandoned` plan already fails the archive-location check.
- Changing Operating Contract git rules.
- Allowing `git mv`.
- Rewriting Canonical Plan Artifact beyond the archive paragraph.

## Behavior

When repo-backed storage is in effect:

1. Finish all content and metadata edits at
   `docs/plans/<descriptive-slug>.md`, including terminal status and
   `canonical_location`.
2. Relocate that file to `docs/plans/archive/<descriptive-slug>.md` with a
   filesystem move (`mv`) or by writing the archive file and then deleting
   the original active path.
3. Treat archive as complete only when
   `docs/plans/archive/<descriptive-slug>.md` exists and
   `docs/plans/<descriptive-slug>.md` does not.
4. After relocate, verify only. Do not recreate or edit the active-path
   file.
5. Never copy-and-keep. Never `git mv`, stage, commit, or otherwise mutate
   the Git index.

Harnesses without a rename tool must use write-then-delete. Copying into
archive and leaving the original is a failed archive.

## Skill and tests

Replace the archive sentence in Canonical Plan Artifact in
`sources/executable-planning/core.md`. Rebuild
`.agents/skills/executable-planning/SKILL.md`.

Add:

- A required phrase that the rendered skill must contain, covering
  relocate, original path gone, and no copy-and-keep / `git mv`.
- `R50-archive-filesystem-move` in the project-owned rule list.
- One pressure scenario that asks to archive a completed plan and forbids
  copy-and-keep plus `git mv`.

Delete `docs/plans/2026-09-03-skill-forge-skill.md`. Keep
`docs/plans/archive/2026-09-03-skill-forge-skill.md`.

## Constraints

- Manifest-driven skill: edit `sources/executable-planning/`, then
  `npm run build` and `npm run check`.
- Do not name IDE-specific tools in the skill body.
- Do not change allowed skill frontmatter.
- Existing archive-location validation in `checkCustomizations` stays as
  the filesystem gate; this work teaches agents to satisfy it.

## Success criteria

- Generated skill states the outcome-only archive rule above.
- `npm run check` passes.
- The leftover active skill-forge plan is gone.
- A copy-and-keep archive fails the new scenario / required-phrase
  contract.
