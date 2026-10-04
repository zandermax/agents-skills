# Agent Instructions

## Skill Authoring

Use a hand-authored `skills/<name>/SKILL.md` for a self-contained
skill.

Use a manifest-driven skill under `sources/<name>/` with `skill.json` when the
skill composes reusable sections, uses transforms, or needs generated output.

Choose manifest-driven authoring for composition and reuse, not simply because
a skill is long.

## Workspace Boundary

Treat the active workspace folders as the default filesystem boundary. Every open workspace folder counts, not only the current working directory. A symlink is inside a workspace only when its resolved target is inside one of those folders. A symlink that cannot be resolved is outside the boundary. Do not
read, search, execute against, or delegate discovery for `$HOME`, session
history, parent directories, global configuration, or other external paths
unless the user explicitly requests the exact path or the active plan names it
as required. Before external local filesystem access, state the exact path and reason and
request approval. All agents have web access by default for documentation, specifications, online references, and web URLs; web access does not require prior approval. Do not perform optional history or context lookups merely
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

## Tool use

Your tool history is reviewed by engineers. The goal is a trail that's quick to follow: avoid redundant calls (re-running unchanged commands, re-reading or diffing files after a successful edit, retrying denied commands), and give a one-line reason before anything non-obvious. Verification that could catch a real failure is always appropriate.

- Check existing file attachments and imports in the active file before invoking search or file-reading tools; never re-read a file already attached in the prompt context.
- For localized expressions, syntax choices, or micro-styles, adhere to prevailing local file conventions directly instead of running global repository searches.
- Do not run pre-edit test baselines for simple, localized refactorings unless existing test status is in doubt; run test verification only after the edit is applied.

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
- Installed skill files (`SKILL.md`) and agent resources under approved skill roots (such as `~/.agents/`, `~/.copilot/`, `~/.claude/`, `~/.vscode/extensions/`, and VS Code application directories) and memory skill files under `~/.memory/<skill-name>/SKILL.md` are approved read-only resources for all agents. Reading files (`read_file`) and directory listing (`list_dir`) under these approved roots and within the active workspace are permitted. Use that canonical layout; do not construct or read a root-level `/memories/...` path, do not use the VS Code `memory` tool or prompt the user for permission to read memory paths, and never write memory files unless the memory workflow explicitly requires it.
- When an instruction, agent, or skill references loading a skill (or using the "Skill" tool), load or use the skill from the environment or active session, or by reading its `SKILL.md` file using available file-reading tools (`read_file` or `read`).
- When a turn contains urgent, important, or security-relevant user-facing information, or anything meant to be presented to the user, such as required user-invoked actions, present it as the final content of that turn's last user-facing message — after any further tool calls, not sandwiched before them. Chat surfaces commonly collapse text that precedes additional tool activity into an intermediate progress/trace view, leaving only the content after the last tool call reliably visible as the persistent final answer. If tool-driven work must continue after something urgent needs to be said, finish that work first and state the urgent item last, or end the turn immediately after stating it.

## Memory Loading

- Proactively consult topic-specific `<topic>-notes` skills: when a task touches a relevant domain (such as git, testing, css, dependencies, minimal changes, or planning), load matching notes immediately on demand without asking the user.
- Load each matching note once per session using available file-reading tools (`read_file` or `read`) unless its file changed or the topic is new. Do not skip a matching note because the work appears routine.

## Planning and Execution Precedence

- Custom planning artifacts and agents (`executable-planning`, `plan-checker`, `plan-executor`, `Executable Planner`, `Plan Executor`) take absolute precedence over generic or plugin-supplied planning and execution skills (such as `superpowers:writing-plans`, `superpowers:executing-plans`, `superpowers:subagent-driven-development`, or `superpowers:brainstorming`).
- Never invoke or follow `superpowers:writing-plans` or `superpowers:executing-plans` when `executable-planning` or `plan-executor` applies.
