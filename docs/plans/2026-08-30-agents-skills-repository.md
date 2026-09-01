# Agents and Skills Repository Implementation Plan

> **For agentic workers:** REQUIRED SKILL: Use `executable-planning` to maintain this plan while implementing it task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the repository into a catalog-driven collection of selectable skills and client-ready agent formats, then rename it locally and remotely to `agents-skills` without losing installed links.

**Architecture:** Keep deterministic skill composition, add declarative artifact collections and client mappings in `install-catalog.json`, and resolve every list or install operation through a validated catalog. Agents remain client-ready, format-scoped artifacts; repository identity and filesystem migration happen only after the generalized toolchain passes all gates.

**Tech Stack:** Node.js 24.15.0, npm 11.12.1, strict TypeScript 7, ECMAScript modules, Node's built-in test runner, YAML 2.9.0, and Biome 2.5.11.

**Spec:** `docs/specs/2026-08-30-agents-skills-repository-design.md`

## Global Constraints

- Keep the package private and do not define an npm `install` lifecycle script.
- Preserve deterministic committed skill outputs and exact drift checks.
- Agents are client-ready artifacts; do not introduce cross-format translation.
- Preserve all-before-write validation, idempotent symlinks, and collision refusal.
- Use test-first red-green-refactor slices and focused validation after each implementation edit.
- Do not rewrite historical executable-planning records or rename its skill and agent.
- Do not rename the local directory until the final migration task because the active workspace depends on the current path.
- Never remove a regular file, directory, or unrelated symlink during link migration.
- Never mutate the Git index or staging area. Do not run `git add`, `git mv`,
	`git rm --cached`, `git restore --staged`, `git reset`, or any command or tool
	that changes staging state as a side effect.
- Capture the staged state before the first write and verify it is identical
	after every numbered implementation task. Report any unexpected index change
	immediately; do not continue with a changed index.
- Never run `git commit` or `git push`; the user exclusively owns staging,
	removing staged changes, commits, and pushes.
- At the end of every numbered implementation task, report changed files and
	validation evidence, then suggest the task's documented commit message. Do
	not execute the suggested Git commands.
- When a later migration gate requires committed or pushed state, stop and wait
	for the user to perform those operations, then verify the resulting state
	before continuing.

---

## Plan Metadata

- Status: in-progress
- Mode: interactive
- Canonical location: `docs/plans/2026-08-30-agents-skills-repository.md`
- Last updated: 2026-08-31
- Goal: A validated `agents-skills` repository can list and selectively install multiple skills and named agent formats into built-in and arbitrary destinations, with known links intact after local and remote rename.
- Success criteria: Generic skill titles; validated catalog and multi-format discovery; collection-aware agent validation; list and selective install commands; all repository checks pass; GitHub, package, remote, README, and local path renamed; known links resolve after migration.
- Constraints and assumptions: The worktree starts from committed design `ca423b3`; local path and origin already use `agents-skills`; package and README identity remain planning-specific; unknown custom symlink destinations cannot be migrated automatically.

## Current State

- Current phase: Phase 1 - Generic Knowledge Artifacts
- Current step: `[?]` 1.C - Awaiting user confirmation
- Next action: Present Phase 1 output and validation evidence, then wait for the
	user to confirm whether Phase 2 may begin.
- Blockers: Awaiting the interactive Phase 1 checkpoint decision.
- Blockers: None
- Observed out-of-sequence state: the repository is already located at
	`/Users/zander/repos/agents-skills`, and `origin` is already
	`https://github.com/zandermax/agents-skills.git`. Phase 3 must reconcile and
	verify these completed identity changes rather than replay their destructive
	rename steps.

## Decisions

- 2026-08-30: Use a unified installation catalog rather than per-artifact manifests or hard-coded conventions.
- 2026-08-30: Store agents as client-ready artifacts in named format collections.
- 2026-08-30: Use `--agents-dir <format>=<path>` and `--agent <format>:<name>` for custom agent installation and selection.
- 2026-08-30: Add repeatable skill and agent selectors plus read-only artifact listing.
- 2026-08-30: Keep `.github/agents` as the initial Copilot collection source.
- 2026-08-30: User approved this plan and selected inline execution with phase checkpoints.
- 2026-08-30: The user exclusively owns every Git index mutation, including
	staging and removing staged changes, plus commits and pushes. Agents preserve
	the initial staged state and only suggest a commit message after each task.
- 2026-08-30: Store active repository-wide plans and specs under neutral
	`docs/plans` and `docs/specs` paths; retain historical Superpowers documents
	unchanged as provenance.
- 2026-08-31: Treat the existing local-directory and origin renames as
	out-of-sequence completed state. Before Phase 3 execution, replace obsolete
	rename mutations with verification steps; do not move the repository or
	rename the remote again.
- 2026-08-31: Normalize the four-file Biome formatting drift and establish a
  passing full-check baseline before writing Task 1.1's failing feature tests.
- 2026-08-31: Ruling: client destination paths are unique across the complete
	catalog, not merely within one client, because two clients writing the same
	root would collide. Ruling: an agent collection's format is its collection
	name and may be mapped only by the same-named client; path-name heuristics are
	not part of the schema. Skill collections remain shareable across clients.

## Deferred Items

- Portable cross-harness agent generation is excluded; reconsider only when two concrete formats share enough semantics to justify translation.
- Unknown arbitrary symlink destinations are not discoverable safely; users must reinstall those destinations after the local move.
- Historical documents under `docs/superpowers` are not runtime or build
	dependencies. Retain them as provenance unless the user separately chooses
	deletion or archival; their disposition does not block Phase 1.

