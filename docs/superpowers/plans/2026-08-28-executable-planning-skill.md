# Executable Planning Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a statically composed, cross-client executable-planning skill, a thin Copilot custom agent that requires it, and an idempotent symlink installer.

**Architecture:** A strict TypeScript Node project reads declarative manifests, exact-match transformations, project-owned Markdown sections, and a verbatim official Copilot Plan agent snapshot. It validates all inputs before writing a committed Agent Skills artifact; a separate installer links the skill and agent into supported user-level client locations.

**Tech Stack:** Node.js 24.15.0, npm 11.12.1, TypeScript 7.0.2, `tsx` 4.23.12, YAML 2.9.0, Biome 2.5.11, Node's built-in test runner

**Spec:** `docs/superpowers/specs/2026-08-28-executable-planning-skill-design.md`

## Global Constraints

- Mode is interactive. Stop after each phase checkpoint and wait for explicit user confirmation.
- The plan is the canonical implementation-state record. Update Current State, checkboxes, decisions, blockers, and Progress Log after every material event and before proceeding.
- Use test-driven development for production TypeScript: write one failing behavior test, verify the expected failure, implement the minimum, then rerun the focused test.
- Use only deterministic parsing, exact transformations, and static validation. No LLM participates in build, lint, transformation, conflict handling, or installation.
- Every output section has exactly one source owner. Duplicate headings, overlapping ownership, and unmatched exact transformations are errors.
- Run `npm run format` after editing supported files, inspect its diff, and fix all `npm run check` failures before a phase checkpoint.
- Build output contains only client-facing skill content.
- Never overwrite an existing regular file, directory, or unrelated symlink during client installation.
- Do not create git commits unless the user separately requests them.
- Do not install links into the real user home during implementation without explicit confirmation. Installer tests use temporary homes.

---

## Plan Metadata

- Status: in-progress
- Mode: interactive
- Canonical location: `docs/superpowers/plans/2026-08-28-executable-planning-skill.md`
- Last updated: 2026-08-29
- Goal: A fresh checkout can statically build, validate, and install the executable-planning skill and thin Copilot agent.
- Success criteria: See the approved spec and Phase 3 final validation.
- Constraints and assumptions: macOS is the active platform; links must remain portable to Linux and fail clearly on Windows permission limitations; the user explicitly approved implementation directly on `mainline` in this single-user private repository.

## Current State

- Status: completed
- Current phase: Phase 3 — Client Integration and Maintainability
- Current step: Completed — P3 approved and real-home clients installed
- Next action: Reload or restart each client if skill discovery is cached.
- Blockers: None

## Decisions

- 2026-08-28: The reusable skill is canonical; the custom agent is a thin harness adapter.
- 2026-08-28: The official Copilot Plan agent feeds the skill only and remains a verbatim local snapshot.
- 2026-08-28: Composition uses single-owner sections and exact required transformations, not precedence or fuzzy merging.
- 2026-08-28: `.agents/skills/executable-planning/SKILL.md` is the committed cross-client artifact.
- 2026-08-28: Installation uses an explicit `npm run install:clients` command, never npm's automatic install lifecycle.
- 2026-08-28: Three Explore subagents independently outlined the build, knowledge-package, and client-integration phases; their compatible boundaries are synthesized below.
- 2026-08-28: Execution uses an isolated orphan work tree and Git tree snapshots for review boundaries because the repository has no initial commit and this plan forbids creating commits.
- 2026-08-28: Task 1 adds `typecheck: tsc --noEmit`; the task interface, smoke test, spec, and downstream commands require it although the supplied package JSON block omits it.
- 2026-08-28: Task 9 runs its focused customization tests, while repository-wide customization lint is deferred until Task 11 creates the README that the checker requires.
- 2026-08-28: Restored the canonical Phase 1 state from the SDD ledger after a failed fixture worker reverted plan-only execution updates; ledger tree IDs and validation records were treated as authoritative recovery evidence.
- 2026-08-29: The user explicitly approved ending isolated work tree execution and continuing directly on `mainline` so each interactive checkpoint is reviewable in the open workspace.
- 2026-08-29: The former work tree remains frozen only as rollback until the user signs off on the migrated P1 checkpoint; no further implementation occurs there.
- 2026-08-29: The user explicitly approved P1 on `mainline`; Phase 2 may begin and the frozen rollback work tree may be removed.
- 2026-08-29: The user explicitly approved P2 on `mainline`; Phase 3 may begin.

## Deferred Items

- Actual links into `$HOME`: defer until Phase 3 validation passes and the user explicitly authorizes installation.
- Automated retrieval of future official Plan agent versions: out of scope; updates remain explicit snapshot replacements.
- User-level support for clients outside Copilot, Claude, and Agent Skills consumers: add when a documented client path is known.

## File Map

- `.gitignore` — excludes installed dependencies and local SDD recovery artifacts from review diffs.
- `package.json` — pinned tooling, ESM mode, and build/test/lint/install commands.
- `package-lock.json` — exact npm dependency graph.
- `tsconfig.json` — strict Node ESM static analysis.
- `biome.json` — formatting, linting, import organization, and VCS-aware file selection.
- `src/lib/frontmatter.ts` — YAML frontmatter parsing and rendering.
- `src/lib/markdown-sections.ts` — heading extraction outside fenced code.
- `src/lib/transforms.ts` — ordered literal remove/replace operations with exact counts.
- `src/lib/manifests.ts` — unknown-input validation, path confinement, and section ownership.
- `src/lib/render-skill.ts` — pure, deterministic skill composition and semantic checks.
- `src/build-skills.ts` — all-before-write orchestration and drift mode.
- `src/check-customizations.ts` — static cross-document invariants for agents, skills, and README instructions.
- `sources/executable-planning/core.md` — project-owned canonical planning behavior migrated from the existing custom agent.
- `sources/executable-planning/skill-only.md` — skill discovery and cross-harness adaptation only.
- `sources/executable-planning/skill.json` — ordered composition and semantic assertions.
- `sources/executable-planning/transforms.json` — finite exact rewrites for selected official sections.
- `vendor/copilot/Plan.agent.md` — byte-for-byte official snapshot.
- `vendor/copilot/README.md` — source provenance and static update procedure.
- `.agents/skills/executable-planning/SKILL.md` — built Agent Skills document.
- `.github/agents/executable-planner.agent.md` — thin Copilot adapter that requires the skill.
- `scripts/install-clients.ts` — static client mappings and collision-safe symlink installation.
- `test/*.test.ts` — unit and integration behavior.
- `test/fixtures/` — isolated source trees and behavioral pressure cases.
- `README.md` — agent maintenance commands and client discovery/use instructions.

