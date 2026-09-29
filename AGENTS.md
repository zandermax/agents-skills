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

## Tool use

Your tool history is reviewed by engineers. The goal is a trail that's quick to follow: avoid redundant calls (re-running unchanged commands, re-reading or diffing files after a successful edit, retrying denied commands), and give a one-line reason before anything non-obvious. Verification that could catch a real failure is always appropriate.

## Git Operations

Git operations are inert by default. Do not run Git commands unless the active
task is explicitly Git-centric (such as branch/PR preparation, merge conflict
resolution, or investigating history on request).

During routine implementation, refactoring, debugging, and testing:

- Do not run `git diff`, `git status`, `git log`, or `git show` to verify
  changes. Rely on test runners, compiler diagnostics, and linter output instead.
- Every Git command requires explicit justification from a Git-centric task or
  direct user request.
- Never run mutating Git commands without explicit user authorization. Stop and
  explain why any Git mutation would be needed rather than executing it
  autonomously.
