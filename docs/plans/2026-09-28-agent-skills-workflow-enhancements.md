---
status: pending
mode: interactive
canonical_location: docs/plans/2026-09-28-agent-skills-workflow-enhancements.md
last_updated: 2026-09-28
current_phase: "Phase 1: Custom Agent Tool Permissions & Validation Consistency"
current_step: not_elaborated
next_action: Elaborate Phase 1 steps and present for user confirmation
blockers: none
---

# Agent Skills Workflow Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SKILL: Use `plan-executor` to execute this
> plan phase-by-phase. The canonical plan owns execution state and evidence.

**Goal:** Address recurring workflow friction identified in chat session history by updating agent tool permissions across `.github/agents/`, expanding `plan-it-out` storage capabilities, rationalizing memory note pre-flights, and establishing context compaction practices.

**Architecture:**

1. Update custom agent definitions in `.github/agents/` to uniformly declare baseline tools (`read`, `vscode/askQuestions`, `web`, `search`, and role-specific editing/execution permissions) and enhance `check-customizations` validation.
2. Update `.agents/skills/plan-it-out/SKILL.md` to remove the prohibition on file creation and support repo-backed plans in addition to session-only mode.
3. Streamline memory notes loading instructions in base documentation (`AGENTS.md`, `.github/copilot-instructions.md`, `CLAUDE.md`) to avoid expensive pre-flight re-reads of multiple memory files on every single turn.
4. Add compaction guidance and checkpoints awareness to agent instructions.

**Tech stack:** TypeScript, Node.js test runner, Biome, Markdown agent/skill specifications.

## Global Constraints

- Mode is interactive; prompt user at checkpoints and phase transitions.
- Keep git read-only; do not stage, commit, branch, or push.
- Maintain compatibility with `npm run check` and `npm test`.
- External file authorization: `~/.claude/CLAUDE.md` is explicitly authorized for edits in Phase 3 to adjust the global memory pre-flight rules.

## Current State

- Current phase: Phase 1: Custom Agent Tool Permissions & Validation Consistency
- Current step: not_elaborated
- Next action: Elaborate Phase 1 steps and present for user confirmation
- Blockers: none

## Execution Protocol

1. Read Current State first and perform exactly the Next action.
2. Status markers: `[ ]` pending, `[-]` in progress, `[x]` complete, `[!]` blocked, `[?]` awaiting user.
3. Elaborate a phase only when the user requests it, confirm its steps before execution, and update this plan before every material event.
4. Run every step's Check and record its exact outcome before marking it `[x]`.
5. If a check fails or a premise is contradicted, mark the step `[!]`, record evidence, and stop for user direction.
6. At an interactive phase checkpoint, run the full Validation. When the checkpoint has a User Test, gather and record the user's free-text observation before offering continuation, revision, or pause. When User Test is unavailable, preserve the rationale and use normal confirmation.
7. Git is read-only: status, diff, log, show, and branch listing only. Never stage, commit, branch, or push.

## Decisions

- Target all 4 areas identified from session history: agent permissions, plan-it-out storage, memory pre-flight overhead, and context compaction; 2026-09-28.
- Plan storage is repo-backed at `docs/plans/2026-09-28-agent-skills-workflow-enhancements.md`; 2026-09-28.
- Interaction mode is interactive; 2026-09-28.
- Repurpose `plan-it-out` to support repo-backed plans in addition to session-only mode, updating its frontmatter description, rules, and tests; 2026-09-28.
- Explicitly authorize editing `~/.claude/CLAUDE.md` in Phase 3 alongside workspace documentation (`AGENTS.md`, `.github/copilot-instructions.md`, and local `CLAUDE.md`) to revise the global memory pre-flight rule; 2026-09-28.

## Deferred Items

- None.

## Phase Outline

### Phase 1: Custom Agent Tool Permissions & Validation Consistency

- **Tangible output**: All custom agent definitions under `.github/agents/` uniformly declare their required baseline capabilities (`read`, `vscode/askQuestions`, `web`, `search`) and role-specific execution/edit tools, verified by `npm run check:customizations` and unit tests.
- **Completion criteria**: No custom agent definitions missing required tool permissions; `src/check-customizations.ts` enforces the baseline uniformly; agent test fixtures in `test/check-customizations.test.ts` updated to declare baseline tools; `npm test` passes.
- **Validation**: `npm run check:customizations && npm test`
- **Dependencies & Risks**: Low risk; changing declared frontmatter attributes must match test assertions and fixtures in `test/check-customizations.test.ts`.
- **Checkpoint**: User Test: Inspect `.github/agents/*.agent.md` and verify declared tools; observe that each agent has access to its stated capabilities without permission errors.

### Phase 2: Plan-it-out Storage Flexibility

- **Tangible output**: Updated `.agents/skills/plan-it-out/SKILL.md` (frontmatter description, invariants, and storage rules) that removes the absolute prohibition against file creation, allowing repo-backed plans under `docs/plans/` when requested while keeping session-only as a valid option.
- **Completion criteria**: `plan-it-out` frontmatter description and documentation reflect flexible storage options; `test/executable-planning-skill.test.ts` and `npm run check:customizations` pass.
- **Validation**: `npm test -- test/executable-planning-skill.test.ts && npm run check:customizations`
- **Dependencies & Risks**: Requires updating tests that verify `plan-it-out` content headings and frontmatter description rules.
- **Checkpoint**: User Test: Review `.agents/skills/plan-it-out/SKILL.md` to confirm the storage instructions and frontmatter description are unambiguous and allow repo-backed planning.

### Phase 3: Memory Note Pre-Flight & Context Compaction Guidelines

- **Tangible output**: Updated instruction guidelines across `AGENTS.md`, `.github/copilot-instructions.md`, local `CLAUDE.md`, and the user-global `~/.claude/CLAUDE.md` that replace expensive blanket re-reading of all memory notes with targeted on-demand loading, plus mid-session context compaction practices.
- **Completion criteria**: Clear trigger-based memory loading rules codified across workspace and global instruction files; compaction tips codified; documentation checks pass.
- **Validation**: `npm run check && npm test`
- **Dependencies & Risks**: Must preserve memory safety invariants while reducing token waste. Edits to `~/.claude/CLAUDE.md` must adhere to manual curation guidelines and workspace boundary exception.
- **Checkpoint**: User Test: Review the revised instruction files for clarity and ensure no required memory isolation principles are compromised.