---

## Phase 1: Static Build Foundation

### Tangible Output

A strict TypeScript Node project can parse frontmatter and headings, validate manifests, apply exact transformations, compose deterministic skills, detect drift, and lint customization invariants using focused passing tests.

### Dependencies and Risks

- No implementation dependency on later phases; fixtures stand in for real planning content.
- TypeScript 7 may reject older configuration patterns. Use `module` and `moduleResolution` set to `NodeNext` and resolve imports consistently.
- Use `tsx --test`, not the deprecated `--loader=tsx` form.
- Biome must not be invoked from the pure renderer. Formatting is an explicit repository command.

### Task 1: Initialize the Node Toolchain

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `biome.json`
- Create: `test/toolchain.test.ts`
- Generate: `package-lock.json`

**Interfaces:**

- Consumes: Node.js 24.15.0 and npm 11.12.1.
- Produces: `npm test`, `npm run format`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check`, and `npm run install:clients` command contracts.

- [x] **1.1 Create package metadata and strict tool configuration**

Use `apply_patch` to create `package.json` with `private: true`, `type: "module"`, exact engine values, and these exact package versions:

```json
{
  "name": "executable-planning",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": "24.15.0",
    "npm": "11.12.1"
  },
  "scripts": {
    "build": "tsx src/build-skills.ts --write",
    "check": "npm run lint && npm run typecheck && npm test && npm run check:customizations && npm run check:drift",
    "check:customizations": "tsx src/check-customizations.ts",
    "check:drift": "tsx src/build-skills.ts --check",
    "format": "biome check --write .",
    "install:clients": "tsx scripts/install-clients.ts",
    "lint": "biome check .",
    "test": "tsx --test test/*.test.ts"
  },
  "dependencies": {
    "yaml": "2.9.0"
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.11",
    "@types/node": "24.13.3",
    "tsx": "4.23.12",
    "typescript": "7.0.2"
  }
}
```

Configure `tsconfig.json` with `target: ES2024`, `module: NodeNext`, `moduleResolution: NodeNext`, `strict`, `noEmit`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `resolveJsonModule`, and `verbatimModuleSyntax`. Configure Biome 2.5.11 recommended lint rules, formatter, import organization, and git ignore awareness.

- [x] **1.2 Install the pinned dependency graph**

Run: `npm install`

Expected: `package-lock.json` records the exact declared versions and npm reports no install failure.

- [x] **1.3 Write and run a toolchain smoke test**

Create `test/toolchain.test.ts` using `node:test` and `node:assert/strict`. Parse `package.json` and assert ESM mode, exact Node engine, absence of an `install` lifecycle key, and presence of `install:clients`, `format`, `lint`, `typecheck`, and `check`.

Run: `npx tsx --test test/toolchain.test.ts`

Expected: PASS, proving `tsx --test` discovers TypeScript tests.

- [x] **1.4 Run initial static checks**

Run: `npm run format && npm run lint && npm run typecheck`

Expected: PASS with no warnings. Inspect `git diff -- package.json package-lock.json tsconfig.json biome.json test/toolchain.test.ts` and repair unexpected Biome changes before continuing.

### Task 2: Parse Skill and Agent Frontmatter

**Files:**

- Create: `src/lib/frontmatter.ts`
- Create: `test/frontmatter.test.ts`

**Interfaces:**

```typescript
export interface ParsedDocument {
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly body: string;
}

export function parseFrontmatter(source: string, sourceName: string): ParsedDocument;
export function renderFrontmatter(attributes: Readonly<Record<string, unknown>>): string;
```

- [x] **2.1 RED: Specify strict frontmatter behavior**

Write tests for valid YAML, no frontmatter, missing closing delimiter, duplicate YAML keys, non-object YAML, deterministic key order, and preservation of body content. Include a case proving `---` inside the body is not treated as a delimiter.

Run: `npx tsx --test test/frontmatter.test.ts`

Expected: FAIL because `src/lib/frontmatter.ts` does not exist.

- [x] **2.2 GREEN: Implement minimal structured parsing**

Use `yaml.parseDocument` with unique-key errors enabled. Require a leading delimiter at byte zero when frontmatter exists, locate exactly the first closing delimiter line, require an object mapping, and include `sourceName` in every error. Render with a fixed caller-provided insertion order and one closing delimiter.

Run: `npx tsx --test test/frontmatter.test.ts`

Expected: PASS.

- [x] **2.3 REFACTOR: Format and type-check the slice**

Run: `npm run format && npm run lint && npm run typecheck && npx tsx --test test/frontmatter.test.ts`

Expected: PASS.

### Task 3: Extract Exact Markdown Sections

**Files:**

- Create: `src/lib/markdown-sections.ts`
- Create: `test/markdown-sections.test.ts`

**Interfaces:**

```typescript
export interface MarkdownSection {
  readonly heading: string;
  readonly level: number;
  readonly content: string;
  readonly startLine: number;
  readonly endLine: number;
}

export function listSections(markdown: string): readonly MarkdownSection[];
export function requireSection(markdown: string, heading: string, sourceName: string): MarkdownSection;
export function assertUniqueHeadings(sections: readonly MarkdownSection[], sourceName: string): void;
```

- [x] **3.1 RED: Specify heading boundaries**

Test ATX headings from levels 1-6, nested headings, duplicate exact headings, missing headings, closing boundaries at equal or higher level, headings inside backtick and tilde fences, fence markers with language suffixes, and indented lines that resemble headings.

Run: `npx tsx --test test/markdown-sections.test.ts`

Expected: FAIL because the module is absent.

- [x] **3.2 GREEN: Implement a line-state parser**

Track the active backtick or tilde fence and ignore headings until a compatible closing fence. Recognize only unindented ATX headings. Preserve exact section bytes from the heading through the line before the next equal-or-higher heading. Throw for missing and duplicate requested headings.

Run: `npx tsx --test test/markdown-sections.test.ts`

Expected: PASS.

- [x] **3.3 REFACTOR: Run focused static checks**

Run: `npm run format && npm run lint && npm run typecheck && npx tsx --test test/markdown-sections.test.ts`

Expected: PASS.

### Task 4: Validate Manifests and Exact Transformations

**Files:**

- Create: `src/lib/transforms.ts`
- Create: `src/lib/manifests.ts`
- Create: `test/transforms.test.ts`
- Create: `test/manifests.test.ts`
- Create: `test/fixtures/manifest/`

**Interfaces:**

```typescript
export type SectionOwner = "core" | "official" | "skill";

