# Executable Planning Skill Toolchain

## Prerequisites

- Node 24.15.0
- npm 11.12.1

## Setup

```sh
npm install
npm run format
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