## Phase 1: Generic Knowledge Artifacts

### Phase 1 Output

A checked `install-catalog.json`, generic skill titles, deterministic discovery
of two skill and two agent fixture formats, and collection-aware customization
validation. No installer or repository identity behavior changes in this phase.

### Phase 1 Dependencies and Risks

- Depends on design commit `ca423b3`.
- Preserve the real executable-planning output bytes after adding its title.
- Catalog parsing must reject invalid paths and references before discovery.
- Artifact discovery reads committed client artifacts, not source manifests
	beneath `.agents/skills`.
- Recovery: each task remains a focused diff that the user can commit or revert
	without changing user links or repository identity.

### Task 1: Generic Skill Titles

**Files:**

- Modify: `src/lib/manifests.ts`
- Modify: `src/lib/render-skill.ts`
- Modify: `sources/executable-planning/skill.json`
- Modify: `test/manifests.test.ts`
- Modify: `test/render-skill.test.ts`
- Reuse: the in-memory `createValidManifest()` fixture in
	`test/manifests.test.ts`; no fixture manifest JSON exists on disk.

**Interfaces:**

- Produces: `SkillManifest.title: string`, validated as a nonempty single-line
	H1 title.
- Preserves: `parseSkillManifest(value, manifestPath, repoRoot)` and
	`renderSkill(manifest, sections)` signatures.

- [x] **1.0 Normalize and verify the formatting baseline.** Run
	`npm run format`, inspect the diff, and require formatter changes to be
	limited to `scripts/install-clients.ts`, `test/documentation.test.ts`,
	`test/install-clients.test.ts`, and `test/toolchain.test.ts`; this plan may
	also differ because it records the audit. Run `npm run check` and require an
	explicit zero exit before starting Task 1.1. If any other file changes or any
	gate fails, stop and record the result instead of beginning feature work.

- [x] **1.1 Write failing manifest and renderer tests.** Add `title` to the
	valid manifest fixture, reject missing, non-string, empty, and multiline
	titles, and prove two manifests render distinct H1s.

```typescript
const alpha = renderSkill(
	{ ...validManifest, name: "alpha", title: "Alpha Skill" },
	alphaSections,
);
const beta = renderSkill(
	{ ...validManifest, name: "beta", title: "Beta Skill" },
	betaSections,
);
assert.match(alpha.content, /^---[\s\S]*\n# Alpha Skill\n/m);
assert.match(beta.content, /^---[\s\S]*\n# Beta Skill\n/m);
```

- [x] **1.2 Run the focused tests and verify RED.** Run
	`./node_modules/.bin/tsx --test test/manifests.test.ts test/render-skill.test.ts`.
	Expected: failures report unknown or missing `title`, and rendered output
	still contains `# Executable Planning` for the beta fixture.
- [x] **1.3 Implement the minimal title contract.** Add `title` to
	`MANIFEST_KEYS` and `SkillManifest`, validate `title.trim() === title`,
	`title.length > 0`, and no CR/LF, then render ``# ${manifest.title}``.
- [x] **1.4 Update the real and fixture manifests.** Set the existing title to
	`Executable Planning`; do not alter its frontmatter name, description,
	selected sections, or output path.
- [x] **1.5 Verify GREEN and byte stability.** Run the focused tests,
	`npm run build`, and
	`git diff --exit-code -- .agents/skills/executable-planning/SKILL.md`.
	Expected: tests pass and the generated planning skill is unchanged.
- [x] **1.6 Report the title slice and suggest a commit.** Report changed files
	and validation evidence, then suggest `feat: support generic skill titles`.
	Do not stage, commit, or push.

### Task 2: Installation Catalog Schema

**Files:**

- Create: `install-catalog.json`
- Create: `src/lib/catalog.ts`
- Create: `test/catalog.test.ts`
- Create: `test/fixtures/catalog/repo/install-catalog.json`
- Create: fixture roots under `test/fixtures/catalog/repo/`

**Interfaces:**

```typescript
export type ArtifactKind = "skill" | "agent";
export type ValidationStrategy = "copilot-agent";

export type CollectionEntryRule =
	| { readonly kind: "directory"; readonly marker: string }
	| { readonly kind: "file"; readonly suffix: string };

export interface ArtifactCollection {
	readonly name: string;
	readonly artifactKind: ArtifactKind;
	readonly source: string;
	readonly entry: CollectionEntryRule;
	readonly validation?: ValidationStrategy;
}

export interface ClientDestination {
	readonly collection: string;
	readonly path: string;
}

export interface CatalogClient {
	readonly name: string;
	readonly destinations: readonly ClientDestination[];
}

export interface InstallCatalog {
	readonly collections: readonly ArtifactCollection[];
	readonly clients: readonly CatalogClient[];
}

export function parseInstallCatalog(
	value: unknown,
	sourceName: string,
	repoRoot: string,
): InstallCatalog;

export async function loadInstallCatalog(
	repoRoot: string,
): Promise<InstallCatalog>;
```

- [x] **2.1 Create catalog fixtures and failing parser tests.** Cover a valid
	skills collection, file and directory agent collections, multiple clients,
	closed keys, kebab-case uniqueness, discriminated entry rules, validation
	strategy closure, source existence and repository confinement, `~/`
	destinations, duplicate destinations, and unknown collection references.
- [x] **2.2 Run catalog tests and verify RED.** Run
	`./node_modules/.bin/tsx --test test/catalog.test.ts`. Expected: import fails
	because `src/lib/catalog.ts` does not exist.