export interface ExactTransform {
  readonly id: string;
  readonly operation: "remove" | "replace";
  readonly search: string;
  readonly replacement?: string;
  readonly expectedCount: number;
}

export interface SourceSelection {
  readonly source: string;
  readonly owner: SectionOwner;
  readonly headings: readonly string[];
  readonly transforms?: string;
}

export interface SkillManifest {
  readonly name: string;
  readonly description: string;
  readonly output: string;
  readonly selections: readonly SourceSelection[];
  readonly sectionOwnership: Readonly<Record<string, SectionOwner>>;
  readonly requiredPhrases: readonly string[];
  readonly forbiddenPhrases: readonly string[];
}

export function applyExactTransforms(source: string, transforms: readonly ExactTransform[]): string;
export function parseSkillManifest(value: unknown, manifestPath: string, repoRoot: string): SkillManifest;
export function loadTransforms(value: unknown, sourceName: string): readonly ExactTransform[];
```

- [x] **4.1 RED: Specify literal transformation behavior**

Test ordered literal remove and replace operations, overlapping search strings, an expected count of zero, a mismatched count, duplicate transform IDs, missing replacement for `replace`, and forbidden replacement on `remove`.

Run: `npx tsx --test test/transforms.test.ts`

Expected: FAIL because the transform module is absent.

- [x] **4.2 GREEN: Implement exact-count transformations**

Count non-overlapping literal occurrences before each operation. Throw an error naming the transform ID and expected/found counts before mutating when the count differs. Apply operations in array order. Do not accept regex patterns, glob patterns, callbacks, or implicit whitespace normalization.

Run: `npx tsx --test test/transforms.test.ts`

Expected: PASS.

- [x] **4.3 RED: Specify manifest confinement and ownership**

Test unknown keys, wrong primitive types, invalid skill names, descriptions not beginning with `Use when`, output outside `.agents/skills/<name>/SKILL.md`, source paths outside the repository, missing paths, empty selections, duplicate heading selections, duplicate ownership, ownership values that disagree with a selection, and transform paths on non-official selections.

Run: `npx tsx --test test/manifests.test.ts`

Expected: FAIL because the manifest module is absent.

- [x] **4.4 GREEN: Implement a closed runtime schema**

Parse JSON as `unknown`, validate every object against an explicit allowed-key set, and construct immutable typed values only after all checks pass. Resolve each path against `repoRoot` and require it to remain inside the repository. Require the output folder and `name` to match exactly.

Run: `npx tsx --test test/manifests.test.ts`

Expected: PASS.

- [x] **4.5 REFACTOR: Run all foundation primitives**

Run: `npm run format && npm run lint && npm run typecheck && npx tsx --test test/transforms.test.ts test/manifests.test.ts`

Expected: PASS.

### Task 5: Render Skills Deterministically

**Files:**

- Create: `src/lib/render-skill.ts`
- Create: `test/render-skill.test.ts`

**Interfaces:**

```typescript
export interface OwnedSection {
  readonly owner: SectionOwner;
  readonly heading: string;
  readonly content: string;
  readonly sourceName: string;
}

export interface RenderedSkill {
  readonly path: string;
  readonly content: string;
}

export function renderSkill(manifest: SkillManifest, sections: readonly OwnedSection[]): RenderedSkill;
```

- [x] **5.1 RED: Specify composition invariants**

Test manifest order, one H1 title, duplicate headings, missing ownership entries, owner mismatches, required/forbidden phrase checks, frontmatter containing only `name` and `description`, descriptions over 1,024 characters, deterministic repeated rendering, and absence of maintenance notices.

Run: `npx tsx --test test/render-skill.test.ts`

Expected: FAIL because the renderer is absent.

- [x] **5.2 GREEN: Implement pure rendering**

Render frontmatter from manifest fields, add `# Executable Planning`, then append selected sections in manifest order. Validate all sections and semantic assertions before returning content. Add exactly the spacing required by the expected fixture; do not invoke Biome or inspect the filesystem.

Run: `npx tsx --test test/render-skill.test.ts`

Expected: PASS.

- [x] **5.3 REFACTOR: Run focused checks**

Run: `npm run format && npm run lint && npm run typecheck && npx tsx --test test/render-skill.test.ts`

Expected: PASS.

### Task 6: Orchestrate Atomic Builds, Drift, and Customization Lint

**Files:**

- Create: `src/build-skills.ts`
- Create: `src/check-customizations.ts`
- Create: `test/build-skills.test.ts`
- Create: `test/check-customizations.test.ts`
- Create: `test/fixtures/repository/`

**Interfaces:**

```typescript
export interface BuildOptions {
  readonly repoRoot: string;
  readonly mode: "check" | "write";
}

export interface BuildArtifact {
  readonly path: string;
  readonly content: string;
  readonly changed: boolean;
}

export async function buildSkills(options: BuildOptions): Promise<readonly BuildArtifact[]>;
export async function checkCustomizations(repoRoot: string): Promise<void>;
```

- [x] **6.1 RED: Specify all-before-write behavior**

Build fixture repositories that cover lexical manifest discovery, two valid skills, invalid second skill, missing output in check mode, changed output in check mode, exact output in check mode, and idempotent write mode. Assert no output is written when any manifest fails.

Run: `npx tsx --test test/build-skills.test.ts`

Expected: FAIL because orchestration is absent.

- [x] **6.2 GREEN: Implement in-memory validation before writes**

Discover only `sources/*/skill.json`, sort paths lexically, parse all inputs, extract required sections, transform selected official sections, and render every artifact in memory. Throw aggregated errors before any write. In write mode, create output parents and write only changed content after all artifacts pass. In check mode, report missing or changed output paths and exit nonzero.

Run: `npx tsx --test test/build-skills.test.ts`

Expected: PASS.

- [x] **6.3 RED: Specify cross-document static lint**

Test skill-folder/name mismatch, forbidden agent-only skill frontmatter, VS Code tool/session tokens in skill content, agent missing a required-skill declaration, full canonical headings duplicated in the thin agent, missing README client instructions, broken repository-relative source paths, and valid fixtures.

Run: `npx tsx --test test/check-customizations.test.ts`

Expected: FAIL because the checker is absent.

- [x] **6.4 GREEN: Implement customization checks**

Reuse frontmatter and heading modules. Validate `.github/agents/*.agent.md`, `.agents/skills/*/SKILL.md`, every source manifest, and README command/client markers. Return stable path-prefixed error messages and nonzero CLI status.

