---
status: completed
mode: interactive
canonical_location: docs/plans/archive/2026-09-29-Expand-Read-File-Restrictions-and-Work.md
last_updated: 2026-09-30
current_phase: completed
current_step: complete
next_action: none
blockers: none
---

# Expand Read-File Restrictions and Workspace Inspection for Pre-Tool Safety Hook

## Plan Metadata

- Status: in-progress
- Mode: interactive
- Delegation: single agent (sequential verification across hook logic, test suites, and instructions)
- Storage: repo-backed
- Canonical location: docs/plans/2026-09-29-Expand-Read-File-Restrictions-and-Work.md
- Last updated: 2026-09-29
- Goal: Implement path boundary inspection in the pre-tool safety hook allowing unrestricted read access to files under approved agent/skill roots (e.g. `~/.copilot`, `~/.agents`, `~/.claude`), allowing directory listing (`list_dir`), and implementing symlink-aware dual-resolution workspace inspection (Approach 1) so that requests for files/directories through workspace symlinks or symlinked workspace roots (like `~/.copilot/repos` linked to `~/repos/work`) are recognized as within workspace bounds.
- Success criteria:
  - Path boundary inspection subsystem implemented in [.github/hooks/deny-non-read-git.js](.github/hooks/deny-non-read-git.js).
  - `READ_ONLY_PATH_TOOLS` includes `read_file`, `list_dir`, `view_image`, `read_notebook_cell_output`, and `copilot_getNotebookSummary`.
  - `isApprovedExternalReadPath` permits any file or directory under approved agent/skill roots (`~/.copilot`, `~/.agents`, `~/.claude`, `~/.memory`, VS Code extensions, application support storage).
  - Symlink-aware workspace inspection: `isExternalPath` implements dual-resolution checking (canonical containment `isWithin(canonicalPath(cwd), canonicalPath(path))` OR lexical containment `isWithin(resolve(cwd), resolve(path))`), recognizing both symlinked workspace roots and in-workspace symlinks as internal.
  - Dual-engine hook parity between [.github/hooks/deny-non-read-git.js](.github/hooks/deny-non-read-git.js) and [.agents/hooks/deny-non-read-git.js](.agents/hooks/deny-non-read-git.js) preserved.
  - [test/deny-non-read-git.test.ts](test/deny-non-read-git.test.ts) passes all tests, including symlink resolution, workspace path inspection, and positive read/listing cases for approved roots.
  - [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), and [.github/copilot-instructions.md](.github/copilot-instructions.md) updated with aligned workspace boundary guidance.
  - Full repo validation via `npm run check` passes cleanly.
- Constraints and assumptions:
  - Mutating operations, external writes, and arbitrary unapproved external file access (e.g. `/var/log`, root `/memories`) remain blocked with confirmation (`ask`).
  - Git mutation safety invariants remain strictly intact.
  - Repo-backed storage is required under `docs/plans/`.

## Current State

- Current phase: Phase 3: Agent Guidelines and Documentation Consistency
- Current step: complete
- Next action: Move completed plan to archive and provide final handoff
- Blockers: none

## Execution Protocol

Any agent executing this plan follows these rules.

