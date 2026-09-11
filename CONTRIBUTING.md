# Contributing

## Prerequisites

- Node 24.15.0
- npm 11.12.1

Install dependencies and run the complete validation suite:

```sh
npm ci
npm run check
```

## Skills

Add a hand-authored skill by creating `.agents/skills/<name>/SKILL.md`.
Use a manifest-driven skill under `sources/<name>/` when it composes source
fragments or needs generated output. Run `npm run build` after changing a
manifest-driven skill, then run `npm run check` before opening a pull request.
When adding a skill or meaningfully altering a skill's instructed behavior,
run its Waza evaluation suite on demand (for example,
`npm run eval:waza -- run executable-planning -v`). Behavioral evaluations are
strictly on demand and are never run in CI, `npm test`, or `npm run check`.

## Agents

Add Copilot-compatible agents under `.github/agents/`. Keep their required
skills and tool restrictions explicit, and extend focused tests when a change
alters discovery, validation, or installation behavior.

## Changes

Keep changes narrow, add or update focused tests for behavioral changes, and
do not commit generated drift. The repository checks formatting, Markdown,
TypeScript, tests, customization validation, and generated skill output.
Behavioral evaluations (`npm run eval:waza`) are run on demand when relevant,
never as part of CI or `npm run check`.