Run: `npx tsx --test test/check-customizations.test.ts`

Expected: PASS.

- [x] **6.5 Validate Phase 1**

Run: `npm run format`

Inspect: `git diff -- package.json package-lock.json tsconfig.json biome.json src test`

Run: `npm run lint && npm run typecheck && npm test`

Expected: all commands PASS with no warning or error output.

### Phase 1 Checkpoint

- [x] **P1 Confirm the static build foundation**

Update this plan with command evidence and any decisions. Present the parser, transform, renderer, and atomic-build test summary to the user. Stop and wait for explicit confirmation before Phase 2.

---

## Phase 2: Planning Knowledge Package

### Phase 2 Output

The repository contains the verified official snapshot, discrete planning sources, exact transformations, manifest assertions, and a valid committed `.agents/skills/executable-planning/SKILL.md` that combines project behavior with portable official guidance.

### Phase 2 Dependencies and Risks

- Depends on all Phase 1 APIs and checks.
- The official source path contains spaces; always quote it.
- Exact transform strings must be copied from the snapshot, not paraphrased.
- The skill description is a discovery trigger only; it must not summarize the workflow.

### Task 7: Capture and Verify the Official Copilot Plan Agent

**Files:**

- Create: `vendor/copilot/Plan.agent.md`
- Create: `vendor/copilot/README.md`
- Create: `test/vendor-snapshot.test.ts`

**Interfaces:**

- Consumes: the local source path and exact provenance values below.
- Produces: a stable official input whose structural changes fail tests.

- [x] **7.1 RED: Write snapshot provenance tests**

Test that `vendor/copilot/Plan.agent.md` exists, is 5,250 bytes, has SHA-256 `f941698683bf4fbb09c612177d27879fc242c8a55236a9127ee899acc784adfe`, parses as agent frontmatter, and contains unique `## 1. Discovery`, `## 2. Alignment`, `## 3. Design`, and `## 4. Refinement` sections.

Run: `npx tsx --test test/vendor-snapshot.test.ts`

Expected: FAIL because the snapshot is absent.

- [x] **7.2 GREEN: Copy the official source byte-for-byte**

Source path:

```text
/Users/zander/Library/Application Support/Code/User/globalStorage/github.copilot-chat/plan-agent/Plan.agent.md
```

Use a byte-preserving copy operation to create `vendor/copilot/Plan.agent.md`. Do not reconstruct or format the snapshot. Appendix A records the source content for recovery if the VS Code path is unavailable; if recovery is needed, recreate it exactly and verify the same checksum before proceeding.

Run: `shasum -a 256 vendor/copilot/Plan.agent.md && wc -c -l vendor/copilot/Plan.agent.md`

Expected: hash `f941698683bf4fbb09c612177d27879fc242c8a55236a9127ee899acc784adfe`, 5,250 bytes, 105 lines.

Run: `npx tsx --test test/vendor-snapshot.test.ts`

Expected: PASS.

- [x] **7.3 Add provenance and update procedure**

Create `vendor/copilot/README.md` recording the source, capture date `2026-08-28`, unavailable upstream version, checksum, byte/line counts, and update sequence: replace snapshot, update exact transforms if required, run build, inspect diff, format, and run check.

Run: `npm run format && npm run lint && npx tsx --test test/vendor-snapshot.test.ts`

Expected: PASS; the snapshot checksum remains unchanged after formatting because Biome must exclude `vendor/**` from writes.

### Task 8: Define Discrete Planning Sources and Build the Skill

**Files:**

- Create: `sources/executable-planning/core.md`
- Create: `sources/executable-planning/skill-only.md`
- Create: `sources/executable-planning/skill.json`
- Create: `sources/executable-planning/transforms.json`
- Create: `.agents/skills/executable-planning/SKILL.md`
- Create: `test/executable-planning-skill.test.ts`
- Create: `test/fixtures/behavioral-scenarios.json`

**Interfaces:**

- Consumes: the current custom-agent sections, the four selected official sections, and Phase 1 build APIs.
- Produces: one valid Agent Skills package and pressure scenarios for behavioral review.

- [x] **8.1 RED: Specify the real skill's static contract**

Write integration tests asserting:

```typescript
const requiredPhrases = [
  "local plan",
  "autopilot",
  "domain-based",
  "tangible output",
  "awaiting-user",
  "Discovery",
  "Alignment",
  "Design",
  "Refinement",
];

const forbiddenPhrases = [
  "#tool:vscode",
  "/memories/session/",
  "handoff buttons",
  "target: vscode",
  "tools:",
  "agents:",
];
```

Also assert the exact H2 order: the eight project sections, four official workflow sections, then skill-only sections. Assert every heading has one owner, frontmatter contains only `name` and `description`, and the description begins with `Use when`.

Run: `npx tsx --test test/executable-planning-skill.test.ts`

Expected: FAIL because sources and output are absent.

- [x] **8.2 Create the project-owned core without changing behavior**

Copy these complete sections from `.github/agents/executable-planner.agent.md` into `sources/executable-planning/core.md`: Operating Contract, Clarify First, Canonical Plan Artifact, Plan Design, Delegate Step Design, Checkpoints and User Interest, Required Plan Format, and Quality Check Before Delivery. Exclude custom-agent frontmatter, opening role text, and harness-specific tool policy.

Do not paraphrase this migration. During this step, run a one-time section comparison against the current agent and record the result in this plan. Permanent tests assert the core heading set and required planning phrases; they must not depend on the adapter body after Phase 3 thins it.

- [x] **8.3 Create skill-only content with exclusive ownership**

Add only `## When to Use` and `## Harness Adaptation`. Use this exact discovery description in the manifest:

```text
Use when creating or maintaining a multi-step implementation plan that must remain executable across agents, sessions, IDEs, or unattended harnesses.
```

`When to Use` describes triggers and non-use cases. `Harness Adaptation` maps generic read/write/question/subagent behavior without naming VS Code tools. Keep behavioral pressure cases exclusively under `test/fixtures/`; do not include test-maintenance content in the client-facing skill.

- [x] **8.4 Declare exact official transformations**

In `transforms.json`, use only literal remove/replace operations. Copy each `search` value exactly from the snapshot and require `expectedCount: 1` for these selected-section changes:

1. Replace the Alignment bullet containing `#tool:vscode/askQuestions` with generic focused-question wording.
2. Replace the Design paragraph that saves to `/memories/session/plan.md` via `#tool:vscode/memory` with the canonical-artifact rule.
3. Replace the Refinement "Changes requested" bullet that references `/memories/session/plan.md` with a generic canonical-plan update.
4. Replace the Refinement approval/handoff bullet with an explicit approval record and stop before implementation.
5. Replace the plan-style blocking-question bullet containing `#tool:vscode/askQuestions` with a tool-neutral alignment rule.
6. Remove the conditional phase bullet beginning `For plans with many steps` because project core owns the unconditional domain-phase rule.
7. Remove the `NO code blocks` plan-style bullet because project core owns the plan schema.

Do not transform frontmatter: the build strips it structurally before section selection. Do not add broad token replacement rules.

- [x] **8.5 Declare the manifest and ownership map**

Create `skill.json` using the Phase 1 `SkillManifest` shape. Select core headings first, official headings second, and skill-only headings last. Map each exact heading to its source owner. Include all integration-test required and forbidden phrases. Use output `.agents/skills/executable-planning/SKILL.md`.

- [x] **8.6 GREEN: Build and verify the real skill**

Run: `npm run build`

Expected: creates the skill only after all inputs and transforms validate.

Run: `npx tsx --test test/executable-planning-skill.test.ts && npm run check:drift`

Expected: PASS.

- [x] **8.7 Add behavioral pressure fixtures**

Create JSON cases for: pressure to skip planning; a request for a flat checklist; attempted implementation during planning; contradictory autopilot instructions; an awaiting-user issue; and a deferred issue. Each case contains `prompt`, `requiredBehaviors`, and `forbiddenBehaviors`. Validate fixture shape and that every project-owned rule has at least one case.

Where the harness can isolate skill loading, run one baseline case without the skill and one with it, then record observations in this plan. If isolation is unavailable, record that behavioral execution remains unverified; do not weaken the static checks or claim behavioral success.

- [x] **8.8 Validate Phase 2**

Run: `npm run format`

Inspect: `git diff -- sources vendor .agents test .github/agents/executable-planner.agent.md`

Confirm `vendor/copilot/Plan.agent.md` still has the required checksum.

Run: `npm run lint && npm run typecheck && npm test && npm run check:drift`

Do not run the repository-wide customization checker yet. Its thin-agent and README invariants become satisfiable in Phase 3.

Run: `npm run build && npm run check:drift`

Expected: all checks PASS and the second build produces no diff.

### Phase 2 Checkpoint

- [x] **P2 Confirm the planning knowledge package**

Update this plan with checksum, section, transform, build, and drift evidence. Present the built skill's section outline and any behavioral-test limitation to the user. Stop and wait for explicit confirmation before Phase 3.

---

## Phase 3: Client Integration and Maintainability

### Phase 3 Output

The Copilot custom agent is a thin consumer of the skill, supported clients can be installed safely through static symlink mappings, README instructions cover any required discovery/reload steps, and the complete repository passes Biome, TypeScript, tests, customization lint, drift, and installer integration checks.

### Phase 3 Dependencies and Risks

- Depends on the real Phase 2 skill path.
- Absolute symlinks become stale if the repository moves; README must instruct agents to remove the old link and rerun installation.
- Windows may require Developer Mode or elevated symlink permission. Report `EPERM` clearly; do not add junction fallback unless requested.
- The real-home installation is a separate user-confirmed action after tests.

### Task 9: Thin the Copilot Agent Around Required Skills

**Files:**

- Modify: `.github/agents/executable-planner.agent.md`
- Modify: `test/check-customizations.test.ts`

**Interfaces:**

- Consumes: installed `executable-planning` skill and future named skills.
- Produces: unchanged agent frontmatter plus a concise planning-only adapter body.

- [x] **9.1 RED: Require the thin-agent contract**

Extend tests to require unchanged frontmatter values, `**REQUIRED SKILL:** Use executable-planning`, planning-only behavior, loading additional required skills, and explicit failure when the required skill cannot load. Forbid duplicated headings from `core.md` in the agent body.

Run: `npx tsx --test test/check-customizations.test.ts`

Expected: FAIL because the current body duplicates canonical behavior.

- [x] **9.2 GREEN: Replace only the agent body**

Preserve existing frontmatter exactly. Replace the body with concise instructions that:

```markdown
You create implementation plans for IDE and autonomous harness execution. Planning is your sole responsibility; do not implement project work.

**REQUIRED SKILL:** Use executable-planning for all planning behavior.

Load every additional skill named by this agent before planning. If a required skill cannot be loaded, report that failure and stop rather than reconstructing its workflow from memory.

Use the available read, search, question, persistence, and subagent tools to carry out the loaded skills. Keep harness-specific tool choices in this adapter; keep planning behavior in the skill.
```

Run: `npx tsx --test test/check-customizations.test.ts && npm run check:customizations`

Expected: PASS.

- [x] **9.3 Rebuild to prove adapter independence**

Run: `npm run build && npm run check:drift`

Expected: PASS with no skill diff, proving the skill no longer derives from the thin adapter.

### Task 10: Install Client Links Safely

**Files:**

- Create: `scripts/install-clients.ts`
- Create: `test/install-clients.test.ts`

**Interfaces:**

```typescript
export type ClientName = "copilot" | "claude" | "agents";

export interface ClientLink {
  readonly client: ClientName;
  readonly source: string;
  readonly destination: string;
  readonly kind: "file" | "directory";
}

export interface InstallOptions {
  readonly clients: readonly ClientName[];
  readonly repoRoot: string;
  readonly homeDirectory: string;
}

export interface InstallResult {
  readonly created: readonly string[];
  readonly existing: readonly string[];
}

export const CLIENT_LINKS: readonly ClientLink[];
export async function installClients(options: InstallOptions): Promise<InstallResult>;
export function parseClientArguments(arguments_: readonly string[]): readonly ClientName[];
```

- [x] **10.1 RED: Specify argument and mapping behavior**

Test default/all expansion, each single client, duplicate arguments, unknown clients, repeated `--client`, missing values, and these exact static mappings:

```text
copilot  .github/agents/executable-planner.agent.md  ~/.copilot/agents/executable-planner.agent.md
copilot  .agents/skills/executable-planning         ~/.copilot/skills/executable-planning
claude   .agents/skills/executable-planning         ~/.claude/skills/executable-planning
agents   .agents/skills/executable-planning         ~/.agents/skills/executable-planning
```

Run: `npx tsx --test test/install-clients.test.ts`

Expected: FAIL because the installer is absent.