- [x] **2.3 Implement schema parsing.** Follow `src/lib/manifests.ts` patterns:
	parse JSON as `unknown`, aggregate stable path-prefixed errors, freeze arrays
	and records, preserve catalog order, and allow only `copilot-agent` as the
	initial content validation strategy.
- [x] **2.4 Add the real catalog.** Declare `skills` from `.agents/skills`,
	`copilot` from `.github/agents`, and clients `copilot`, `claude`, and `agents`
	with the exact destinations approved in the spec.
- [x] **2.5 Verify parser and real catalog.** Run the focused catalog test and
	add one repository integration assertion that `loadInstallCatalog(REPO_ROOT)`
	succeeds with two collections and three clients.
- [x] **2.6 Report the catalog slice and suggest a commit.** Report changed
	files and validation evidence, then suggest
	`feat: add artifact installation catalog`. Do not stage, commit, or push.

### Task 3: Catalog-Driven Artifact Discovery

**Files:**

- Create: `src/lib/artifacts.ts`
- Create: `test/artifacts.test.ts`
- Expand: `test/fixtures/catalog/repo/` with two valid skills, one file-format
	agent, one directory-format agent, and invalid neighboring entries.

**Interfaces:**

```typescript
export interface Artifact {
	readonly kind: ArtifactKind;
	readonly id: string;
	readonly name: string;
	readonly collection: string;
	readonly sourcePath: string;
	readonly destinationName: string;
	readonly entryKind: "file" | "directory";
}

export async function discoverArtifacts(
	catalog: InstallCatalog,
	repoRoot: string,
): Promise<readonly Artifact[]>;
```

- [x] **3.1 Write failing discovery tests.** Assert skills require a directory
	marker, file agents require the suffix, directory agents require their
	marker, invalid neighbors are ignored, paths stay inside collection roots,
	IDs are unique, skill IDs are bare names, agent IDs are `format:name`, file
	destination names preserve suffixes, and output order is catalog then
	code-point lexical order.
- [x] **3.2 Run discovery tests and verify RED.** Run
	`./node_modules/.bin/tsx --test test/artifacts.test.ts`. Expected: missing
	`discoverArtifacts` import.
- [x] **3.3 Implement structural discovery.** Use `readdir` directory entries,
	`lstat`, marker checks, literal suffix removal, normalized containment checks,
	and stable errors. Do not parse skill source manifests or agent content here.
- [x] **3.4 Prove two formats.** The fixture must return two skills plus
	`copilot:fixture-planner` from a file and
	`custom-directory:fixture-reviewer` from a marked directory.
- [x] **3.5 Verify GREEN and integration.** Run catalog and artifact tests,
	then assert the real catalog discovers `executable-planning` and
	`copilot:executable-planner`.
- [x] **3.6 Report discovery and suggest a commit.** Report changed files and
	validation evidence, then suggest `feat: discover catalog artifacts`. Do not
	stage, commit, or push.

### Task 4: Collection-Aware Customization Validation

**Files:**

- Modify: `src/check-customizations.ts`
- Modify: `test/check-customizations.test.ts`
- Modify: `test/fixtures/repository/` as needed for catalog-aware fixtures.

**Interfaces:**

- Consumes: `loadInstallCatalog`, `discoverArtifacts`, and existing
	`parseFrontmatter`/`listSections`.
- Produces: unchanged `checkCustomizations(repoRoot): Promise<void>` with
	catalog-aware behavior.

- [x] **4.1 Write failing dependency-scope tests.** Create two skills and two
	Copilot agents. Prove an agent may declare no skill, may declare one existing
	skill without declaring the other, fails for a missing declared skill, and
	checks duplicate headings only against the declared skill.

```typescript
test("agent dependencies are validated independently", async () => {
	const repoRoot = await createFixtureRepo({
		skills: ["planning", "reviewing"],
		agentRequiredSkills: ["planning"],
	});
	await checkCustomizations(repoRoot);
});
```

- [x] **4.2 Run focused validation tests and verify RED.** Run
	`./node_modules/.bin/tsx --test test/check-customizations.test.ts`. Expected:
	the current validator reports a missing declaration for the unrelated skill.
- [x] **4.3 Implement collection-aware validation.** Load the catalog, build a
	map of skill ID to headings, validate structural-only collections through
	discovery, and apply Copilot frontmatter plus REQUIRED SKILL checks only to
	collections declaring `copilot-agent`.
- [x] **4.4 Extract declarations deterministically.** Match complete markers
	with `/\*\*REQUIRED SKILL:\*\*\s+Use\s+([a-z0-9]+(?:-[a-z0-9]+)*)/g`,
	deduplicate IDs, and produce stable missing-skill errors containing agent and
	skill IDs.
- [x] **4.5 Verify the phase.** Run catalog, artifact, manifest, renderer, and
	customization tests followed by `npm run check`.
- [x] **4.6 Report validation and suggest a commit.** Report changed files and
	validation evidence, then suggest
	`feat: validate artifact collections independently`. Do not stage, commit, or
	push.

### Phase 1 Validation

```sh
./node_modules/.bin/tsx --test \
	test/catalog.test.ts \
	test/artifacts.test.ts \
	test/manifests.test.ts \
	test/render-skill.test.ts \
	test/check-customizations.test.ts
npm run check
git status --short
```

Completion criteria: all focused and repository tests pass; the real planning
skill has no generated diff; catalog/discovery fixtures contain two skills and
two agent formats; worktree state is reported with four suggested commit
messages and no agent-created commits.