1. Read Current State first and perform exactly the Next action.
2. Status markers: `[ ]` pending, `[-]` in progress, `[x]` complete, `[!]` blocked, `[?]` awaiting user.
3. Elaborate a phase's steps only when it starts. Interactive: only after the user asks to start it; confirm the steps with the user before executing.
4. Phase boundaries are revisable: split, merge, reorder, or rename phases when evidence changes the design, and record the decision and rationale.
5. Mark a step `[x]` only after running its Check; record the command and outcome on the step. Interactive: when completing a step while the plan is not yet complete, prompt the user to perform any actions ready for manual testing, or state "No checkpoint tests yet." if there is nothing yet to test.
6. Update this file after every durable state transition, before continuing. Record each fact once in its owning section; don't rewrite the file.
7. If a step's premise is false or it needs changes outside its scope, mark it `[!]`, log the evidence, and ask the user. Don't improvise around it.
8. Phase gate: run the phase's full Validation, not a subset. Interactive: stop, report evidence, and ask whether to continue, revise, or pause. If code changed and is viable, include a suggested one-line commit message in a `text` code block; if it changed but isn't viable, say the message is deferred; if no code changed, omit it.
9. Git is read-only: status, diff, log, show, and branch listing only. Never stage, commit, branch, or push.
10. When a phase completes, collapse each step to a one-line result that retains its Check and outcome as the sole evidence record. Keep Validation prescriptive; remove commands and outcomes from completed-phase Progress Log entries; verify each evidence pair appears only on its owning step.
11. When every phase passes, run final validation and set Status to completed.

## Decisions

- Allow all files under approved agent/skill roots: Instead of restricting external reads strictly to files named `SKILL.md`, permit read access to any file or directory under `~/.copilot`, `~/.agents`, `~/.claude`, `~/.memory`, VS Code extension roots, and application support storage; 2026-09-28.
- Add `list_dir` to `READ_ONLY_PATH_TOOLS`: Permitting directory listing enables agents to discover skills, agents, prompts, and workspace contents without triggering permission prompts; 2026-09-28.
- Maintain dual-engine hook mirroring: Keep [.github/hooks/](.github/hooks/) and [.agents/hooks/](.agents/hooks/) identical to ensure parity across Copilot and Agent CLI runtimes; 2026-09-28.
- Symlink-aware dual-resolution workspace inspection (Approach 1): A path is considered internal to the workspace if either its canonical destination resides within the canonical workspace root (`isWithin(canonicalPath(cwd), canonicalPath(path))`) OR its unresolved lexical path resides within the workspace root (`isWithin(resolve(cwd), resolve(path))`). This supports both symlinked workspace roots (such as `~/.copilot/repos` linked to `~/repos/work`) and symlinks situated inside the workspace without requiring path allowlists; 2026-09-29.

## Deferred Items

- none

## Phase 1: Pre-Tool Safety Hook Path & Symlink Inspection Implementation

### Tangible output

Fully implemented path boundary inspection in [.github/hooks/deny-non-read-git.js](.github/hooks/deny-non-read-git.js), [.github/hooks/deny-non-read-git.mts](.github/hooks/deny-non-read-git.mts), and mirrored [.agents/hooks/](.agents/hooks/) allowing `list_dir`, unrestricted read-only access under approved agent/skill roots, and symlink-aware dual-resolution workspace path inspection.

### Completion criteria

- Path utilities (`expandPath`, `canonicalPath`, `isWithin`) and tool classification constants (`PATH_FIELDS`, `READ_ONLY_PATH_TOOLS`, `READ_ONLY_EXTERNAL_COMMANDS`) defined.
- `READ_ONLY_PATH_TOOLS` includes `read_file`, `list_dir`, `view_image`, `read_notebook_cell_output`, and `copilot_getNotebookSummary`.
- `isApprovedExternalReadPath` returns `true` for all files and subdirectories under approved skill and agent roots (`~/.copilot`, `~/.agents`, `~/.claude`, `~/.memory`, VS Code extension directories, application support storage).
- `isExternalPath` checks both canonical containment and lexical containment, allowing both symlinked workspace roots and in-workspace symlinks to be treated as internal.
- `checkToolInputPaths` and `checkCommandPaths` evaluate path arguments and are wired into `evaluateToolUse`.
- [.agents/hooks/](.agents/hooks/) files match [.github/hooks/](.github/hooks/).

### Context

