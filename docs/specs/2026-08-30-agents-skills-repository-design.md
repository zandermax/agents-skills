# Agents and Skills Repository Design

## Summary

Generalize the repository from a toolchain centered on one executable-planning
skill and Copilot agent into `agents-skills`, a private collection that can
build, validate, list, select, and install arbitrary skills and client-ready
agent formats. Preserve the planning artifacts as the first entries in the
collection while removing planning-specific assumptions from shared code.

Rename the GitHub repository from `zandermax/plans` to
`zandermax/agents-skills` and the local directory from
`/Users/zander/repos/plans` to `/Users/zander/repos/agents-skills` only after
the generalized repository passes validation and known installed symlinks have
been inventoried.

## Goals

- Make repository identity, package metadata, documentation, and shared code
  describe a collection of agents and skills.
- Continue building committed Agent Skills artifacts from deterministic source
  manifests.
- Support multiple named collections of client-ready agent formats without
  defining a cross-harness agent language.
- Discover artifacts from cataloged source roots instead of listing the
  planning artifacts in installer code.
- Install all artifacts or repeatably selected skills and agents into built-in
  clients or arbitrary harness directories.
- Preserve all-or-nothing preflight, idempotent symlinks, collision refusal,
  generated drift checks, and repository-contained source validation.
- Make available artifacts and compatible clients inspectable without
  installation.
- Rename the remote and local repository safely, including known symlink
  migration.

## Non-Goals

- Translate one agent definition between incompatible harness formats.
- Generate client-ready agents from a portable intermediate language.
- Automatically discover arbitrary installation destinations previously used
  outside known client directories.
- Rewrite historical executable-planning design and implementation records as
  if they had described the generalized repository.
- Rename the `executable-planning` skill or `Executable Planner` agent.
- Add agent formats for clients where no client-ready artifact exists yet.

## Current State

The skill builder already discovers `sources/*/skill.json` and can emit more
than one `.agents/skills/<name>/SKILL.md`. Custom skill installation also
discovers valid built skill directories dynamically.

The remaining shared assumptions are not generic:

- `package.json` names the package `executable-planning`.
- `renderSkill` gives every skill the H1 `Executable Planning`.
- `CLIENT_LINKS` lists one agent and one skill explicitly.
- Built-in clients and destinations are encoded in TypeScript.
- There is no arbitrary agent destination or agent-format collection model.
- Artifact selection and catalog listing are unavailable.
- Customization validation requires every discovered agent to reference every
  discovered skill.
- README and documentation tests describe a single planning package.

The worktree was clean at commit `e1ea94f` during design. The private GitHub
repository `zandermax/plans` uses default branch `mainline`; the authenticated
user has admin access, and `zandermax/agents-skills` was available.

## Repository Identity

Use these repository-level identities after migration:

- GitHub repository: `zandermax/agents-skills`
- Local directory: `/Users/zander/repos/agents-skills`
- npm package: `agents-skills`
- README title: `Agents and Skills Toolchain`
- GitHub description: `Build, validate, and install custom agents and skills
  across AI coding harnesses.`

Update the package lockfile together with `package.json`. Keep `private: true`
and do not add an npm `install` lifecycle script.

Planning-specific sources, tests, generated artifacts, vendor provenance,
and historical documentation retain their feature names. References to the
planning output directory `plans/` inside the skill also remain unchanged;
that is product behavior, not repository identity.

## Artifact Model

### Skills

Skills use the Agent Skills directory convention and remain deterministic
build outputs at `.agents/skills/<name>/SKILL.md`.

Add a required `title` field to each `sources/*/skill.json`. The renderer uses
that title for the single H1 instead of hard-coding `Executable Planning`.
Skill IDs remain their manifest names, such as `executable-planning`.

The existing source directory layout remains valid. Moving all skill sources
under an additional `sources/skills/` level would create migration work
without improving artifact identity or discovery.

### Agents

Agents are client-ready files or directories grouped into named format
collections. The repository does not interpret one collection as portable to
another format.

The initial `copilot` collection uses `.github/agents`, regular files ending
in `.agent.md`, and IDs derived by removing that suffix. The existing artifact
therefore has ID `copilot:executable-planner`. Keeping this source location
also preserves immediate VS Code workspace discovery.