### Phase 1 Checkpoint

- [?] **1.C Present the tangible output and validation evidence to the user,
	update this plan, and stop until the user confirms Phase 2 may begin.**

## Phase 2: Selection and Installation

### Phase 2 Output

`npm run install:artifacts` can list all cataloged artifacts and install all or
selected skills and format-scoped agents into built-in or arbitrary
destinations. The old package command remains an exact compatibility alias.

### Phase 2 Dependencies and Risks

- Depends on the Phase 1 catalog and flat `Artifact` interface.
- Split argument/selection and filesystem execution out of the current large
	installer instead of adding more responsibilities to one script.
- Listing must not call destination classification or create directories.
- Recovery: retain existing installer tests until equivalent generic tests pass;
	rename files with filesystem operations that leave the Git index unchanged.

### Task 5: Artifact Argument Grammar

**Files:**

- Create: `src/lib/artifact-arguments.ts`
- Create: `test/artifact-arguments.test.ts`

**Interfaces:**

```typescript
export interface AgentDirectoryArgument {
	readonly collection: string;
	readonly directory: string;
}

export interface ParsedArtifactArguments {
	readonly clients: readonly string[];
	readonly skillDirectories: readonly string[];
	readonly agentDirectories: readonly AgentDirectoryArgument[];
	readonly skills: readonly string[];
	readonly agents: readonly string[];
	readonly listOnly: boolean;
	readonly hasDestinationArguments: boolean;
}

export function parseArtifactArguments(
	arguments_: readonly string[],
): ParsedArtifactArguments;
```

- [ ] **5.1 Write failing parser tests.** Cover every repeatable flag, stable
	deduplication, `--client all`, `format=path`, `format:name`, missing values,
	empty halves, unknown flags, and `--list` exclusivity.
- [ ] **5.2 Run and verify RED.** Run
	`./node_modules/.bin/tsx --test test/artifact-arguments.test.ts`. Expected:
	missing module/import.
- [ ] **5.3 Implement syntax-only parsing.** Preserve raw relative paths for
	later cwd resolution; do not consult the catalog or filesystem. Set
	`hasDestinationArguments` only for client and custom destination flags.
- [ ] **5.4 Run and verify GREEN.** All parser cases pass with stable usage
	errors naming `npm run install:artifacts`.
- [ ] **5.5 Report argument parsing and suggest a commit.** Report changed files
	and validation evidence, then suggest
	`feat: parse artifact installation arguments`. Do not stage, commit, or push.

### Task 6: Selection, Targets, and Listing

**Files:**

- Create: `src/lib/artifact-selection.ts`
- Create: `test/artifact-selection.test.ts`

**Interfaces:**

```typescript
export interface InstallTarget {
	readonly collection: string;
	readonly directory: string;
}

export interface ArtifactRequest {
	readonly listOnly: boolean;
	readonly artifacts: readonly Artifact[];
	readonly targets: readonly InstallTarget[];
}

export interface ResolveArtifactRequestOptions {
	readonly cwd: string;
	readonly homeDirectory: string;
}

export function resolveArtifactRequest(
	parsed: ParsedArtifactArguments,
	catalog: InstallCatalog,
	artifacts: readonly Artifact[],
	options: ResolveArtifactRequestOptions,
): ArtifactRequest;

export function formatArtifactListing(
	catalog: InstallCatalog,
	artifacts: readonly Artifact[],
): string;
```

- [ ] **6.1 Write failing selection tests.** Cover no destination flags meaning
	all catalog clients, custom-only mode, explicit client plus custom targets,
	no selectors meaning all compatible artifacts, skill and agent filters,
	unknown IDs, exact agent format compatibility, normalized target
	deduplication, and conflicting collection mappings to one path.
- [ ] **6.2 Write failing listing tests.** Assert each artifact appears once,
	agent IDs include format, compatible clients follow catalog order, output is
	stable, and `listOnly` returns no targets.
- [ ] **6.3 Run and verify RED.** Run
	`./node_modules/.bin/tsx --test test/artifact-selection.test.ts`. Expected:
	missing selection exports.
- [ ] **6.4 Implement request resolution.** Resolve `~/` against
	`homeDirectory`, relative custom paths against `cwd`, apply default clients
	only when no custom destination flag suppresses them, validate all selectors,
	then reject selected agent formats lacking an exact selected target.
- [ ] **6.5 Implement pure listing.** Derive compatible clients by catalog
	destination membership. Return text only; do not inspect destinations.
- [ ] **6.6 Verify GREEN and suggest a commit.** Run argument and selection
	tests, report changed files and evidence, then suggest
	`feat: resolve and list artifact selections`. Do not stage, commit, or push.

### Task 7: Generic Symlink Installation Engine

**Files:**

- Create: `src/lib/install-artifacts.ts`
- Create: `test/install-artifacts.test.ts`
- Preserve temporarily: `scripts/install-clients.ts`
- Preserve temporarily: `test/install-clients.test.ts`

**Interfaces:**

```typescript
export interface ResolvedLink {
	readonly kind: "file" | "directory";
	readonly sourcePath: string;
	readonly destinationPath: string;
}

export interface InstallResult {
	readonly created: readonly string[];
	readonly existing: readonly string[];
}

export function buildArtifactLinks(
	request: ArtifactRequest,
): readonly ResolvedLink[];

export async function installArtifacts(
	links: readonly ResolvedLink[],
): Promise<InstallResult>;
```

