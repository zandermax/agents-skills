---
status: drafting
mode: interactive
canonical_location: docs/plans/2026-09-19-skill-agent-audit-token-optimization.md
last_updated: 2026-09-19
current_phase: Phase 1
current_step: not started
next_action: Begin Phase 1 by inventorying all agent and skill sources and defining the audit rubric.
blockers: none
---

# Skill and Agent Token-Optimization Audit Plan

## Plan Metadata

- Status: drafting
- Mode: interactive
- Delegation: not applicable at outline stage; step design will be delegated per phase only when a phase is elaborated.
- Canonical location: docs/plans/2026-09-19-skill-agent-audit-token-optimization.md
- Last updated: 2026-09-19
- Goal: Audit every skill and agent in the repository for token-efficiency opportunities while preserving or improving output quality, execution efficiency, and agent usefulness.
- Success criteria:
  - Every relevant skill and agent is inventoried and reviewed against a shared token-efficiency rubric.
  - High-token or low-signal guidance is reduced without reducing correctness, safety, or maintainability.
  - The audit captures concrete opportunities to shorten prompts, remove redundancy, and tighten execution instructions.
  - The plan-executor agent reviews its own coding-agent context and transforms those findings into improved instructions for other coding agents.
  - The repository stores the final findings and the resulting instruction updates in a traceable, reviewable way.
- Constraints and assumptions:
  - Repo-backed storage is required; all work stays under docs/plans/ and targeted instruction files only.
  - Git usage is read-only except for inspecting repository state; no stage, commit, branch, or push actions are allowed.
  - Interactive mode will pause at phase checkpoints for explicit user confirmation before the next phase begins.
  - Improvement must optimize token usage first without sacrificing quality, safety, or outcome reliability.
  - This plan focuses on repository skills and agents, not unrelated project code unless a skill references or depends on it.

## Current State

- Current phase: Phase 1
- Current step: not started
- Next action: Begin Phase 1 by inventorying all agent and skill sources and defining the audit rubric.
- Blockers: none

## Decisions

- Use a single repo-backed interactive plan with sequential phase checkpoints and explicit review gates; 2026-09-19.
- Treat token optimization as a measurable design goal: shorter instructions and less repeated context, with no drop in result quality; 2026-09-19.
- Include a self-audit by the plan executor as a distinct phase so its coding-agent context informs improvements for other agents; 2026-09-19.
- Prefer evidence-based changes over broad rewrites: identify concrete high-token patterns, validate them, then update instructions accordingly; 2026-09-19.

## Deferred Items

- None at outline stage.

## Phase 1: Inventory, Scope, and Audit Rubric

### Tangible output

A complete inventory of all skills and agents covered by the audit, plus a shared rubric for judging token efficiency and result quality.

### Completion criteria

- The audit scope is explicit: all relevant skill definitions, agent instruction files, and any repo-level instruction sources that influence coding-agent behavior.
- The rubric covers token usage, clarity, redundancy, signal-to-noise ratio, correctness, and execution efficiency.
- The inventory is ready to be used for per-file and per-agent review without leaving gaps.

### Dependencies and risks

- Depends on repo inspection and the existing planning conventions in this repository.
- Risk: scope creep if every repo document is treated as an agent artifact.
- Recovery: narrow the audit to actual skill and agent instruction surfaces, not all markdown docs unless they directly drive agent behavior.

### Steps

_Not yet elaborated. Populate immediately before this phase starts._

### Validation

- Confirm the inventory includes the canonical skill sources and agent instruction surfaces in this repo.
- Confirm the rubric includes both efficiency and quality metrics before any recommendation is recorded.
- Verify no material source is omitted or double-counted.

### Checkpoint

_Interactive mode requires a phase checkpoint and user confirmation before Phase 2 starts._

## Phase 2: Audit Existing Skills for Token Efficiency and Quality

### Tangible output

A reviewed set of findings for each skill, grouped by token-cost drivers, redundant instructions, and opportunities to preserve or improve usefulness.

### Completion criteria

- Each skill has at least one explicit review entry under the rubric.
- Findings distinguish between necessary instructions, high-noise instructions, and opportunities to shorten or restructure content.
- Recommendations prioritize the highest token savings with the lowest risk to quality.

### Dependencies and risks