- [x] **10.2 GREEN: Implement pure argument parsing and static mappings**

Accept `--client all|copilot|claude|agents`, default to all, deduplicate while preserving the mapping order, and reject all other arguments with usage text. Resolve source and destination paths from injected roots; do not read environment variables in exported core functions.

Run: `npx tsx --test test/install-clients.test.ts`

Expected: argument/mapping tests PASS; filesystem tests remain pending.

- [x] **10.3 RED: Specify collision-safe filesystem behavior**

Using `mkdtemp`, test missing parent creation, absolute file and directory links, paths containing spaces, a second identical run, a regular-file destination, directory destination, unrelated relative symlink, unrelated absolute symlink, missing source, and partial-batch safety.

The batch must validate every source and destination before creating any link. A conflict in one destination leaves all destinations unchanged.

Run: `npx tsx --test test/install-clients.test.ts`

Expected: FAIL on unimplemented filesystem behavior.

- [x] **10.4 GREEN: Implement all-before-write installation**

Use `lstat`, `readlink`, `realpath`-equivalent normalization, `mkdir({ recursive: true })`, and `symlink` with explicit file/directory type. Treat an existing link resolving to the exact source as success. Aggregate validation errors and throw before creating parents or links. On Windows `EPERM`, report that Developer Mode or symlink permission is required.

Run: `npx tsx --test test/install-clients.test.ts`

Expected: PASS without touching the real home directory.

- [x] **10.5 Verify CLI behavior against a temporary home**

Run the CLI with an injected test-home mechanism documented only for tests, for example `EXECUTABLE_PLANNING_HOME=$(mktemp -d) npm run install:clients -- --client all`. Inspect all four links with `readlink`, rerun the command, and verify it reports them as existing.

Expected: both runs succeed; no path under the real `$HOME` changes.

### Task 11: Document Client Discovery and Future Skills

**Files:**

- Create: `README.md`
- Create: `test/documentation.test.ts`

**Interfaces:**

- Consumes: package commands and exact client mappings.
- Produces: statically verifiable instructions sufficient for agents to maintain and install the artifacts.

- [x] **11.1 RED: Specify required documentation markers**

Test that README contains prerequisites, `npm install`, `npm run format`, `npm run check`, `npm run build`, all four `install:clients` selectors, every source and destination path, client reload/discovery/use instructions, repository-move recovery, collision behavior, official snapshot update, and steps to add another manifest-driven skill without changing `src/build-skills.ts`.

Run: `npx tsx --test test/documentation.test.ts`

Expected: FAIL because README is absent.

- [x] **11.2 GREEN: Write concise agent-facing instructions**

Document:

- Copilot/VS Code: install `copilot`, reload the window or begin a new chat if discovery is cached, select `Executable Planner`, and verify the required skill can load.
- Claude Code: install `claude`, restart its session if skill discovery is cached, and invoke or allow discovery of `executable-planning`; the Copilot `.agent.md` is not a Claude agent.
- Cross-client consumers: install `agents` and confirm the client supports the Agent Skills directory convention.
- Build maintenance: modify discrete source sections/transforms/manifests, run build, run Biome, inspect the diff, and run check.
- Future skills: add `sources/<name>/skill.json` and owned fragments plus `.agents/skills/<name>/SKILL.md`; no entry-point change.
- Link constraints: conflicts are never overwritten; moved repositories require removing stale links and rerunning installation.

Run: `npx tsx --test test/documentation.test.ts && npm run check:customizations`

Expected: PASS.

### Task 12: Final Static and Behavioral Verification

**Files:**

- Modify: this plan's Current State, checkboxes, decisions, blockers, and Progress Log only.

- [x] **12.1 Run Biome and inspect every resulting edit**

Run: `npm run format`

Run: `git diff --check`

Inspect: `git diff -- . ':(exclude)vendor/copilot/Plan.agent.md'`

Expected: no whitespace errors, no unexplained changes, and no formatting mutation of the official snapshot.

- [x] **12.2 Run the complete static gate**

Run: `npm run check`

Expected: Biome, strict TypeScript, all tests, customization lint, and drift checks PASS with no warnings.

- [x] **12.3 Prove deterministic idempotence**

Run: `npm run build && shasum -a 256 .agents/skills/executable-planning/SKILL.md > /tmp/skill-before.sha && npm run build && shasum -a 256 .agents/skills/executable-planning/SKILL.md > /tmp/skill-after.sha && diff /tmp/skill-before.sha /tmp/skill-after.sha && npm run check:drift`

Expected: PASS and no repository diff from the second build.

- [x] **12.4 Recheck snapshot and installer isolation**

Run: `shasum -a 256 vendor/copilot/Plan.agent.md`

Expected: `f941698683bf4fbb09c612177d27879fc242c8a55236a9127ee899acc784adfe`.

Run all installer tests and inspect the real destinations with `lstat` only; do not create real-home links.

- [x] **12.5 Review behavioral pressure evidence**

Verify static coverage for every pressure fixture. Report separately whether isolated agent trials were available and passed; do not substitute static fixture validation for runtime behavioral evidence.

### Phase 3 Checkpoint

- [x] **P3 Confirm completion and decide real installation**

Update this plan with all evidence and set Status to `completed` only if every static gate passes. Present client support boundaries and ask whether to run `npm run install:clients -- --client all` against the real home. Do not run it without explicit approval.

---

## Progress Log