- [ ] **7.1 Port tests before code.** Adapt the existing fixture to two skills,
	a file agent, and a directory agent. Test destination names, multiple targets,
	equivalent mapping deduplication, conflicting mappings, idempotence, regular
	collisions, unrelated and broken links, canonical aliases, missing/wrong
	source kinds, aggregate errors, all-before-write, and Windows EPERM guidance.
- [ ] **7.2 Run and verify RED.** Run
	`./node_modules/.bin/tsx --test test/install-artifacts.test.ts`. Expected:
	missing generic engine module.
- [ ] **7.3 Move the proven filesystem core.** Transfer and generalize
	`classifyDestination`, `validateSource`, canonical path comparison,
	deduplication, preflight aggregation, and write execution. `buildArtifactLinks`
	maps each selected artifact to targets with the same collection only.
- [ ] **7.4 Run new and legacy tests.** Both installer suites must pass before
	removing the legacy script or tests.
- [ ] **7.5 Mutation-check all-before-write.** Temporarily bypass the error gate,
	confirm the partial-batch test fails, restore the gate, and rerun GREEN.
- [ ] **7.6 Report the engine and suggest a commit.** Report changed files and
	validation evidence, then suggest `feat: install resolved artifacts safely`.
	Do not stage, commit, or push.

### Task 8: CLI and Compatibility Migration

**Files:**

- Rename: `scripts/install-clients.ts` to `scripts/install-artifacts.ts`
- Rename: `test/install-clients.test.ts` to `test/install-artifacts-cli.test.ts`
- Modify: `scripts/install-artifacts.ts`
- Modify: `test/install-artifacts-cli.test.ts`
- Modify: `package.json`
- Modify: `test/toolchain.test.ts`

**Interfaces:**

- Consumes: all Phase 1/2 APIs.
- Produces: thin `runCli()` orchestration and package commands
	`install:artifacts` plus compatibility alias `install:clients`.

- [ ] **8.1 Write failing CLI and package tests.** Run the real script against a
	temporary home and custom directories. Cover no-argument defaults, selected
	skill, selected agent, mixed targets, list output with no writes, malformed
	input exit status, and identical behavior through both npm script names.
- [ ] **8.2 Run and verify RED.** Run
	`./node_modules/.bin/tsx --test test/install-artifacts-cli.test.ts test/toolchain.test.ts`.
	Expected: new script and package command are absent.
- [ ] **8.3 Assemble the thin CLI.** Determine `repoRoot` from `import.meta.url`,
	load catalog, discover artifacts, parse arguments, print listing or resolve
	and execute links, and preserve `EXECUTABLE_PLANNING_HOME` only as the current
	test-home compatibility variable until Phase 3 renames it.
- [ ] **8.4 Rename files and scripts without staging.** Use a filesystem rename
	operation such as `/bin/mv`, never `git mv`; set `install:artifacts` to
	`tsx scripts/install-artifacts.ts` and `install:clients` to
	`npm run install:artifacts --` so forwarded arguments remain intact. Verify
	the staged state is identical to its pre-task snapshot.
- [ ] **8.5 Remove duplicate legacy implementation only after GREEN.** All
	behavior must live in focused `src/lib` modules or the thin new CLI.
- [ ] **8.6 Verify real read-only listing.** Run both
	`npm run install:artifacts -- --list` and
	`npm run install:clients -- --list`; outputs must match and `git status` must
	show no destination artifacts.
- [ ] **8.7 Verify the phase and suggest a commit.** Run `npm run check`, report
	changed files and evidence, then suggest
	`feat: install selectable agents and skills`. Do not stage, commit, or push.

### Phase 2 Validation

```sh
./node_modules/.bin/tsx --test \
	test/artifact-arguments.test.ts \
	test/artifact-selection.test.ts \
	test/install-artifacts.test.ts \
	test/install-artifacts-cli.test.ts
npm run install:artifacts -- --list
npm run install:clients -- --list
npm run check
git status --short
```

Completion criteria: listing is read-only and stable; selectors and format
compatibility work; generic installer safety equals or exceeds the legacy
suite; both package command names work; worktree status is reported for the
user's manual commit decision.

### Phase 2 Checkpoint

- [ ] **2.C Present list output, focused/full test evidence, and a diff summary
	to the user; update this plan and stop until the user confirms identity and
	migration work may begin.**

## Phase 3: Repository Identity and Migration

### Phase 3 Output

The collection is documented and packaged as `agents-skills`, manually
committed and pushed by the user, renamed to `zandermax/agents-skills`, moved to
`/Users/zander/repos/agents-skills`, and known client links resolve into the
new path.

### Phase 3 Dependencies and Risks

- Depends on explicit Phase 2 checkpoint approval and a clean full check.
- GitHub rename, symlink removal, and local move are separately confirmed
	destructive operations.
- The target GitHub name must still be absent immediately before rename.
- The local move invalidates the current workspace path and is last.
- Rollback details are attached to each mutation below.

