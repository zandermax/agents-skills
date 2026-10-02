# Agents Skills

Build, validate, and install custom agents and skills for AI coding harnesses.

## Prerequisites

- Node 24.15.0
- npm 11.12.1

## Setup

```sh
npm install
npm run build
npm run check
```

## List And Install

Inspect cataloged artifacts without writing destinations:

```sh
npm run install:artifacts -- --list
```

Install every compatible artifact into all cataloged client destinations:

```sh
npm run install:artifacts
```

Copilot and Claude share `~/.claude/skills/` and `~/.claude/agents/`.
These are real directories containing individual links, not links to entire
repository directories. Agent definitions have one authored home in
`.claude/agents/`, use Claude tool names supported by Copilot, and retain
Copilot handoffs. The `copilot:` collection prefix remains for selector
compatibility. Hooks retain their harness-specific destinations.

The generic `~/.agents/skills/` convention is not a documented Claude Code
discovery location, so this installer uses the shared Claude-style paths
instead of maintaining redundant skill installations.

Use selectors to narrow an installation:

```sh
npm run install:artifacts -- --client copilot
npm run install:artifacts -- --skill executable-planning
npm run install:artifacts -- --agent copilot:executable-planner
```

`--client`, `--skill`, and `--agent` are repeatable. `--client all` selects all
cataloged clients. `install:clients` remains a compatibility alias for
`install:artifacts`.

Install to custom destinations without changing the catalog:

```sh
npm run install:artifacts -- \
  --skills-dir skills=/path/to/harness/skills \
  --agents-dir copilot=/path/to/harness/agents
```

Custom destinations use `collection=path`. Relative paths resolve from the
current directory. Skill destinations use the `skills` collection; agent
collections must match the artifact format, such as `copilot`.

For test isolation, set `AGENTS_SKILLS_HOME` to override the home directory.
`EXECUTABLE_PLANNING_HOME` remains accepted as a deprecated fallback for one
migration cycle.

## Uninstall And Memory

```sh
npm run uninstall:artifacts
npm run uninstall:artifacts -- --skill executable-planning
npm run register:memory -- planning-notes
```

Uninstall accepts the same selectors and custom destinations as installation.
It removes matching project-owned links only, never their source directories,
private notes, regular files, or unrelated links. Shared registrations are
shared by both clients; uninstalling one client removes those shared links.

A general install also registers existing private `<topic>-notes` skills from
`$MEMORY_DIR` (default `~/.memory`). Notes retain their `SKILL.md` and `test/`
layout outside this repository. Only discovery metadata is advertised; bodies
remain loaded on demand. Restricted agents still need skill/file-reading tools.
Client reload or a new session may be needed after registration.

The bundled `remember-that` registration helper can be run from any project
with native Node using its installed script path. It refuses registration
through a parent that resolves into this public repository. Loading notes is
independent of capturing them; a repository repair is not a memory request.

## Catalog

[install-catalog.json](install-catalog.json) declares artifact collections,
their source directories and entry rules, plus built-in client destinations.
The catalog is the source of truth for discovery and installation.
Copilot, Claude, and generic-client selections share the skill registry.
Selecting several clients does not duplicate shared destinations.

To install or migrate shared skills and agents without touching hooks:

```sh
npm run install:artifacts -- --skills-dir "claude=$HOME/.claude/skills" --agents-dir "copilot=$HOME/.claude/agents"
```

## Adding Skills

1. Add a skill directory containing `SKILL.md` below the cataloged skills
   source directory.
2. For manifest-driven skills, add `sources/<name>/skill.json` and source
   fragments, then run `npm run build`.
3. Run `npm run install:artifacts -- --list` and `npm run check` to validate
   discovery and generated output.
4. For new skills or behavioral changes, run the Waza evaluation suite on demand
   with `npm run eval:waza -- run <skill-name> -v`. Behavioral evaluations are
   strictly on demand and are never run in CI or `npm run check`.

## Adding Agent Formats

1. Add an agent collection to [install-catalog.json](install-catalog.json)
   with its file suffix or directory marker.
2. Add client destinations for that collection. Agent collections are format
   scoped, so a destination only receives agents of its matching collection.
3. Add artifacts in the new source directory and extend focused discovery,
   selection, and installation tests.

## Safety And Moves

Installation creates symlinks only after validating every source and
destination. A collision with a regular file or directory, an unrelated
symlink, or an unsafe destination parent fails without replacing anything.
Owned whole-directory links from earlier installs are migrated only after
collision validation; owned per-entry links at obsolete discovery locations
are removed. Unrelated entries are preserved. A broken destination link can
be repaired when installation has a valid source; a stale symlink pointing
to another existing source remains a conflict.

Single-artifact installs do not migrate whole discovery directories: run a
complete install first rather than dropping unselected registrations.

If the repository is moved, remove each stale symlink manually and rerun
installation. Do not replace regular files, directories, or unrelated links.

## Planning Skill Maintenance

The executable-planning skill is composed from repository-owned source files
under `sources/executable-planning/`. Update
`sources/executable-planning/workflow.md` and its supporting sources together,
then run `npm run build` and `npm run check`. For meaningful behavioral
changes, evaluate the skill on demand using
`npm run eval:waza -- run executable-planning -v`.
