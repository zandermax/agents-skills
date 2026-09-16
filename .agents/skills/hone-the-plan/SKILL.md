---
name: hone-the-plan
description: Automatically reviews and improves a plan for coherence and execution readiness
disable-model-invocation: true
---

Delegate to `plan-checker` and apply these overrides for this invocation. If a Skill tool is available, call `plan-checker` through it. If it is unavailable, execute the same plan-checker protocol in the current context; do not substitute an ad-hoc script or a separate rubric.

- Run in autopilot mode.
- Select the explicit plan argument first, then an eligible active plan document, then the latest complete plan in conversation.
- Apply all recommended fixes that remain within the plan-checker's mutation boundary.
- Use the file-editing mechanism to make those fixes in the supplied canonical plan; do not merely describe proposed edits.
- Use these exact headings and fields when absent: `## Success criteria`, `## Assumptions`, and `Check:`. Put at least one observable bullet under `## Success criteria`, add one `Check:` to every numbered step, and put conservative unresolved choices under `## Assumptions` rather than deciding for the user.
- For example, transform `1. Change it.` into `1. Change the cache implementation while preserving the required callers. Check: focused cache tests pass and the affected callers compile.` Do equivalent concrete rewrites for every vague step.
- Record conservative assumptions for decisions that are not explicitly resolved.
- Recheck after fixes, stopping after the plan-checker's maximum of two repair cycles.
- Return the final verdict, applied fixes, remaining findings, assumptions, evidence, and fingerprint.
- End with the complete plan-checker final report, including `applied_fixes` even when the list is empty.
- Do not finish by asking whether to apply the fixes: the fixes must already be applied before the final report.
- The final report must contain an explicit `unverified:` list for unavailable repository claims, or `unverified: none` when there are none.

Do not implement the plan or edit implementation files. If the target is missing, ambiguous, malformed, or unavailable, report that condition without inventing a plan or decision.
