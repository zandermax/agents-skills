---
status: completed
mode: interactive
canonical_location: docs/plans/archive/2026-09-28-agent-skills-workflow-enhancements.md
last_updated: 2026-09-30
current_phase: "Phase 3: Memory Note Pre-Flight"
current_step: done
next_action: none
blockers: none
---

# Agent Skills Workflow Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SKILL: Use `plan-executor` to execute this
> plan phase-by-phase. The canonical plan owns execution state and evidence.

**Goal:** Address recurring workflow friction identified in chat session history by updating agent tool permissions across `.github/agents/`, expanding `plan-it-out` storage capabilities, and rationalizing memory note pre-flights.

**Architecture:**

1. Update custom agent definitions in `.github/agents/` to uniformly declare baseline tools (`read`, `vscode/askQuestions`, `web`, `search`, and role-specific editing/execution permissions) and enhance `check-customizations` validation.
2. Update `.agents/skills/plan-it-out/SKILL.md` to remove the prohibition on file creation and support repo-backed plans in addition to session-only mode.
3. Streamline memory notes loading instructions in base documentation (`AGENTS.md`, `.github/copilot-instructions.md`, `CLAUDE.md`) to avoid expensive pre-flight re-reads of multiple memory files on every single turn.

**Tech stack:** TypeScript, Node.js test runner, Biome, Markdown agent/skill specifications.

## Global Constraints

- Mode is interactive; prompt user at checkpoints and phase transitions.
- Keep git read-only; do not stage, commit, branch, or push.
- Maintain compatibility with `npm run check` and `npm test`.
- External file authorization: `~/.claude/CLAUDE.md` is explicitly authorized for edits in Phase 3 to adjust the global memory pre-flight rules.

## Current State

- Current phase: Phase 3: Memory Note Pre-Flight
- Current step: done
- Next action: none
- Admission: User confirmed the compaction-free Phase 3 steps on 2026-09-30 with "Confirm and execute". That confirmation satisfies readiness for these steps.
- Blockers: none
- Admission: risk triggers apply (three phases). User confirmed Phase 1 steps on 2026-09-30 with "Confirm and execute". That confirmation satisfies readiness for these steps.

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
- Plan stogent permissions, plan-it-out storage, and memory pre-flight overhead. Context compaction was dropped on 2026-09-30: this harness cannot read context fullness, and VS Code already summarizes when the token budget is exceeded
- Interaction mode is interactive; 2026-09-28.
- Repurpose `plan-it-out` to support repo-backed plans in addition to session-only mode, updating its frontmatter description, rules, and tests; 2026-09-28.
- Explicitly authorize editing `~/.claude/CLAUDE.md` in Phase 3 alongside workspace documentation (`AGENTS.md`, `.github/copilot-instructions.md`, and local `CLAUDE.md`) to revise the global memory pre-flight rule; 2026-09-28.
- Phase 1 baseline tools are exactly `read`, `search`, `web`, and `vscode/askQuestions`, in any order. Keep each agent's existing role-specific tools. Do not add `edit` or `execute` to an agent that currently omits them. Do not reformat compliant tool lists. 2026-09-30.
- Out of scope, authorized 2026-09-30: set `docs/plans/archive/2026-09-29-directory-agent-links-and-interactive-installer.md` status from `active` to `completed` because every task is `[x]`, `current_step` is `done`, and the file is already archived. Then rerun Phase 1 validation.
- Phase 3 does not add agent-triggered compaction. This harness exposes no context-fullness reading, so a 75% trigger is not executable. VS Code already summarizes when the token budget is exceeded (`triggerSummarize` in `summarizedConversationHistory.tsx`). Compaction text is methodology only: the durable handoff is the canonical plan's Current State. The user monitors context and chooses a new session. 2026-09-30.
  compaction instructions. A methodology section would only restate harness summarization and the existing canonical-plan update rule, so it is omitted

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

- **Tangible output**: Updated instruction guidelines across `AGENTS.md`, `.github/copilot-instructions.md`, local `CLAUDE.md`, and the user-global `~/.claude/CLAUDE.md` that replace expensive blanket re-reading of all memory notes with targeted on-demand loading.
- **Completion criteria**: Clear trigger-based memory loading rules codified across workspace and global instruction files; no compaction section added.
- **Dependencies & Risks**: Must preserve memory safety invariants while reducing token waste. Edits to `~/.claude/CLAUDE.md` must adhere to manual curation guidelines and workspace boundary exception.
- **Checkpoint**: User Test: Review the revised instruction files for clarity and ensure no required memory isolation principles are compromised.

## Phase 1 Steps

Awaiting confirmation. Do not execute until the user explicitly confirms these steps.

