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

## Git Mutation During Investigation

Do not use mutating Git commands to establish a baseline, reproduce a failure,
or investigate a discrepancy. Stop, explain why a Git mutation would be needed,
and ask the user to perform it or grant explicit authorization for the exact
command. Prefer read-only evidence such as `git diff`, `git show`, `git log`,
and targeted tests.

The user may stage changes at any time solely to monitor them. Staged and
unstaged differences carry no signal about progress, ownership, approval,
completion, conflict, recovery, or desired file state. Never mutate Git or try
to make the index and worktree match based on those differences; use working
files and fresh task-specific checks to determine current state.
