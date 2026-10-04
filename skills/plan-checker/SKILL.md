---
name: plan-checker
description: Reviews plans for coherence, evidence, risk, and execution readiness
---

# Plan Checker

Review a plan document or a complete plan held in conversation. The purpose is to determine whether the plan makes sense, can be executed as written, and exposes the decisions and evidence needed to execute it safely. This skill is review-only with respect to implementation files.

## Invocation contract

- Accept an explicitly supplied plan or context when one is provided.
- Otherwise select an eligible active plan document, then the latest complete plan in conversation.
- An active document is eligible only when it is clearly a plan: it has a goal or outcome and either phases, ordered steps, or an equivalent execution structure. A partial or unrelated document must not be mutated; ask for a target or fall back to conversation context.
- Direct invocations default to interactive mode. Use autopilot only when the caller or the plan explicitly requests it.
- `hone-the-plan` always invokes this skill in autopilot mode.

## Review scope

Apply the general rubric to every plan:

1. Outcome: the goal and success criteria are observable and agree with the requested scope.
2. Completeness: major work, dependencies, validation, risks, and handoff conditions are represented.
3. Coherence: steps, ordering, ownership, assumptions, and success criteria do not contradict each other.
4. Executability: each meaningful step has an owner, an actionable outcome, a dependency position, and a check or observable completion condition.
5. Evidence: claims about repositories, tools, interfaces, and existing behavior are supported by available context or labeled `unverified`.
6. Safety: destructive, security-sensitive, irreversible, or cross-boundary work has explicit controls and recovery paths.
7. Scope: the plan does not silently expand into unrelated work.

When the plan follows executable-planning conventions, additionally check its metadata, current state, phase outputs, step checks, phase gates, interaction mode, storage rules, handoff protocol, and read-only Git constraints. Do not require that format for ordinary plans.

Calibrate ordinary plans to their actual risk. Do not invent blocking errors for a concrete, observable check merely because it is concise, and do not require explicit owner labels when the plan has no delegated work and ownership is unambiguous from context. Missing executable-planning metadata is not an error for an ordinary plan.

When executable-planning conventions are detected, explicitly state that the format was detected and inspect each phase for a tangible output, completion criteria, dependencies, risks, validation, and checkpoint. Inspect each step for an action and a Check, and classify every missing execution-critical field as an `error`.

For every executable step without a `Check`, report a separate finding naming that step and the missing `Check`; do not merge it into a generic vagueness or executability finding.

## Risk screen

The authoritative automatic-review triggers are:

- three or more phases;
- high-risk, destructive, security-sensitive, migration, production, permission, or irreversible operations;
- work crossing repositories, services, environments, or externally coordinated systems;
- material claims or decisions that remain unverified or assumption-dependent;
- a concrete complexity reason recorded by the planner for unusual work.

A simple plan may skip separate review. Integrations must use this risk screen rather than copying a second rubric.

## Findings and readiness

Classify each finding as:

- `error`: contradiction, missing execution-critical information, unsafe ordering, unsupported material claim, unresolved required decision, or another issue that can make execution invalid or unsafe;
- `warning`: useful quality improvement that does not prevent execution;
- `info`: context or confirmation that does not require a change.

The verdict is `ready` only when no `error` remains. Warnings and informational findings do not block readiness. Every finding must identify the affected plan section or decision, explain why it matters, and propose a concrete fix. Do not invent repository facts, tool capabilities, test results, or decisions.

Return a structured review containing:

- `verdict`: `ready`, `not-ready`, or `unchecked`;
- prioritized `errors`, `warnings`, and `info` findings;
- `applied_fixes` and `unresolved_decisions`;
- evidence references, with unavailable evidence labeled `unverified`;
- `repair_cycles` from 0 through 2;
- a `review_record` containing the verdict, normalized content fingerprint, mode, and review time.

## Interactive and autopilot behavior

In interactive mode:

1. Analyze the complete target before changing it.
2. Apply unambiguous fixes that stay within the plan mutation boundary.
3. Present decision points as concrete options through the available question mechanism.
4. Apply only the choices accepted by the user.
5. If no interactive question mechanism exists, apply unambiguous fixes and return unresolved choices as a concise suggestion summary. Never fabricate a decision.

