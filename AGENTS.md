# Agent Instructions

## Skill Authoring

Use a hand-authored `.agents/skills/<name>/SKILL.md` for a self-contained
skill.

Use a manifest-driven skill under `sources/<name>/` with `skill.json` when the
skill composes reusable sections, uses transforms, or needs generated output.

Choose manifest-driven authoring for composition and reuse, not simply because
a skill is long.

## Workspace Boundary

Treat the active workspace folders as the default filesystem boundary. Do not
read, search, execute against, or delegate discovery for `$HOME`, session
history, parent directories, global configuration, or other external paths
unless the user explicitly requests the exact path or the active plan names it
as required. Before external access, state the exact path and reason and
request approval. Do not perform optional history or context lookups merely
because a related tool or skill is available.

For manifest-driven skills, run `npm run build` only after changing source
fragments or manifests, then run `npm run check` to validate generated output.
Never run `npm run build` unless you have modified a source file under `sources/`
or a `skill.json` manifest; do not run `build` speculatively, as a general check,
or as a routine cleanup step.
For hand-authored skills, edit the final `SKILL.md` directly and run
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

Mutating git commands are permission-gated and are always presented to the user,
 so justify them and output the reasoning as to why they are needed: this will
 be seen by the user to explain the requests to do so. No explanation will mean
 the requests in this regards will likely be denied.

The user may stage changes at any time solely to monitor them. Staged and
unstaged differences carry no signal about progress, ownership, approval,
completion, conflict, recovery, or desired file state. Never mutate Git or try
to make the index and worktree match based on those differences; use working
files and fresh task-specific checks to determine current state.

## Execution Output and Formatting

- Minimize tool-output context by default: use filtered commands or concise success, failure, and evidence reporting for the current decision. Retain full output when it is needed to diagnose a failure, interpret results, make a decision, or preserve audit evidence.
- After making changes, detect and run the repository's available auto-format command before addressing format diagnostics. Address only the diagnostics that remain after formatting. If no auto-format command exists, record that unavailable check and continue with the applicable validation.
- At a manual-test checkpoint, use the question mechanism with `Passed` and `Issues found` options; the issues option accepts free text. Record either the confirmation or the reported issues as user-provided evidence before continuing, and do not suggest an expected result.
- Installed skill files (`SKILL.md`) under approved skill roots (such as `~/.agents/skills/`, `~/.copilot/`, `~/.claude/skills/`, `~/.vscode/extensions/`, and VS Code application directories) and memory skill files under `~/.memory/<skill-name>/SKILL.md` are approved read-only resources for all agents. Use that canonical layout; do not construct or read a root-level `/memories/...` path, and never write memory files unless the memory workflow explicitly requires it.