- Key files:
  - [.github/hooks/deny-non-read-git.js](.github/hooks/deny-non-read-git.js)
  - [.github/hooks/deny-non-read-git.mts](.github/hooks/deny-non-read-git.mts)
  - [.github/hooks/deny-non-read-git.d.ts](.github/hooks/deny-non-read-git.d.ts)
  - [.agents/hooks/deny-non-read-git.js](.agents/hooks/deny-non-read-git.js)
  - [.agents/hooks/deny-non-read-git.mts](.agents/hooks/deny-non-read-git.mts)
  - [.agents/hooks/deny-non-read-git.d.ts](.agents/hooks/deny-non-read-git.d.ts)
- Conventions: `canonicalPath` uses `realpathSync.native()` with fallback, and `isWithin` handles relative prefix matching.

### Dependencies and risks

- Risk: Broadening external read paths must not inadvertently allow writing tools (`mcp_github_mcp_se_push_files`, terminal commands with write redirects, etc.) or access to arbitrary sensitive host directories (`/var/log`, `/etc`, etc.).
- Mitigation: Scope expansion strictly to `READ_ONLY_PATH_TOOLS` and verified approved agent/skill roots and workspace containment.

### Steps

- [x] P1.S1: Define path normalization utilities and tool classification constants; check: `grep -q '"list_dir"' .github/hooks/deny-non-read-git.js` (passed).
- [x] P1.S2: Implement `isApprovedExternalReadPath` for approved roots; check: `npx tsx -e 'import { isApprovedExternalReadPath } from "./.github/hooks/deny-non-read-git.js"; if (!isApprovedExternalReadPath(process.env.HOME + "/.copilot/agents/test.agent.md")) process.exit(1);'` (passed).
- [x] P1.S3: Implement symlink-aware dual-resolution workspace checking and checkToolInputPaths; check: `npx tsx -e 'import { evaluateToolUse } from "./.github/hooks/deny-non-read-git.js"; const r = evaluateToolUse("list_dir", { path: process.cwd() }); if (r.decision !== "allow") process.exit(1);'` (passed).
- [x] P1.S4: Synchronize changes to `.agents/hooks/`; check: `diff -u .github/hooks/deny-non-read-git.js .agents/hooks/deny-non-read-git.js` (passed).

### Validation

- `npx tsx -e 'import { evaluateToolUse } from "./.github/hooks/deny-non-read-git.js"; const r1 = evaluateToolUse("list_dir", { path: process.cwd() }); const r2 = evaluateToolUse("read_file", { filePath: process.env.HOME + "/.copilot/agents/foo.agent.md" }); if (r1.decision !== "allow" || r2.decision !== "allow") process.exit(1);'` passes with exit code 0.

### Checkpoint

- Interactive checkpoint: verify tool execution outputs and confirm readiness to proceed to Phase 2.

## Phase 2: Hook Safety Tests & Verification

### Tangible output

Updated test suite in [test/deny-non-read-git.test.ts](test/deny-non-read-git.test.ts) covering `list_dir`, non-`SKILL.md` reads in approved roots, workspace paths, symlink-aware alias and in-workspace symlink resolution, and negative security boundaries.

### Completion criteria

- Tests verify `list_dir` on workspace and approved external roots returns `allow`.
- Tests verify `read_file` on non-`SKILL.md` files (e.g. `~/.agents/skills/ctx/notes.txt`, `~/.copilot/agents/foo.agent.md`) returns `allow`.
- Tests verify symlink-aware workspace resolution (canonical workspace root symlinks and in-workspace symlinks pointing outward) returns `allow`.
- Tests verify unapproved external paths (e.g. `/var/log/system.log`, root `/memories`) still return `ask`.
- `npx tsx --test test/deny-non-read-git.test.ts` passes with 0 failures.

### Context

- Key files:
  - [test/deny-non-read-git.test.ts](test/deny-non-read-git.test.ts)
- Existing tests currently assert non-command tools (e.g. `read_file`) return `allow` unconditionally; new test suites must introduce path inspection and approval boundary verification.

### Dependencies and risks

- Risk: Over-broad test adjustments masking regressions in path boundary enforcement.
- Mitigation: Retain strict negative test cases for arbitrary host paths (`/var/log/...`, `/etc/...`) and external write operations.

