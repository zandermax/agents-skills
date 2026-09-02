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

## Catalog

[install-catalog.json](install-catalog.json) declares artifact collections,
their source directories and entry rules, plus built-in client destinations.
The catalog is the source of truth for discovery and installation.
The built-in destinations currently include Copilot, Claude, and the generic
`.agents/skills` convention.

## Adding Skills

1. Add a skill directory containing `SKILL.md` below the cataloged skills
   source directory.
2. For manifest-driven skills, add `sources/<name>/skill.json` and source
   fragments, then run `npm run build`.
3. Run `npm run install:artifacts -- --list` and `npm run check` to validate
   discovery and generated output.

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
symlink, or a stale symlink fails without replacing anything.

If the repository is moved, remove each stale symlink manually and rerun
installation. Do not replace regular files, directories, or unrelated links.

## Planning Snapshot Maintenance

The executable-planning skill is maintained from the pinned official snapshot
at `vendor/copilot/Plan.agent.md`. Update its transforms and provenance records
when the upstream source changes, then run `npm run build` and `npm run check`.