- 2026-08-28: Design approved after revisions for static composition, Biome, symlink installation, and stronger lint enforcement.
- 2026-08-28: Build, planning-content, and client-integration phase outlines delegated to three Explore subagents and synthesized.
- 2026-08-28: Local prerequisites verified as Node.js 24.15.0 and npm 11.12.1; current package versions recorded.
- 2026-08-28: Official Plan agent source verified at 5,250 bytes and SHA-256 `f941698683bf4fbb09c612177d27879fc242c8a55236a9127ee899acc784adfe`.
- 2026-08-28: Created isolated work tree `/Users/zander/repos/.worktrees/plans-executable-planning-skill` on unborn branch `executable-planning-skill`; baseline tree `32aa349a5ba87905391c4925eab5f762c102d9e4`, with no baseline test command yet.
- 2026-08-28: Completed plan/spec preflight. Recorded the no-commit tree-snapshot strategy and rulings for the missing `typecheck` script and Task 9 README-dependent lint timing in the SDD ledger.
- 2026-08-28: Task 1 initial implementation passed install, smoke-test, formatting, lint, type checking, and full-test checks. Review found one Important spec mismatch in the assertion-module import; fix round 1 started. The reviewer’s command-evidence questions were resolved from the persisted report, and an npm-engine assertion suggestion was deferred as Minor.
- 2026-08-28: Task 1 completed at tree `35d1836` after fix round 1 changed the test import to `node:assert/strict`; focused re-review found the issue addressed with no new breakage. Evidence: dependency install succeeded with zero vulnerabilities; toolchain smoke test 1/1 passed; formatting, lint, type checking, and full test passed.
- 2026-08-28: Task 2 completed at tree `e56a380`; frontmatter tests recorded the expected missing-module RED state, then 8/8 passed with formatting, lint, and type checking clean. Task review approved the slice; a distinct malformed-YAML syntax case was deferred as Minor.
- 2026-08-28: Task 3 initial implementation passed 7/7 focused tests plus formatting, lint, and type checking. Review found that compatible fenced blocks indented up to three spaces were not tracked; fix round 1 started with a required regression test.
- 2026-08-28: Task 3 completed at tree `bd0fc00` after a RED/GREEN regression fix for one-to-three-space-indented fences; 8/8 focused tests and static checks passed, and scoped re-review found no breakage. A four-space negative test remains a deferred Minor.
- 2026-08-28: Task 4 completed both planned TDD cycles and passed 14/14 focused tests plus formatting, lint, and type checking. Review found nested selection heading arrays were not frozen; fix round 1 started with a required immutability regression test.
- 2026-08-28: Task 4 completed at tree `08070b7` after a RED/GREEN nested-immutability fix; transforms and manifests passed 14/14 tests with formatting, lint, and type checking clean, and scoped re-review found no new breakage.
- 2026-08-28: Task 5 initial renderer passed 10/10 focused tests and static checks. Review found its H1 validation counted raw line prefixes rather than parsed Markdown headings, so fix round 1 started; exhaustive maintenance-notice phrase tests were deferred as Minor.
- 2026-08-28: Task 5 completed at tree `52067e2` after RED/GREEN fenced-H1 and additional-H1 regressions; 12/12 focused tests and static checks passed, and scoped re-review found no new breakage.
- 2026-08-28: Task 6 initial integration passed 56/56 tests plus formatting, lint, and type checking. Review found locale-dependent `localeCompare` ordering in manifest/skill/agent discovery; fix round 1 started, while duplicated diagnostic path prefixes were deferred as Minor.
- 2026-08-28: Task 6 fix round 1 replaced locale-sensitive discovery sorting with code-point comparison; focused build tests passed 6/6, customization tests passed 10/10, static checks passed, and scoped re-review found no new breakage.
- 2026-08-28: Controller Phase 1 gate passed formatting, index and working-tree whitespace checks, lint, type checking, and 58/58 tests. Editor diagnostics then found three Task 4 Markdown fixtures missing a final newline, so Task 4 fix round 2 started before the checkpoint.
- 2026-08-28: Task 4 fix round 2 restored exact fixture bytes with one trailing newline; manifest tests passed 6/6, formatting, lint, and type checking passed, diagnostics cleared, and scoped re-review approved the newline-only diff.
- 2026-08-28: Phase 1 final gate passed: `npm run format` made no changes; index and working-tree `git diff --check` passed; `npm run lint` and `npm run typecheck` passed; `npm test` passed 58/58 with no failures; editor diagnostics reported no errors.
- 2026-08-28: P1 is awaiting explicit user confirmation before Phase 2. Deferred Minors are an npm-engine smoke assertion, a distinct malformed-YAML test, a four-space fence negative test, exhaustive maintenance-notice rejection tests, and duplicate path-prefix cleanup in customization errors.
- 2026-08-29: User approved migration from the isolated work tree to `mainline`. Copied the reviewed Phase 1 implementation, tests, current plan, and ignored SDD artifacts into `/Users/zander/repos/plans`; byte comparison against the frozen source passed.
- 2026-08-29: Mainline migration gate passed: `npm install` reported no vulnerabilities; formatting and index/working-tree whitespace checks passed; lint and type checking passed; `npm test` passed 58/58. P1 again awaits explicit user sign-off before Phase 2.
- 2026-08-29: User explicitly approved P1. Advanced to Phase 2, Task 7; authorized rollback-worktree retention ended at this checkpoint.
- 2026-08-29: Task 7 completed at tree `a8f06f3`. The focused snapshot test, formatting, lint, checksum, byte/line counts, and editor diagnostics passed; task review passed spec compliance and approved code quality. Deferred a Minor to assert specific frontmatter keys beyond the required parse/nonempty check.
- 2026-08-29: Task 8 one-time section comparison passed: the eight-section block copied from `.github/agents/executable-planner.agent.md` and `sources/executable-planning/core.md` were byte-identical with SHA-256 `5d0e5b6c0e074ee761866fb331cf92ca9f666791539f8f6e15cbc7d9d2bee87a`.
- 2026-08-29: Task 8 behavioral execution remains unverified because the available harness cannot isolate controlled baseline and skill-only loading. All six required pressure scenarios retain static shape and project-rule coverage checks; no behavioral success is claimed.
- 2026-08-29: Task 8 completed at tree `c313756` after fix round 1. Review-driven fixes added explicit coverage for 40 project-owned rule IDs and separate exact-count removals for both conditional phase variants; scoped re-review approved all fixes with no new findings.
- 2026-08-29: Phase 2 gate passed: formatting and index/working-tree whitespace checks, vendor checksum, lint, type checking, 62/62 tests, drift checks, and a second idempotent build all passed. Generated artifacts and tests have no editor diagnostics; H2-first fragment warnings in `core.md` and `skill-only.md`, plus the required copied `autorun` token, are source-fragment tooling limitations. P2 awaits explicit user confirmation.
- 2026-08-29: User explicitly approved P2. Advanced to Phase 3, Task 9; two intervening test quote-style edits retained all four focused P2 behaviors and zero drift before Biome normalization.
- 2026-08-29: Task 9 completed at tree `44109f8` after fix round 1. The thin agent preserves frontmatter byte-for-byte and delegates all behavior to required skills; 12/12 focused tests, build independence, drift, lint, and typecheck passed. Review-driven enforcement now rejects canonical headings at every adapter heading level and tests exact adapter-body bytes.
- 2026-08-29: Task 10 completed at tree `2f96ed3` after fix round 1. All 19 installer tests pass, including exact mappings, argument parsing, preflight atomicity, collisions, idempotence, canonical symlink identity, broken links, and temporary-home CLI behavior. Real-home destinations remained absent; Windows `EPERM` runtime coverage remains deferred on macOS.
- 2026-08-29: Task 11 completed at tree `4c79426` after fix round 1. Documentation tests now require all four intact source-to-destination mappings, each client section gives its exact install command, and scoped re-review approved all fixes; focused docs, customization, formatting, lint, typecheck, and diagnostics passed.
- 2026-08-29: Task 12 static verification passed: Biome made no changes; staged and unstaged whitespace checks passed; `npm run check` passed 84/84 tests plus customization and drift checks; two builds produced skill SHA-256 `298c88a3688b3e35cc404212091afbac46b32f08054af2bc190f4be545e93732` with no second-build repository delta; the vendor snapshot retained pinned SHA-256 `f941698683bf4fbb09c612177d27879fc242c8a55236a9127ee899acc784adfe`; all 19 installer tests passed; and read-only before/after `lstat` checks found all four real-home destinations absent.
- 2026-08-29: All six behavioral pressure fixtures pass static shape and exact `R01`–`R40` project-rule coverage checks. Controlled baseline-versus-skill runtime trials remain unavailable because the active harness cannot isolate skill loading; no runtime behavioral success is claimed.
- 2026-08-29: Final broad review found no Critical or Important issues, passed specification compliance, approved code quality, and identified no P3 blocker. Recorded non-blocking residuals remain isolated runtime behavioral trials, Windows `EPERM` execution on macOS, and deferred minor test enhancements.
- 2026-08-29: User approved P3 and explicitly authorized `npm run install:clients -- --client all` against the real home. The installer created all four expected symlinks to this repository; a second run reported `created=0 existing=4`, confirming idempotence.