### Task 9: Collection Identity and Documentation

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`
- Modify: `test/documentation.test.ts`
- Modify: `src/check-customizations.ts`
- Modify: `test/check-customizations.test.ts`
- Modify: `scripts/install-artifacts.ts`
- Modify: `test/install-artifacts-cli.test.ts`

**Interfaces:**

- Package name becomes `agents-skills`.
- Primary test-home variable becomes `AGENTS_SKILLS_HOME`; continue accepting
	`EXECUTABLE_PLANNING_HOME` as a documented deprecated fallback for one
	migration cycle.

- [ ] **9.1 Write failing identity tests.** Assert package name, primary install
	command, generic README title/sections, every CLI selector, catalog extension
	instructions, collision/move recovery, and primary plus fallback test-home
	variables. Remove exact single-artifact mapping assertions.
- [ ] **9.2 Run and verify RED.** Run documentation, toolchain, CLI, and
	customization tests. Expected: old package/title/env assumptions fail.
- [ ] **9.3 Update package identity safely.** Change `package.json`, run
	`npm install --package-lock-only --ignore-scripts`, and confirm only root
	package names change in `package-lock.json`.
- [ ] **9.4 Rewrite README around the catalog.** Document adding skills,
	client-ready agents, new agent formats, listing, selectors, built-in/custom
	destinations, safety, stale links, moves, and the planning snapshot as one
	feature-specific maintenance section.
- [ ] **9.5 Generalize remaining repository markers.** Remove repository-level
	wording that implies one planning artifact while retaining planning-specific
	tests, source names, generated output, vendor provenance, and historical docs.
- [ ] **9.6 Verify and suggest a commit.** Run focused tests and
	`npm run check`; search shared code/package/README for unjustified planning
	identity references; report changed files and evidence, then suggest
	`chore: rename package to agents-skills`. Do not stage, commit, or push.

### Task 10: Pre-Rename Gate and Link Inventory

**Files:**

- Update continuously: this canonical plan's Current State and Progress Log.
- Create outside repository: `/tmp/agents-skills-link-inventory.json`.

- [ ] **10.1 Prepare the manual release-candidate gate.** Run `npm run check`,
	report `git status --short` and the suggested message
	`chore: prepare agents-skills migration`, then stop so the user can stage,
	commit, and push all intended changes to the existing `origin`. Do not run
	any staging, commit, or push command.
- [ ] **10.2 Verify the user's release candidate.** After the user confirms,
	require `git status --short` to be empty, record `git rev-parse HEAD`, run
	`git fetch origin`, and verify `origin/mainline` contains that HEAD. Stop if
	the local commit is not present remotely.
- [ ] **10.3 Reconfirm GitHub preconditions.** Verify authenticated login is
	`zandermax`, `zandermax/plans` exists with admin permission, and
	`gh repo view zandermax/agents-skills` exits nonzero because the target does
	not exist. Stop on any different result.
- [ ] **10.4 Inventory known links without mutation.** Derive expected artifact
	paths from the real catalog and discovered artifacts. For each expected path,
	require `lstat` symlink type, resolve `readlink` lexically against its parent,
	and classify as old-root, absent, unrelated, or collision. Write only the
	inventory JSON under `/tmp`.
- [ ] **10.5 Validate inventory safety.** Proceed only when every existing known
	destination is a symlink whose normalized target is inside
	`/Users/zander/repos/plans`; absent destinations are allowed. Report unrelated
	links/files/directories and stop without removing anything.
- [ ] **10.6 Mark symlink removal awaiting user.** Update this plan with the
	exact verified destination list as the immediate `[?]` step and ask the user
	to authorize removing only those symlinks.
- [ ] **10.7 After approval, unlink verified paths only.** Recheck each path
	immediately before `unlink`; never recursively remove parents. Verify each
	recorded path is absent and retain the inventory for recreation.
- [ ] **10.8 Report migration state and suggest a commit.** Report the plan and
	inventory evidence, then suggest `docs: record agents-skills migration state`.
	Do not stage, commit, or push. Stop so the user can commit and push the plan,
	then verify clean and remote-contained HEAD before Task 11. Treat that
	verified commit as the Task 10 migration baseline.

### Task 11: Remote Repository Rename

**Files:**

- Modify local Git config: `.git/config` through `git remote set-url`.
- Modify GitHub repository metadata for `zandermax/plans`.

- [ ] **11.1 Mark remote rename awaiting user.** Record current remote, HEAD,
	user-confirmed remote-contained HEAD, target absence, and rollback limitation
	in this plan; insert
	the rename as immediate `[?]` action and ask explicit confirmation.
- [ ] **11.2 Rename GitHub after approval.** Run
	`gh repo rename agents-skills --repo zandermax/plans --yes`, then
	`gh repo edit zandermax/agents-skills --description "Build, validate, and install custom agents and skills across AI coding harnesses."`.
- [ ] **11.3 Verify remote identity.** Require
	`gh repo view zandermax/agents-skills --json nameWithOwner,description,url`
	to report the approved values. GitHub's old-name redirect is fallback only.
- [ ] **11.4 Update and verify origin.** Run
	`git remote set-url origin https://github.com/zandermax/agents-skills.git`,
	verify fetch and push URLs exactly, and run `git fetch origin --dry-run`.
- [ ] **11.5 Update plan state and suggest a commit.** Record remote evidence
	and set the exact next action to the local move confirmation. If verification
	fails, restore origin to the reachable repository URL; do not move the local
	directory. Report changed files and evidence, then suggest
	`docs: record agents-skills remote rename`. Do not stage, commit, or push.
	Stop so the user can commit and push to the renamed origin, then verify clean
	and remote-contained HEAD. Treat that verified commit as the Task 11 migration
	baseline.

### Task 12: Local Move, Link Recreation, and Smoke Gate

**Files:**

- Move directory: `/Users/zander/repos/plans` to
	`/Users/zander/repos/agents-skills`.
- Continue canonical plan at:
	`/Users/zander/repos/agents-skills/docs/plans/2026-08-30-agents-skills-repository.md`.

