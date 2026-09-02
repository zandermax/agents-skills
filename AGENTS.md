# Agent Instructions

## Skill Authoring

Use a hand-authored `.agents/skills/<name>/SKILL.md` for a self-contained
skill.

Use a manifest-driven skill under `sources/<name>/` with `skill.json` when the
skill composes reusable sections, uses transforms, or needs generated output.

Choose manifest-driven authoring for composition and reuse, not simply because
a skill is long.

For manifest-driven skills, run `npm run build` after changing source
fragments or manifests, then run `npm run check` to validate generated output.
For hand-authored skills, add the final `SKILL.md` directly and run
`npm run check`.