- Depends on Phase 1 inventory and rubric.
- Risk: reviewing skills in isolation can miss cross-skill overlap; keep a cross-reference list of repeated patterns.
- Recovery: capture repeated instruction fragments and consolidate them where that improves clarity and consistency.

### Steps

_Not yet elaborated. Populate immediately before this phase starts._

### Validation

- Ensure each skill has an auditable recommendation with a rationale tied to either token waste or quality risk.
- Ensure the review does not contain generic suggestions without evidence from the skill text or execution pattern.
- Check that the highest-cost patterns are prioritized before lower-impact micro-optimizations.

### Checkpoint

_Interactive mode requires a phase checkpoint and user confirmation before Phase 3 starts._

## Phase 3: Audit Agents and the Plan Executor’s Coding-Agent Context

### Tangible output

A comparable review of agent instructions, including a self-audit of the plan executor agent as a coding agent and its context assumptions.

### Completion criteria

- Each agent instruction set is reviewed with the same rubric.
- The plan executor explicitly evaluates its own context window, instruction hierarchy, and assumptions about coding-agent behavior.
- Recommendations identify how to tighten agent instructions for other coding agents without eroding reasoning quality or required safety guardrails.

### Dependencies and risks

- Depends on the skill findings from Phase 2 and the repo’s agent surfaces.
- Risk: self-audit can become circular or overly self-referential.
- Recovery: separate direct instruction review from system-level context evaluation and record them as distinct findings.

### Steps

_Not yet elaborated. Populate immediately before this phase starts._

### Validation

- Check that every agent recommendation is tied to one of: context bloat, repeated instructions, ambiguous goals, redundant guardrails, or missing execution constraints.
- Verify the plan executor’s self-audit is recorded as a distinct analysis, not just a summary of earlier skill findings.
- Confirm the agent recommendations are actionable for future coding agents rather than purely descriptive.

### Checkpoint

_Interactive mode requires a phase checkpoint and user confirmation before Phase 4 starts._

## Phase 4: Synthesize Improvements and Update Instruction Files

### Tangible output

A prioritized set of concrete instruction updates for skills and agents, with the highest-value token reductions and the clearest quality-preservation story.

### Completion criteria

- Recommended changes are ranked by impact and risk.
- The update scope is explicit: which files or instruction sections will change, and which will remain intentionally unchanged.
- The final recommendation set is ready for review and editing without re-litigating the audit rubric.

### Dependencies and risks

- Depends on Phases 1–3 findings and user confirmation at the prior checkpoint.
- Risk: changing too many files at once without preserving signal and quality.
- Recovery: implement only the highest-confidence improvements first and defer broader cleanup to later review cycles.

### Steps

_Not yet elaborated. Populate immediately before this phase starts._

### Validation

- Ensure each recommended change maps back to an identified issue from the audit.
- Verify the proposed edits preserve required behavior, safety, and repo conventions.
- Confirm the plan executor’s context lessons are reflected in the final recommendation set for other coding agents.

### Checkpoint

_Interactive mode requires a phase checkpoint and user confirmation before Phase 5 starts._

## Phase 5: Execute High-Confidence Improvements and Re-Validate

### Tangible output

The repository contains only the targeted instruction improvements that survived the audit and validation gates, with a record of what changed and why.

### Completion criteria

- The approved changes are applied to relevant skill or agent instructions.
- The validation process confirms no regression in the repository’s expected behavior for the changed artifacts.
- Final notes include the measured tradeoff between token reduction and output quality.

### Dependencies and risks

- Depends on the approved update list from Phase 4.
- Risk: edits may be too broad or may fix format without reducing token cost materially.
- Recovery: validate each batch of changes against the audit rubric before expanding the edit set.

### Steps

_Not yet elaborated. Populate immediately before this phase starts._

### Validation

- Run the smallest relevant verification command(s) for the edited instruction artifacts.
- Check the final diff for evidence that token-noise reduction happened without omitting necessary guidance.
- Confirm the final review notes explicitly call out the net effect on efficiency and quality.

### Checkpoint

_Interactive mode requires a phase checkpoint and explicit user confirmation before closing the plan._

## Progress Log

- 2026-09-19: Plan created in repo-backed storage and scoped as an interactive, multi-phase audit of skills and agents for token efficiency and quality retention.