- [ ] **12.1 Mark local move awaiting user.** Confirm the target directory does
	not exist, worktree is clean, HEAD matches the Task 11 migration baseline,
	origin is renamed, and
	verified old-root symlinks are absent. Record rollback command
	`mv /Users/zander/repos/agents-skills /Users/zander/repos/plans` and ask
	explicit approval.
- [ ] **12.2 Perform the move as the final old-workspace operation.** From
	`/Users/zander/repos`, run `mv plans agents-skills`, then immediately change
	into the new directory. Do not issue later commands against the old path.
- [ ] **12.3 Verify repository identity at the new path.** Require the old path
	absent, new `.git` present, HEAD unchanged, worktree clean, origin exact, and
	`git fetch origin --dry-run` successful. If this fails, move the directory
	back before recreating old-path links.
- [ ] **12.4 Recreate known links through the installer.** Run
	`npm run install:artifacts -- --client all`, compare created/existing paths
	with the inventory, and verify every recreated `readlink` target normalizes
	inside `/Users/zander/repos/agents-skills` and exists.
- [ ] **12.5 Run final smoke validation.** From the new path run
	`npm run install:artifacts -- --list`, rerun
	`npm run install:artifacts -- --client all` to prove idempotence, then run
	`npm run check` with explicit zero exit.
- [ ] **12.6 Update the moved canonical plan.** Record link results, final
	command evidence, new path, remote URL, and any unknown custom destinations;
	set Status to `completed` only after all checks pass.
- [ ] **12.7 Reopen VS Code.** Open `/Users/zander/repos/agents-skills`, verify
	terminal cwd, TypeScript diagnostics, branch, and Git remote, then close the
	obsolete workspace window.
- [ ] **12.8 Report completion and suggest a commit.** Report final migration
	evidence and suggest `docs: complete agents-skills migration`. Do not stage,
	commit, or push.

### Phase 3 Validation

From `/Users/zander/repos/agents-skills`, run:

```sh
test ! -e /Users/zander/repos/plans
test -d /Users/zander/repos/agents-skills/.git
git status --short
git remote get-url origin
gh repo view zandermax/agents-skills --json nameWithOwner,description,url
npm run install:artifacts -- --list
npm run install:artifacts -- --client all
npm run check
```

Completion criteria: local and remote names match `agents-skills`; origin and
GitHub metadata are exact; known links resolve under the new root; the second
installation is idempotent; all repository checks pass; unknown custom targets
are explicitly reported.

### Phase 3 Checkpoint

- [ ] **3.C Present remote metadata, local path, link verification, full test
	evidence, and workspace reopen status to the user. Record their confirmation
	or any follow-up item in this plan.**

## Progress Log

- 2026-08-30: Approved design committed as `ca423b3`; implementation plan drafting started.
- 2026-08-30: Three read-only phase planners outlined catalog/discovery,
  selection/installation, and identity/migration work. Interfaces and
  dependencies were reconciled into this canonical plan.
- 2026-08-30: Plan reached the approval checkpoint; no implementation or remote
	mutation has started.
- 2026-08-30: User approved the plan for inline execution. Per the planning
	workflow, implementation remains stopped at the handoff boundary.
- 2026-08-30: User revised Git policy: agents must never stage, commit, or push;
	every task ends with a suggested commit message for the user to apply.
- 2026-08-30: Moved the active generic design and plan into `docs/specs` and
	`docs/plans`; replaced the harness-specific execution directive with
	`executable-planning`.
- 2026-08-30: Strengthened Git ownership: agents must neither stage changes nor
	remove staged changes by any direct or indirect mechanism, must preserve the
	pre-task index state, and must use filesystem-only rename operations instead
	of `git mv`.
- 2026-08-31: Audited implementation against this plan. Tasks 1-9 remain
	unimplemented: no manifest title contract, installation catalog, generic
	artifact discovery/selection/installer modules, generic CLI, package rename,
	or generic README exists. The local repository path and origin URL already
	use `agents-skills`, so the later migration procedure is stale and must be
	reconciled before Phase 3 rather than replayed.
- 2026-08-31: Fresh validation found a clean worktree. TypeScript, 94 tests,
	Markdown lint, customization validation, and generated-output drift checks
	passed when run independently. `npm run check` failed at its first Biome stage
	because four existing TypeScript files require formatting; no files were
	changed by the check.
- 2026-08-31: User selected baseline normalization before Task 1.1. Added Task
  1.0 with a four-file formatting boundary and a required passing `npm run
  check`; no feature implementation has started.
- 2026-08-31: Task 1.0 completed. `npm run format` changed only the four
	approved TypeScript files, and `npm run check` passed with 94/94 tests plus
	Biome, Markdown lint, TypeScript, customization validation, and drift checks.
	Advanced to Task 1.1; no title-contract production code has been changed.
- 2026-08-31: Tasks 1.1 and 1.2 completed. The focused run reported 19 tests,
	11 passing and 8 failing. The valid manifest failed because `title` is an
	unknown closed-schema key, the missing-title case did not throw, and the
	renderer emitted `# Executable Planning` instead of `# Alpha Skill`; these
	are the expected feature-missing RED reasons. The plan's referenced fixture
	manifest JSON does not exist; tests use the in-memory `createValidManifest()`
	fixture, which now includes `title`.
- 2026-08-31: Tasks 1.3 and 1.4 completed. The parser now accepts and validates
	a trimmed, nonempty, single-line `title`; the renderer uses it for the sole
	H1; and the real manifest sets `Executable Planning`. The focused suite
	passed 19/19.
