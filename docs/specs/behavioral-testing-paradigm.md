# Behavioral Testing Paradigm for Skills and Memory Topics

This document describes the convention for adding **behavioral evals** to any
skill or memory topic in this repo, on top of the existing static/structural
tests.

## Two-tier test model

Every skill or memory topic can have two kinds of tests, both living under its
`test/` directory:

1. **Static tests** (`*.test.ts`, run via `npm test`) — verify structure:
   required frontmatter, required sections, that referenced files exist, that
   fixture content is well-formed. These are fast, deterministic, fully
   offline, and run on every `npm run check`.
2. **Behavioral evals** (`evals.json`, run via an opt-in script) — verify that
   a real headless agent, when prompted, actually (a) loads the skill/memory
   and (b) produces output consistent with what it teaches. These require a
   live LLM CLI and are never part of `npm test`/`npm run check`.

## The `evals.json` schema

Place `evals.json` beside the topic's existing `test/` folder (e.g.
`~/.memory/<topic>-notes/test/evals.json` for a memory topic). It is a JSON
array of scenario objects:

```json
[
  {
    "name": "refuse-mock-call-inspection",
    "prompt": "Write a Node test verifying that authService.login was called with username 'admin'.",
    "expectedMemoryOrSkill": "node-testing-notes",
    "requiredOutput": ["node:assert"],
    "forbiddenOutput": ["toHaveBeenCalledWith", "mock.calls", "toBeCalledWith"],
    "judgeRubric": "optional free-text note for a human reviewer"
  }
]
```

- `prompt` — sent to the headless CLI as-is.
- `expectedMemoryOrSkill` — a substring expected to appear among the files/
  skills the agent accessed (Gate 1).
- `requiredOutput` / `forbiddenOutput` — each entry is either a plain
  substring (case-insensitive) or a `/regex/flags` pattern. Checked against
  fenced code blocks in the response when present, otherwise the full
  response text. Forbidden patterns are checked with code comments stripped,
  so a comment that merely *documents* an anti-pattern doesn't false-fail;
  required patterns are checked against the uncommented text.

## The two gates

Running a scenario produces two pass/fail gates:

- **Gate 1 — memory/skill access**: did the agent actually load the relevant
  skill or memory file, per `expectedMemoryOrSkill`?
- **Gate 2 — behavioral adherence**: does the response satisfy every
  `requiredOutput` matcher and none of the `forbiddenOutput` matchers?

A scenario passes only if both gates pass.

## Running the opt-in live eval

Each topic wires its own npm script, e.g.:

```json
"eval:memory": "tsx scripts/run-agent-evals.ts --dir $HOME/.memory/node-testing-notes/test"
```

Run it directly: `npm run eval:memory`. Output per scenario:

```text
PASS refuse-mock-call-inspection
  gate1 (memory/skill access): accessed a file matching 'node-testing-notes'
  gate2 (behavioral adherence): response satisfied all required/forbidden matchers
```

- **PASS** — both gates passed.
- **FAIL** — printed with the failing gate's detail; the script exits non-zero.
- **skipped — no supported CLI available** — printed and the script exits
  zero when neither `copilot` nor `claude` is on `PATH`. This is not a
  failure; it lets the eval run safely in environments without a live CLI.

The runner spawns the CLI (`copilot -p "<prompt>" --output-format json
--allow-all-tools` or `claude -p "<prompt>" --output-format json
--dangerously-skip-permissions`) with its working directory set to a fresh
`mkdtemp` sandbox per scenario — never the real skill/memory directory — so
the agent's file writes cannot pollute real content.

## Boundary: never part of `npm run check`

Live evals depend on network access, CLI availability, and non-deterministic
LLM output. They are **always** a separate, explicitly-invoked script (e.g.
`npm run eval:memory`), never folded into `npm test` or `npm run check`. LLM
non-determinism also means a single passing run is evidence, not a guarantee
of future stability — keep matchers permissive enough to tolerate reasonable
phrasing variation.

## Worked example

`node-testing-notes` (a memory topic under `~/.memory/`) is the reference
implementation:

- `SKILL.md` — states the preference (avoid inspecting mock call history
  directly in Node tests; prefer native assertions on outcome/state).
- `test/node-testing-notes.test.ts` — static fixture test.
- `test/evals.json` — the `refuse-mock-call-inspection` live scenario.

Adding the same pattern to a new skill or memory topic: write the `SKILL.md`
guidance, add a static test as usual, then add an `evals.json` with one or
more scenarios targeting the guidance, and wire an `eval:<topic>` npm script
pointing `--dir` at that topic's `test/` folder.