### Steps

- [x] P2.S1: Add test cases in `test/deny-non-read-git.test.ts` verifying `list_dir` on workspace paths and approved external roots returns `allow`, while unapproved external paths return `ask`; check: `npx tsx --test --test-name-pattern="list_dir" test/deny-non-read-git.test.ts` (passed).
- [x] P2.S2: Add test cases in `test/deny-non-read-git.test.ts` verifying `read_file` on approved roots (`~/.copilot`, `~/.agents`, `~/.claude`, `~/.memory`, VS Code extensions) returns `allow`, and arbitrary external paths return `ask`; check: `npx tsx --test --test-name-pattern="approved roots" test/deny-non-read-git.test.ts` (passed).
- [x] P2.S3: Add test cases in `test/deny-non-read-git.test.ts` verifying symlink-aware dual-resolution workspace inspection for aliases and in-workspace symlinks; check: `npx tsx --test --test-name-pattern="symlink" test/deny-non-read-git.test.ts` (passed).
- [x] P2.S4: Run the full `test/deny-non-read-git.test.ts` test suite; check: `npx tsx --test test/deny-non-read-git.test.ts` (passed, 18/18 tests pass).

### Validation

- `npx tsx --test test/deny-non-read-git.test.ts` exits with code 0 and all test suites pass.

### Checkpoint

- Interactive checkpoint: present test results and confirm readiness to proceed to Phase 3.

## Phase 3: Agent Guidelines and Documentation Consistency

### Tangible output

Updated instruction files ([AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), [.github/copilot-instructions.md](.github/copilot-instructions.md)) and verified documentation tests in [test/documentation.test.ts](test/documentation.test.ts) aligning guidance with the relaxed read and listing policies.

### Completion criteria

- [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), and [.github/copilot-instructions.md](.github/copilot-instructions.md) explicitly permit reading any file and listing directories under approved agent/skill roots and within the active workspace.
- [test/documentation.test.ts](test/documentation.test.ts) passes.
- `npm run check` (formatting, linting, typechecks, tests, customization check, drift check) passes with 0 errors.

### Context

- Key files:
  - [AGENTS.md](AGENTS.md)
  - [CLAUDE.md](CLAUDE.md)
  - [.github/copilot-instructions.md](.github/copilot-instructions.md)
  - [test/documentation.test.ts](test/documentation.test.ts)
- Conventions: `AGENTS.md` and `CLAUDE.md` share identical workspace boundary definitions.

### Dependencies and risks

- Risk: Discrepancy between documentation guidance and actual hook behavior.
- Mitigation: Verify updated instruction phrasing against test cases and hook implementation.

### Steps

- [x] P3.S1: Update `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` to explicitly permit reading any file and listing directories (`list_dir`) under approved agent/skill roots and within the active workspace; check: `node --input-type=module -e 'import { readFile } from "fs/promises"; for (const f of ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"]) { const c = await readFile(f, "utf8"); if (!c.includes("list_dir") || !c.includes("approved")) process.exit(1); }'` (passed).
- [x] P3.S2: Update `test/documentation.test.ts` to assert that instructions permit reading files and listing directories under approved roots and workspace paths; check: `npx tsx --test test/documentation.test.ts` (passed, 9/9 tests pass).
- [x] P3.S3: Run repository format and validation checks; check: `npm run check` (passed, 256/256 tests pass, 0 errors).

### Validation

- `npm run check` completes with exit code 0.

### Checkpoint

- Interactive checkpoint: verify clean repository checks and deliver final plan handoff.

## Progress Log

- 2026-09-28: Outline clarified and approved; Phases 1-3 elaborated and confirmed.
- 2026-09-29: Added symlink-aware workspace path inspection (Approach 1: dual canonical + lexical containment) to Plan Metadata, Decisions, Phase 1, and Phase 2 criteria; fixed YAML frontmatter for repo-backed storage validation.