- 2026-08-31: Tasks 1.5 and 1.6 completed. Focused tests passed 19/19, the real
	skill rebuilt with no generated diff, and the final full gate passed 96/96
	tests plus all static, customization, and drift checks. The first full-gate
	attempt exposed title-less manifests in build and customization fixtures;
	adding titles to those fixture constructors repaired the same slice. Suggested
	commit: `feat: support generic skill titles`. No staging, commit, or push was
	performed. Advanced to Task 2.1.
- 2026-08-31: Tasks 2.1 and 2.2 completed. Added a valid catalog fixture with
	skill, file-agent, and directory-agent collections plus two clients, and
	parser tests for closure, names, entry rules, source safety, destinations,
	references, order, and immutability. The focused run failed at module
	resolution because `src/lib/catalog.ts` does not exist, exactly the planned
	RED reason.
- 2026-08-31: Task 2.3 completed. The catalog parser aggregates stable
	path-prefixed errors, preserves order, validates confined source directories
	and closed entry/validation strategies, and freezes nested results. The
	focused catalog suite passed 8/8 after correcting one test regex to match the
	parser's `directory, file` option order.
- 2026-08-31: Tasks 2.4 and 2.5 completed with a second RED/GREEN cycle. The
	repository integration assertion first failed with `ENOENT` for the root
	catalog, then passed after adding the approved `skills` and `copilot`
	collections plus `copilot`, `claude`, and `agents` clients. The focused suite
	passed 9/9.
- 2026-08-31: Task 2.6 completed. Formatting normalized the new catalog files,
	and the full gate passed 105/105 tests plus all static, customization, and
	drift checks. Suggested commit: `feat: add artifact installation catalog`.
	No staging, commit, or push was performed. Advanced to Task 3.1.
- 2026-08-31: Tasks 3.1 and 3.2 completed. Expanded the catalog fixture with
	two skills, file and directory agents, and wrong-type/unmarked neighbors;
	added tests for structural membership, identifiers, destinations, ordering,
	containment, uniqueness, immutability, and real artifacts. The focused run
	failed at module resolution because `src/lib/artifacts.ts` does not exist,
	exactly the planned RED reason.
- 2026-08-31: Tasks 3.3 through 3.5 completed. Structural discovery uses
	code-point-sorted directory entries, regular file/directory checks, literal
	suffix removal, marker files, normalized containment, immutable artifacts,
	and duplicate-ID rejection. Artifact tests passed 3/3; catalog plus artifact
	integration passed 12/12 and found the real `executable-planning` and
	`copilot:executable-planner` artifacts.
- 2026-08-31: Task 3.6 completed. The first full gate exposed a TypeScript
	`readdir` overload inference issue; pinning UTF-8 and `Dirent<string>[]`
	repaired the same slice. The rerun passed 108/108 tests plus all static,
	customization, and drift checks. Suggested commit:
	`feat: discover catalog artifacts`. No staging, commit, or push was
	performed. A batched foundation review is next before Task 4.1.
- 2026-08-31: Foundation review found catalog destination uniqueness was scoped
	per client instead of globally and format agreement lacked an implementation.
	Accepted both findings with the rulings above. The review's note about agents
	requiring every skill is the existing behavior Task 4 explicitly replaces,
	so it does not reopen Tasks 1-3.
- 2026-08-31: Foundation fix round 1 added RED/GREEN regressions for global
	destination uniqueness and agent collection/client format agreement. The
	full gate passed 110/110; scoped re-review found no Critical, Important, or
	Minor issues and approved both specification compliance and code quality.
	Advanced to Task 4.1.
- 2026-08-31: Tasks 4.1 and 4.2 completed. Added catalog-backed multi-skill
	fixtures and four dependency-scope tests. The focused run passed 11 and
	failed the four new cases for the expected reasons: no-skill and one-of-two
	agents were rejected, a missing declared skill was ignored, and an undeclared
	skill's heading collided globally.
- 2026-08-31: Tasks 4.3 and 4.4 completed. Customization validation now loads
	the catalog and discovered artifacts, maps each skill ID to its own headings,
	applies Copilot checks only to `copilot-agent` collections, extracts and
	deduplicates complete REQUIRED SKILL declarations, rejects missing declared
	IDs, and checks headings only against declared skills. The expanded focused
	suite passed 17/17, including two-agent independence and structural-only
	collection coverage.
- 2026-08-31: Task 4.5 completed. The exact Phase 1 focused suite passed 50/50;
	after formatting, the full repository gate passed 115/115 tests plus Biome,
	Markdown lint, TypeScript, customization validation, and generated-output
	drift checks. Task 4 review is next.
- 2026-08-31: Task 4.6 completed. Task review found no Critical, Important, or
	Minor issues and approved specification compliance and code quality.
	Suggested commit: `feat: validate artifact collections independently`. No
	staging, commit, or push was performed. Broad Phase 1 review is next.
- 2026-08-31: Broad Phase 1 review found no Critical, Important, or Minor
	defects and approved specification compliance and code quality across titles,
	catalog parsing, artifact discovery, and collection-aware validation. Moved
	to interactive checkpoint 1.C; Phase 2 remains blocked pending user
	confirmation.
- 2026-08-31: Final checkpoint verification passed: `npm run check` completed
	with 115/115 tests plus all static, customization, and drift checks;
	`git diff --check` produced no errors; and the generated executable-planning
	skill has no diff. Worktree status was reported without modifying the index:
	Phase 1 source/tests/catalog/fixtures and the approved four-file baseline
	formatting are modified or untracked, while this plan retains its pre-existing
	staged state plus current unstaged ledger updates.
