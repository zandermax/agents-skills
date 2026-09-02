# Executable Planning Skill Toolchain

## Prerequisites

- Node 24.15.0
- npm 11.12.1

## Setup

```sh
npm install
npm run format
npm run lint:markdown
npm run build
npm run check
```

## Install Clients

Install all supported clients:

```sh
npm run install:clients
npm run install:clients -- --client all
```

Install one client at a time:

```sh
npm run install:clients -- --client copilot
npm run install:clients -- --client claude
npm run install:clients -- --client agents
```

Install every built skill into an arbitrary skill root for a custom harness:

```sh
npm run install:clients -- --skills-dir /path/to/harness/skills
```

`--skills-dir` is repeatable and can be combined with built-in clients:

```sh
npm run install:clients -- \
	--skills-dir /path/to/first-harness/skills \
	--skills-dir ./relative/path/to/second-harness/skills
npm run install:clients -- --client copilot --skills-dir /path/to/harness/skills
```

Each directory under `.agents/skills` containing a `SKILL.md` is symlinked as
`<skills-dir>/<skill-name>`. Relative paths resolve from the directory where the
command is invoked. When `--skills-dir` is used without `--client`, only custom
roots are installed; invoking the command without arguments still installs all
built-in clients. Run `npm run build` first so generated skills are current.

Source and destination mappings used by scripts/install-clients.ts:

- Copilot file: `.github/agents/executable-planner.agent.md` -> `~/.copilot/agents/executable-planner.agent.md`
- Copilot directory: `.agents/skills/executable-planning` -> `~/.copilot/skills/executable-planning`
- Claude directory: `.agents/skills/executable-planning` -> `~/.claude/skills/executable-planning`
- Agent Skills directory: `.agents/skills/executable-planning` -> `~/.agents/skills/executable-planning`

## Discovery And Use

Copilot (VS Code):

- Run `npm run install:clients -- --client copilot`.
- Reload the VS Code window if skill discovery appears cached.
- If needed, start a new chat.
- Select Executable Planner.
- In the selected agent instructions, verify the REQUIRED SKILL line references executable-planning.

Claude Code:

- Run `npm run install:clients -- --client claude`.
- If discovery appears cached, restart Claude Code.
- Invoke executable-planning directly or allow automatic skill discovery.
- The Copilot .agent.md is not a Claude agent.

Generic Agent Skills consumers:

- Run `npm run install:clients -- --client agents`.
- Confirm the client supports the Agent Skills directory convention rooted at .agents/skills.

## Build And Maintenance

When maintaining this repository:

- Edit owned source fragments in sources/executable-planning.
- Run npm run build.
- Run npm run format.
- Inspect the generated diff.
- Run npm run check.

Official snapshot updates:

- Replace `vendor/copilot/Plan.agent.md` with a byte-preserving copy of the official source.
- Update `sources/executable-planning/transforms.json` when exact source text changes.
- Update the checksum and counts in `vendor/copilot/README.md`.
- Run npm run build.
- Run npm run check:drift.
- Run npm run check.

## Collisions And Repository Moves

- Existing destination collision links are validated and never overwritten.
- If a destination is a symlink to a different target, installation fails and must be fixed manually.
- If the repository is moved, remove the stale symlink in home and rerun installation.

## Add Another Manifest-Driven Skill

Add a new skill without changing src/build-skills.ts:

- Create `sources/<name>/skill.json`.
- Add owned source fragments under `sources/<name>/`.
- Build the generated output at `.agents/skills/<name>/SKILL.md`.
- Keep generation manifest-driven; do not add entry-point edits.

## Manual-Trigger Companion Skills

A rich, manifest-driven skill stays auto-invokable: its description is written
so clients can select it from natural-language intent, and its generated
frontmatter contains only `name` and `description`.

Pair it with a thin, hand-authored companion skill that is reachable only by
explicit user invocation, following the `grill-me` / `grilling` pattern from
[mattpocock/skills](https://github.com/mattpocock/skills). The companion:

- Lives at `.agents/skills/<trigger-name>/SKILL.md`, is not built by
  `build-skills.ts`, and has no `sources/` manifest.
- Sets `disable-model-invocation: true` in its frontmatter, so clients that
  support the field (Claude Code, VS Code Copilot, Cursor, Factory Droid, pi)
  never auto-select it; it only runs when the user explicitly invokes it by
  name. Clients without an equivalent mechanism ignore the field and load the
  skill normally, so this is additive, not a hard guarantee everywhere.
- Has a one-line body that forwards to the rich skill, for example
  `Call the Skill tool with "executable-planning".`.

`executable-planning` (rich, auto-invokable) is paired with `plan-it-out`
(manual-trigger companion) as the reference example.

`checkCustomizations` allows `disable-model-invocation` on any skill and
rejects it if present with any value other than `true`.