When a required decision is unresolved and no question tool can actually be called, include this explicit fallback sentence before the final record: `No interactive question mechanism is available here; I will not choose this decision for you. Please choose one of the listed options.`

In autopilot mode:

1. Analyze the complete target.
2. Resolve decisions conservatively in favor of explicit scope, reversibility, and evidence.
3. Record each assumption and apply all recommended fixes that remain within the mutation boundary.

After fixes, recheck the result. Permit at most two repair cycles. If blocking errors remain, return `not-ready` and stop; do not loop or silently hand off.

Always end with a complete final report containing the verdict, repair cycle count, applied fixes (or `none`), unresolved decisions (or `none`), assumptions (or `none`), evidence and `unverified` claims, and the fingerprint when one can be computed.

State the repair boundary explicitly in every report, for example `repair cycle 0 of 2 maximum`, and refuse requests to continue beyond the two-cycle limit.

Do not end a completed review with an open-ended question or invitation to keep iterating. The final response must contain a literal structured record, such as:

```yaml
verdict: ready|not-ready|unchecked
repair_cycles: 0 of 2 maximum
applied_fixes: none
unresolved_decisions: none
assumptions: none
evidence: ...
unverified: list each unavailable claim explicitly, or none
review_record:
	verdict: ...
	fingerprint: ...
	mode: ...
```

The structured record is mandatory when an interactive review has reached a final state. In interactive mode, do not emit the final record yet when a required decision is awaiting the user's answer: use the available question mechanism first, then apply the answer and emit the final record. If no question mechanism is available, explicitly say so and return the unresolved decision in the final record.

When the requester asks to continue until perfect or otherwise requests an unbounded loop, explicitly refuse that request in the final report: state that the two-cycle maximum is enforced, stop at the current cycle, and report the current verdict and remaining findings.

An unbounded-review request overrides the ordinary interactive question step. Do not ask the requester which unresolved option they prefer and do not invite another review cycle; report the unresolved decision, enforce the two-cycle maximum, and finish with the structured record.

For an explicit request such as "keep reviewing until perfect", include this exact refusal sentence: `I refuse the unbounded review request; the two-cycle maximum is enforced, so no further review cycle will be offered.`

For unavailable repository context, use an explicit list under `unverified:`. For example: `unverified: retry helper existence; staging smoke test existence; measurable meaning of "everything should work"`. Do not replace that list with only the word "assumption" or a narrative reference to unverified evidence.

If a plan mentions a repository helper or test that was not supplied, copy each such claim into the final line using the exact `unverified: claim; claim` format. In particular, for a plan that assumes a retry helper and staging smoke test, the final report must include `unverified: retry helper existence; staging smoke test existence; measurable meaning of "everything should work"`.

## Mutation and freshness boundary

Only mutate the supplied canonical plan and planning metadata directly owned by that plan. Never edit implementation code, referenced repositories, unrelated documents, or external systems. A review record is metadata, not plan content.

Compute the fingerprint from normalized reviewable plan content. Exclude volatile lifecycle fields, storage/current-state fields that change during handoff, step completion markers (`[x]`), recorded execution evidence, check outcomes, progress logs, audit/investigation findings, and the checker’s own review record. Include goals, requirements, decisions, phases, step definitions, dependencies, assumptions, risks, and validation. Equivalent conversational and persisted plans must produce the same fingerprint after persistence adds lifecycle metadata. Only changes to unexecuted scope, requirements, phase structure, step definitions, or safety constraints count as semantic plan changes; recording execution progress, check results, or evidence does not invalidate an admitted verdict. In interactive mode, explicit user confirmation of an elaborated phase or plan amendment satisfies readiness and supersedes automated re-admission. Any semantic plan change invalidates a prior verdict.

If the target is missing, ambiguous, malformed, ineligible, or too incomplete to review, explain the condition and do not mutate it. Use `unchecked` only when a required review cannot run because the checker or needed context is unavailable; use `not-ready` when review ran and found blocking errors.

## Non-negotiable behavior

- Do not implement the plan.
- Do not claim that a plan is ready because it looks plausible.
- Do not treat warnings as errors or errors as warnings.
- Do not use a prior verdict when its fingerprint does not match.
- Do not hide skipped review, unavailable evidence, unresolved decisions, or applied changes.