Observed gaps on 2026-09-30: `executable-planner` and `plan-executor` already declare the baseline. `code-walk`, `plan-scout`, `remember-that`, and `teach-by-doing` lack `vscode/askQuestions`. `plan-checker` lacks `search` and `vscode/askQuestions`. `src/check-customizations.ts` does not enforce agent tool baselines. Success fixtures in `createFixtureRepo` and `reviewer.agent.md` omit `tools`.

1. [x] **Enforce the Copilot agent baseline and update success fixtures.**
   - Action: In `src/check-customizations.ts`, when validating a `copilot-agent` artifact, require `tools` to be an array of strings containing `read`, `search`, `web`, and `vscode/askQuestions`. Report each missing name; do not require `edit` or `execute`. In `test/check-customizations.test.ts`, add those four tools to the default `createFixtureRepo` agent and to `reviewer.agent.md`. Add one rejection test whose agent includes every baseline tool except `vscode/askQuestions` and asserts the missing-tool error. Leave rejection fixtures that already expect failure unchanged.
   - Check: `npx tsx --test test/check-customizations.test.ts` exits 0.
   - Evidence: 2026-09-30, exit 0, `21` pass, `0` fail. Includes `checkCustomizations rejects a Copilot agent missing a baseline tool`.

2. [x] **Declare the missing baseline tools on real agents.**
   - Action: Append only the missing baseline names, preserving existing names, order, and YAML style:
     - `.github/agents/code-walk.agent.md`: `["search", "read", "todo", "execute", "web", "vscode/askQuestions"]`
     - `.github/agents/plan-checker.agent.md`: `[read, edit, web, search, vscode/askQuestions]`
     - `.github/agents/plan-scout.agent.md`: `["search", "read", "web", "vscode/askQuestions"]`
     - `.github/agents/remember-that.agent.md`: `["search", "read", "edit", "execute", "web", "vscode/askQuestions"]`
     - `.github/agents/teach-by-doing.agent.md`: `["search", "read", "todo", "web", "vscode/askQuestions"]`
     - `.github/agents/executable-planner.agent.md` and `.github/agents/plan-executor.agent.md`: no tool-list edit.
       Update the Plan Scout `tools` deep-equal in `test/check-customizations.test.ts` to `["search", "read", "web", "vscode/askQuestions"]`.
   - Check: `npx tsx --test test/check-customizations.test.ts test/code-walk-skill.test.ts test/remember-that-skill.test.ts test/plan-executor-skill.test.ts` exits 0.
   - Evidence: 2026-09-30, exit 0, `43` pass, `0` fail.

3. [x] **Run Phase 1 validation.**
   - Action: Run the phase validation command. Do not start Phase 2.
   - Check: `npm run check:customizations && npm test` exits 0. Record the exit status and failing output if any.
   - Evidence: 2026-09-30 first run exited 1 on the archived plan status, recorded above. After the authorized status fix, `npm run check:customizations` exited 0 and `npm test` exited 0 with `257` pass and `0` fail.

### Phase 1 Checkpoint

- User Test requested: Inspect `.github/agents/*.agent.md` and verify declared tools; observe that each agent has access to its stated capabilities without permission errors.
- User response 2026-09-30: selected `Passed`; free text none.
- Disposition of that response: insufficient. A bare confirmation does not describe the observed tool declarations.
- Follow-up observation 2026-09-30: `"vscode/askQuestions" added`.
- Disposition: accepted. The observation matches the declared-tool change and does not contradict the completion criteria. Phase 1 is complete. User selected Continue to Phase 2 on 2026-09-30.

## Phase 2 Steps

Awaiting confirmation. Do not execute until the user explicitly confirms these steps. Interactive confirmation satisfies readiness for this phase.

Observed on 2026-09-30: `.agents/skills/plan-it-out/SKILL.md` fixes storage as session-only and says never create or update a file under `docs/plans/`. `test/executable-planning-skill.test.ts` only checks that the skill references `Discover` and `Clarify at outline level` and omits stale headings. Description is `Runs interactive session-only planning ending with a plan document.`

1. [x] **Allow requested repo-backed storage in plan-it-out.**
   - Action: Edit only `.agents/skills/plan-it-out/SKILL.md` and `test/executable-planning-skill.test.ts`. Set the description to `Runs interactive planning with session-only or repo-backed storage.` Keep interaction mode interactive and do not ask about it. Do not ask about storage: session-only stays the default and still writes no planning file; repo-backed is used only when the user requests it, creating and updating `docs/plans/<slug>.md` under the executable-planning repo-backed rules. Do not allow harness-native storage. Keep one-session elaboration and the final in-conversation handoff document for both modes. In the existing plan-it-out test, assert the new description, assert `docs/plans/<slug>.md` is requested-only, and assert the absolute `Storage is always session-only` rule is gone. Do not edit `executable-planning`.
   - Check: `npx tsx --test test/executable-planning-skill.test.ts` exits 0.
   - Evidence: 2026-09-30, first run failed `1` because the assertion required the repo-backed sentence on one line. The assertion was changed to allow whitespace, then the rerun exited 0 with `11` pass and `0` fail.