Future collections may point to other repository-contained source roots and
may define either file entries with a required suffix or directory entries
with a required marker file. Adding a format is one atomic repository change:
the catalog entry, its source root, and at least one valid artifact are
committed together.

## Installation Catalog

Add `install-catalog.json` at the repository root. It is the source of truth
for artifact collection discovery and built-in destination mappings. It does
not list individual artifacts.

Conceptual schema:

```json
{
  "collections": [
    {
      "name": "skills",
      "artifactKind": "skill",
      "source": ".agents/skills",
      "entry": { "kind": "directory", "marker": "SKILL.md" }
    },
    {
      "name": "copilot",
      "artifactKind": "agent",
      "source": ".github/agents",
      "entry": { "kind": "file", "suffix": ".agent.md" },
      "validation": "copilot-agent"
    }
  ],
  "clients": [
    {
      "name": "copilot",
      "destinations": [
        { "collection": "skills", "path": "~/.copilot/skills" },
        { "collection": "copilot", "path": "~/.copilot/agents" }
      ]
    },
    {
      "name": "claude",
      "destinations": [
        { "collection": "skills", "path": "~/.claude/skills" }
      ]
    },
    {
      "name": "agents",
      "destinations": [
        { "collection": "skills", "path": "~/.agents/skills" }
      ]
    }
  ]
}
```

The `agents` client name remains as a compatibility label for generic Agent
Skills consumers. Catalog order controls stable listing, validation, and
installation output. Artifact entries within a collection use code-point
lexical order.

## Catalog Validation

Parse the catalog as `unknown` and validate it into immutable typed values.
Reject:

- Unknown keys or wrong primitive types.
- Empty, duplicate, or non-kebab-case collection and client names.
- Unsupported artifact kinds, entry kinds, or validation strategies.
- Sources resolving outside the repository.
- Missing collection source directories.
- Invalid or empty marker and suffix rules.
- Skill collections whose validity rule is not directory plus `SKILL.md`.
- Duplicate client destination paths.
- Client mappings to unknown collections.
- Agent collections mapped to a destination intended for a different format.
- Home destinations that do not begin with `~/`.

`validation` is optional. When present, the catalog parser accepts only a
closed set of strategies implemented by the code; initially that set contains
`copilot-agent`. Adding another strategy requires code and tests before a
catalog entry may name it. Omitting `validation` selects structural validation
only.

Catalog loading and artifact discovery perform no writes. All selected sources
and destinations are resolved and validated before installation begins.

## Installation Interface

Rename the implementation and primary package command:

- Script: `scripts/install-artifacts.ts`
- Primary command: `npm run install:artifacts`
- Compatibility alias: `npm run install:clients`
- Core export: `installArtifacts`

Do not define `npm install` as a script because dependency installation must
not mutate user configuration.

Supported arguments:

```text
--client all|<name>                repeatable built-in client target
--skills-dir <path>                repeatable custom skill destination
--agents-dir <format>=<path>       repeatable custom agent destination
--skill <name>                     repeatable skill selector
--agent <format>:<name>            repeatable agent selector
--list                             list artifacts and compatibility; write nothing
```

Examples:

```sh
npm run install:artifacts
npm run install:artifacts -- --client copilot --skill executable-planning
npm run install:artifacts -- --skills-dir /custom/skills \
  --skill executable-planning
npm run install:artifacts -- --agents-dir copilot=/custom/agents
npm run install:artifacts -- --agents-dir copilot=/custom/agents \
  --agent copilot:executable-planner
npm run install:artifacts -- --list
```

### Selection Semantics

- No artifact selector means all artifacts compatible with each requested
  destination.
- `--skill` filters skill collections for every selected client and custom
  skill destination.
- `--agent` filters its named format collection for every selected compatible
  client and custom agent destination.
- Resolve destination collections first, then resolve selectors against the
  discovered artifacts in those collections.
- Reject selectors that do not resolve to an existing artifact.
- Reject an agent selector unless at least one selected built-in or custom
  destination maps to that selector's exact format collection. Never install
  one format into a destination declared for another format.
- If there are no destination flags, built-in clients default to all, including
  when artifact selectors are present.
- If any custom destination is present without `--client`, install only to
  custom destinations.
