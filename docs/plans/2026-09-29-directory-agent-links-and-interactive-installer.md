---
status: active
mode: interactive
canonical_location: docs/plans/2026-09-29-directory-agent-links-and-interactive-installer.md
last_updated: 2026-09-29
current_phase: Phase 3
current_step: done
next_action: none
blockers: none
---

# Directory Agent Links and Interactive Installer Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Symlink artifact directories (`.agents/skills`, `.github/agents`, `.github/hooks`) rather than individual files, and add an interactive TTY checkbox menu to the install script with multi-client duplication warnings.

**Architecture:** Add `linkMode?: "directory" | "entries"` support to catalog collections, configure `skills`, `copilot` agents, and `hooks` as directory links, update target resolution and link generation, and implement an interactive TTY selection menu in `install-artifacts.ts` that triggers when run without client flags.

**Tech Stack:** TypeScript, Node.js (`node:readline`, `node:fs/promises`), Biome, Node test runner (`node:test`).

## Global Constraints

- Preserve minimal, surgical changes to touched files.
- Zero new npm dependencies: use standard Node.js built-ins.
- Preserve existing CLI behavior when non-interactive (CI, piped stdin) or when explicit flags are passed.
- No auto-commit; leave changes uncommitted for user review.

---

### Task 1: Add `linkMode` to Catalog Schema and Validation

**Files to modify/create:**

- `src/lib/catalog.ts`
- `install-catalog.json`
- `test/catalog.test.ts`

- [x] Add `CollectionLinkMode = "entries" | "directory"` and optional `linkMode` to `ArtifactCollection` in `src/lib/catalog.ts`.
- [x] Add `"linkMode"` to `COLLECTION_KEYS` and validate `linkMode` in `parseCollection` (`"entries"` or `"directory"`).
- [x] Update `install-catalog.json` to specify `"linkMode": "directory"` on `skills`, `copilot`, and `hooks` collections.
- [x] Add tests in `test/catalog.test.ts` verifying valid parsing and rejection of invalid values.
- [x] Run `npm run check` or `npx tsx --test test/catalog.test.ts` to verify.

---

### Task 2: Support Directory Linking in Target Selection and Link Generation

**Files to modify/create:**

- `src/lib/artifact-selection.ts`
- `src/lib/install-artifacts.ts`
- `test/artifact-selection.test.ts`
- `test/install-artifacts.test.ts`
- `test/helpers/repository-artifacts.ts`
- `test/install-artifacts-cli.test.ts`

- [x] Update `InstallTarget` in `src/lib/artifact-selection.ts` to include `linkMode?: CollectionLinkMode` and `sourceDirectory?: string`.
- [x] In `resolveArtifactRequest`, set `linkMode` and `sourceDirectory` from the collection when `linkMode === "directory"`.
- [x] In `buildArtifactLinks` in `src/lib/install-artifacts.ts`, generate a single directory link (`kind: "directory"`) for targets with `linkMode === "directory"`.
- [x] Update `expectedLinkCount` in `test/helpers/repository-artifacts.ts` to count 1 link per destination for directory-linked collections.
- [x] Update assertions in `test/install-artifacts-cli.test.ts` for directory links.
- [x] Add unit tests in `test/install-artifacts.test.ts` and `test/artifact-selection.test.ts` for directory linking.
- [x] Run `npm test` to verify all tests pass.

---

### Task 3: Interactive TTY Client Selection Menu

**Files to modify/create:**

- `src/lib/interactive-menu.ts`
- `scripts/install-artifacts.ts`
- `test/interactive-menu.test.ts`

- [x] Create `src/lib/interactive-menu.ts` with `renderMenu`, `promptClientSelection`, warning when >1 client selected, and keypress navigation/toggling.
- [x] Wire `scripts/install-artifacts.ts` to prompt via `promptClientSelection` when run in an interactive TTY without client or destination flags.
- [x] Add unit tests in `test/interactive-menu.test.ts` covering rendering, toggle state, warning message condition, and default Copilot selection.
- [x] Run `npm test` and `npm run check` to verify lint, formatting, typecheck, and tests pass.