2. [x] **Run Phase 2 validation.**
   - Action: Run the phase validation command. Do not start Phase 3.
   - Check: `npm test -- test/executable-planning-skill.test.ts && npm run check:customizations` exits 0. Record the exit status and failing output if any.
   - Evidence: 2026-09-30, `npm run format && npm test -- test/executable-planning-skill.test.ts && npm run check:customizations` exited 0. `npm test` reported `257` pass and `0` fail. `check:customizations` ran after the tests and produced no validation error.

### Phase 2 Checkpoint

- User Test requested: Review `.agents/skills/plan-it-out/SKILL.md` and report what the storage instructions and frontmatter description say.
- User response 2026-09-30: `Session storage default for plan-it-out, use repo doc when requested`.
- Disposition: accepted. The observation matches the requested-only repo-backed rule and does not contradict the completion criteria. Phase 2 is complete. User selected Continue to Phase 3 on 2026-09-30.

## Phase 3 Steps

Revised after user feedback. Do not execute until the user explicitly confirms these steps. Interactive confirmation satisfies readiness for this phase. `~/.claude/CLAUDE.md` is already authorized by this plan; state that path again immediately before editing it.

Do not execute until the user explicitly confirms these steps. `~/.claude/CLAUDE.md` is already authorized by this plan; state that path again immediately before editing it.

Observed on 2026-09-30: `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` are identical and have no memory pre-flight. The blanket rule is only in `~/.claude/CLAUDE.md`. `test/documentation.test.ts` asserts the existing read-only memory sentence in `AGENTS.md` only.

1. [x] **Add on-demand memory loading to the workspace instruction files.**
   - Action: Append the same `## Memory Loading` section to `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`, keeping those three files identical. Do not add a compaction section. Do not remove the existing read-only memory or `/memories/` sentences. The new section says: load a `<topic>-notes` skill when the task enters that topic, and only then; do not scan or re-read every memory note at the start of every turn; load each matching note once per session unless its file changed or the topic is new; do not skip a matching note because the work appears routine.
   - In `test/documentation.test.ts`, assert that rule in `AGENTS.md`. Assert `AGENTS.md` does not contain `discover all matching` or a `Context Compaction` heading.
   - Check: `npx tsx --test test/documentation.test.ts` exits 0.
   - Evidence: 2026-09-30, exit 0, `10` pass, `0` fail. A later duplicate `## Memory Loading` heading was removed before phase validation. `diff -q` then reported no difference among `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`.

2. [x] **Replace the global blanket memory pre-flight.**
   - Action: Edit only `~/.claude/CLAUDE.md`. Replace the `Consult Memory Before Action` bullet with the same on-demand loading rule. Do not add a compaction bullet. Leave the manual-curation warning, memory root, and other principles unchanged.
   - Check: read `~/.claude/CLAUDE.md` and confirm `Consult Memory Before Action` and `mandatory for every agent, project, repository, language, and task` are absent, and the on-demand sentence is present.
   - Evidence: 2026-09-30, read-back of `/Users/zander/.claude/CLAUDE.md` shows `Load Matching Notes On Demand` with the on-demand sentence. A search for `Consult Memory Before Action`, `mandatory for every agent`, and `Context Compaction` returned no matches.

3. [x] **Run Phase 3 validation.**
   - Action: Run the phase validation command. Do not archive the plan until this check passes and the User Test is recorded.
   - Check: `npm run check && npm test` exits 0. Record the exit status and failing output if any.
   - Evidence: 2026-09-30, the command exited 0. Markdownlint reported `0` issues. Each `npm test` reported `258` pass and `0` fail. `check:customizations` and `check:drift` produced no validation error. The first validation attempt exited 1 on duplicate `Memory Loading` headings; that was corrected before this passing run.

### Phase 3 Checkpoint

- User Test requested: Review the revised instruction files for clarity and ensure no required memory isolation principles are compromised.
- User response 2026-09-30: `Looks good, and I added something to AGENTS.md along with your edits.`
- Disposition: accepted. `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` are identical (`diff` empty), so the reported addition is consistent across all three. The observation does not contradict the completion criteria. Plan complete; archived to `docs/plans/archive/2026-09-28-agent-skills-workflow-enhancements.md`.