---

## Appendix A: Official Plan Agent Recovery Copy

The execution source of record is the local path in Task 7. This appendix preserves the exact text available during planning in case that source moves. Recreated content must still match the Task 7 checksum before use.

````markdown
---
name: Plan
description: Researches and outlines multi-step plans
argument-hint: Outline the goal or problem to research
target: vscode
disable-model-invocation: true
tools: ['search', 'read', 'web', 'vscode/memory', 'github/issue_read', 'github.vscode-pull-request-github/issue_fetch', 'github.vscode-pull-request-github/activePullRequest', 'execute/getTerminalOutput', 'execute/testFailure', 'vscode/askQuestions', 'agent']
agents: ['Explore']
handoffs:
  - label: Start Implementation
    agent: agent
    prompt: 'Start implementation'
    send: true
  - label: Open in Editor
    agent: agent
    prompt: '#createFile the plan as is into an untitled file (`untitled:plan-${camelCaseName}.prompt.md` without frontmatter) for further refinement.'
    send: true
    showContinueOn: false
---
You are a PLANNING AGENT, pairing with the user to create a detailed, actionable plan.

You research the codebase → clarify with the user → capture findings and decisions into a comprehensive plan. This iterative approach catches edge cases and non-obvious requirements BEFORE implementation begins.

Your SOLE responsibility is planning. NEVER start implementation.

**Current plan**: `/memories/session/plan.md` - update using #tool:vscode/memory .

<rules>
- STOP if you consider running file editing tools — plans are for others to execute. The only write tool you have is #tool:vscode/memory for persisting plans.
- Use #tool:vscode/askQuestions freely to clarify requirements — don't make large assumptions
- Present a well-researched plan with loose ends tied BEFORE implementation
</rules>

<workflow>
Cycle through these phases based on user input. This is iterative, not linear. If the user task is highly ambiguous, do only *Discovery* to outline a draft plan, then move on to alignment before fleshing out the full plan.

## 1. Discovery

Run the *Explore* subagent to gather context, analogous existing features to use as implementation templates, and potential blockers or ambiguities. When the task spans multiple independent areas (e.g., frontend + backend, different features, separate repos), launch **2-3 *Explore* subagents in parallel** — one per area — to speed up discovery.

Update the plan with your findings.

## 2. Alignment

If research reveals major ambiguities or if you need to validate assumptions:
- Use #tool:vscode/askQuestions to clarify intent with the user.
- Surface discovered technical constraints or alternative approaches
- If answers significantly change the scope, loop back to **Discovery**

## 3. Design

Once context is clear, draft a comprehensive implementation plan.

The plan should reflect:
- Structured concise enough to be scannable and detailed enough for effective execution
- Step-by-step implementation with explicit dependencies — mark which steps can run in parallel vs. which block on prior steps
- For plans with many steps, group into named phases that are each independently verifiable
- Verification steps for validating the implementation, both automated and manual
- Critical architecture to reuse or use as reference — reference specific functions, types, or patterns, not just file names
- Critical files to be modified (with full paths)
- Explicit scope boundaries — what's included and what's deliberately excluded
- Reference decisions from the discussion
- Leave no ambiguity

Save the comprehensive plan document to `/memories/session/plan.md` via #tool:vscode/memory, then show the scannable plan to the user for review. You MUST show plan to the user, as the plan file is for persistence only, not a substitute for showing it to the user.

## 4. Refinement

On user input after showing the plan:
- Changes requested → revise and present updated plan. Update `/memories/session/plan.md` to keep the documented plan in sync
- Questions asked → clarify, or use #tool:vscode/askQuestions for follow-ups
- Alternatives wanted → loop back to **Discovery** with new subagent
- Approval given → acknowledge, the user can now use handoff buttons

Keep iterating until explicit approval or handoff.
</workflow>

<plan_style_guide>
```markdown
## Plan: {Title (2-10 words)}

{TL;DR - what, why, and how (your recommended approach).}

**Steps**
1. {Implementation step-by-step — note dependency ("*depends on N*") or parallelism ("*parallel with step N*") when applicable}
2. {For plans with 5+ steps, group steps into named phases with enough detail to be independently actionable}

**Relevant files**
- `{full/path/to/file}` — {what to modify or reuse, referencing specific functions/patterns}

**Verification**
1. {Verification steps for validating the implementation (**Specific** tasks, tests, commands, MCP tools, etc; not generic statements)}

**Decisions** (if applicable)
- {Decision, assumptions, and includes/excluded scope}

**Further Considerations** (if applicable, 1-3 items)
1. {Clarifying question with recommendation. Option A / Option B / Option C}
2. {…}
```

Rules:
- NO code blocks — describe changes, link to files and specific symbols/functions
- NO blocking questions at the end — ask during workflow via #tool:vscode/askQuestions
- The plan MUST be presented to the user, don't just mention the plan file.
</plan_style_guide>
````
