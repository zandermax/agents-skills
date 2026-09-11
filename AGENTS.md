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

## Behavioral Evaluations

When creating a new skill or making a change that meaningfully alters an
existing skill's instructed behavior, run the corresponding Waza evaluation
suite on demand:

```sh
npm run eval:waza -- run <skill-name> -v
```

For example, to evaluate `executable-planning`:

```sh
npm run eval:waza -- run executable-planning -v
```

Behavioral evaluations are strictly on-demand; they are never run in CI or
part of `npm run check` or `npm test`.