- `--client all` selects every cataloged client in catalog order.
- Repeated identical selections and destinations are deduplicated while
  preserving first occurrence order.

### Listing

`--list` prints stable, human-readable sections for skills, agent formats, and
built-in clients. Each artifact appears exactly once using its full selector
ID and a list of every compatible built-in client; it is not repeated per
destination. Listing validates the catalog and artifacts but creates no
directories or links. Do not combine `--list` with destination or artifact
selection flags.

### Installation Safety

Retain absolute symlink installation and these guarantees:

- Existing links to the canonical selected source are reported as existing.
- Regular files, directories, unrelated links, and broken links are never
  overwritten implicitly.
- Equivalent mappings from a built-in client and custom destination are
  deduplicated.
- Conflicting mappings to one destination fail before writes.
- Missing selected sources and every destination conflict are aggregated when
  possible.
- A validation failure creates no destination parent or link.
- Windows symlink permission errors retain actionable guidance.

## Customization Validation

Continue validating every built skill and cataloged agent collection, but make
checks collection-aware.

For all skills:

- Frontmatter name matches the skill directory.
- Frontmatter contains only Agent Skills-compatible fields: `name`,
  `description`, and optionally `disable-model-invocation`.
- When present, `disable-model-invocation` must be exactly `true`, marking a
  manual-trigger companion skill that is reachable only by explicit user
  invocation, never by autonomous model judgment.
- Generated output matches its manifest and contains one declared H1.
- Harness-specific tokens remain forbidden where required.

For `copilot-agent` collections:

- Parse Copilot agent frontmatter and validate its supported fields.
- Extract each `**REQUIRED SKILL:** Use <skill-id>` declaration.
- Require every declared skill ID to exist.
- Check duplicated canonical headings only against skills that agent declares.
- Allow an agent to declare no skill and do not require unrelated skills.

Other client-ready collections receive structural validation from the catalog:
the source root exists inside the repository; each discovered file or
directory satisfies its declared suffix or marker rule; every derived artifact
ID is nonempty and unique within the collection; and each resolved artifact
path remains inside the collection root. Their content is not interpreted.
The catalog must reject a named validation strategy the code does not support.

README checks should validate generic command and extension instructions, not
pin every current artifact mapping. Feature-specific tests continue to cover
the executable-planning contract.

## Repository Layout

The intended layout after generalization is:

```text
.
├── .agents/skills/<skill>/SKILL.md
├── .github/agents/<agent>.agent.md
├── docs/{plans,specs}/
├── install-catalog.json
├── scripts/install-artifacts.ts
├── sources/<skill>/{skill.json,...}
├── src/
│   ├── build-skills.ts
│   ├── check-customizations.ts
│   └── lib/{catalog,...}
├── test/
├── vendor/
├── package.json
└── README.md
```

Additional agent format roots are introduced in the same change as their
catalog entry and first artifact; empty placeholder directories and catalog
entries pointing to absent roots are invalid.

## Testing Strategy

Use Node's built-in test runner and test-first implementation slices.

1. Catalog parser tests cover schema closure, path confinement, unique names,
   entry rules, client references, and deterministic order.
2. Skill manifest and renderer tests prove two differently titled skills
   produce distinct deterministic H1 headings.
3. Artifact discovery tests use two skills plus file- and directory-based agent
   collections and ignore invalid entries.
4. Argument tests cover all defaults, repeatable selectors, `format=path`,
   `format:name`, malformed values, deduplication, and list exclusivity.
5. Installer tests cover all/selected artifacts, multiple custom targets,
   collection compatibility, built-in plus custom deduplication, idempotence,
   collisions, missing artifacts, and all-before-write behavior.
6. Listing tests assert stable artifact IDs and compatible clients with no
   filesystem mutations.
7. Customization tests prove agents declare only their own skill dependencies
   and reject missing declared dependencies.
8. Repository integration tests run the real catalog and committed artifacts.
9. `npm run check` runs formatting/lint checks, strict TypeScript, all tests,
   customization validation, and generated drift validation.

At least one fixture must contain multiple skills and multiple named agent
formats. A test that only uses executable-planning and its agent is not
sufficient evidence of generality.

## Documentation

Rewrite the README around collection maintenance:

- Repository purpose and artifact model.
- How to add a skill manifest and build its committed output.
- How to add a client-ready agent to an existing cataloged format.
- How to add a new agent format collection and client destination.
- How to list, select, and install artifacts.
- Built-in client compatibility and arbitrary harness examples.
- Collision, stale symlink, repository move, and recovery behavior.
- Official snapshot maintenance for the planning skill as one
  feature-specific section.

Historical executable-planning specs and plans remain unchanged except for a
short supersession reference if navigation becomes ambiguous.

## Remote and Local Rename Procedure

Perform identity changes only after generalized code is committed and
`npm run check` succeeds.

1. Confirm the worktree is clean and record the current commit.
2. Confirm `zandermax/agents-skills` remains available and authenticated user
   `zandermax` retains admin permission on `zandermax/plans`.
3. Inventory the catalog's known client destinations. For each expected
  artifact path, use `lstat` to require a symlink, resolve its `readlink`
  value relative to the link's parent without dereferencing the final target,
  and accept it only when that normalized path is inside
  `/Users/zander/repos/plans`.
4. Record destinations that require recreation and remove only links verified
  by that lexical containment check. Never remove regular files, directories,
  unrelated links, or links found by an unrestricted home-directory scan.
5. Rename the GitHub repository to `agents-skills` and update its description.
6. Set `origin` explicitly to
   `https://github.com/zandermax/agents-skills.git` and verify fetch metadata.
7. Move `/Users/zander/repos/plans` to
   `/Users/zander/repos/agents-skills` from the parent directory.
8. Recreate recorded symlinks from the new checkout and verify their canonical
   targets.
9. Run a smoke check from the new path and reopen the VS Code workspace there.

The local move is the final workspace operation because tools bound to the old
workspace path may stop functioning immediately afterward. GitHub's redirect
from the old remote is a fallback, not a substitute for updating `origin`.

Unknown arbitrary custom destinations cannot be migrated automatically. Report
that boundary clearly and provide the new `install:artifacts` command needed
to recreate them.

## Delivery Phases

### Phase 1: Generic Knowledge Artifacts

Add generic skill titles and catalog parsing, then prove multiple skills and
agent formats can be discovered and validated. Tangible output: a valid
catalog and deterministic multi-artifact checks.

### Phase 2: Selection and Installation

Replace static client links with catalog-driven artifact resolution, add
listing and selectors, migrate the command and tests, and preserve installation
safety. Tangible output: arbitrary built-in and custom destinations can install
all or selected artifacts.

### Phase 3: Repository Identity and Migration

Rewrite repository-level documentation and metadata, validate the full
collection, rename GitHub and `origin`, migrate known symlinks, and finally
move the local directory. Tangible output: the functioning repository exists
as `zandermax/agents-skills` locally and remotely.

## Risks and Mitigations

- **Absolute links break on local move:** inventory and remove only verified
  old-root links before moving, then recreate them afterward.
- **Agent formats diverge:** keep client-ready named collections and explicit
  validation strategies; do not imply translation.
- **Catalog and filesystem drift:** repository checks discover both and reject
  invalid or missing sources and references.
- **Selectors install incompatible artifacts:** namespace agent IDs by format
  and resolve every selector against selected destinations before writes.
- **Remote rename interrupts collaborators or automation:** this repository is
  private and currently has no identified CI integration, but explicitly update
  `origin` and document GitHub redirect behavior.
- **Local rename disrupts the active IDE:** perform it last and require reopening
  the workspace at the new path.

## Success Criteria

- Shared package, renderer, validator, installer, tests, and README no longer
  assume executable-planning is the only artifact.
- Two skills with different titles and two named agent formats pass fixtures.
- The real planning skill and Copilot agent remain byte-stable unless a
  reviewed generic-schema change requires an intentional generated diff.
- `--list` reports current artifacts and compatibility without writes.
- All and selected skills and agents install into built-in and arbitrary
  destinations with preflight and idempotence guarantees.
- `npm run check` passes before and after the repository identity migration.
- GitHub, `origin`, package metadata, README, and local directory use
  `agents-skills`.
- Known installed links resolve into `/Users/zander/repos/agents-skills` after
  migration, and unknown custom destinations are called out explicitly.
