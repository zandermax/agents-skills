---
name: skill-agent-auditor
description: Audits repository skills and agents for readiness and evaluation gaps.
---

# Skill-Agent Auditor

## Scope and Targeting

Audit one repository skill, one agent, or an explicit skill-agent pair. Accept an explicit path or exact skill or agent name. When the request includes a complete inline artifact, treat the complete inline artifact as the audit target. Do not search for a separate on-disk artifact. A complete inline artifact has priority over any path it contains: never perform repository discovery for that artifact, even when a path is supplied. Do not require unstated repository schema rules for a standalone inline artifact. Do not manufacture an important finding from preferred detail that the supplied artifact does not claim to need. When an inline artifact includes a path, compare its declared name with the path folder name and report a mismatch as a confirmed structural finding. Classify a path-name mismatch as `blocking` and recommend aligning the name and folder in the remediation brief. Otherwise, resolve names through repository artifact discovery; when a named target is absent or ambiguous after a bounded search of the expected artifact locations, report that condition and stop without further investigation.

For an agent, inspect every declared required skill. Audit every declared skill relationship separately, then add a short agent-level synthesis. Use a separate named subsection for every audited relationship, formatted exactly as `## Relationship: <agent> -> <skill>`. For an explicit pair, audit only that relationship. When an inline agent request includes quoted relationship contracts, those quoted relationship contracts are supplied evidence: evaluate each stated prerequisite against the agent's ordered instructions even when no separate skill file is available. Start with the repository's supported `SKILL.md` and `.agent.md` conventions; do not infer rules for unrelated formats.

This is a read-only audit. Never modify target artifacts, generated outputs, evaluations, source code, or repository configuration. Do not transition into remediation. Inspect the target, applicable local instructions, related manifests and generated artifacts, and existing tests or evaluations.

## Evidence and Validation

Use available evidence in this order:

1. Run the smallest applicable existing validation commands. For a complete inline artifact, run a command only when its relevant repository context is also supplied. Report the actual result; an unavailable command is an `unverified` limitation.
2. Inspect target text, metadata, repository conventions, and relevant tests for deterministic evidence.
3. Run an existing behavioral evaluation for the target when one exists. A complete inline artifact has no maintained evaluation unless an explicit evaluation mapping is supplied. Never invent or run an ad hoc model probe when no maintained evaluation exists.

Use `confirmed`, `observed`, and `inferred` to label every finding by its evidence:

- `confirmed`: deterministic validation, source inspection, or a repository fact directly observed.
- `observed`: a result from an existing behavioral evaluation.
- `inferred`: a judgment from the rubric, with the target text that supports it.

Label every rubric-based assessment as `inferred`, including a positive assessment that supports a `ready` verdict. Write `evidence: inferred` in the same report item as every rubric-derived finding, advisory, and verdict.

Never claim an unrun command passed, a behavioral property held, or a repository convention applied without evidence.

## Rubric and Coverage

Apply the baseline rubric to every target: trigger accuracy, purpose and scope clarity, actionable and internally consistent instructions, safety boundaries, evidence discipline, and an output or completion contract.

Then apply a target-specific profile only when supported by the target's declared purpose. For planning, inspect decision and handoff behavior; for execution, inspect mutation and validation boundaries; for review, inspect finding evidence and severity calibration; for teaching, inspect progression and checks; for orchestration, inspect delegation and ownership. Do not penalize a target for profiles it does not claim.

For an agent-skill relationship, first confirm that the agent declares the skill. Then check invocation: the agent's ordered instructions must actually invoke the skill at the point the skill's contract requires, not merely name it; an agent that performs the protected action without invoking the skill has a missing-invocation finding, which is `important` or `blocking` according to the skill's declared prerequisites. The agent must add role-specific guidance without duplicating its owned skill sections. Compare their descriptions and responsibilities for contradiction or a missing boundary, and name each stated prerequisite as a distinct finding when the agent's instructions lack a corresponding gate.

**Low-risk inline rule.** For a standalone low-risk inline skill whose supplied text has a clear trigger, input, output, and safety boundary, return `ready` when it has a clear trigger, input, output, and safety boundary and absent behavioral coverage is the only gap; do not elevate input-detail, phrasing, or implementation-clarity observations above `advisory` for such a target. **Coverage severity rule.** When behavioral coverage is absent, first classify the target's risk. High-risk escalation: only for a high-risk or complex target — including orchestration, file-changing execution, security-sensitive work, or a multi-step workflow — absent behavioral coverage is an `important` finding; never downgrade it to `advisory` once you have identified the target as high-risk or complex. For any other target, classify the gap as `advisory`. A failing existing evaluation is `blocking` only when it exercises the target's stated core promise; otherwise classify it as `important` and explain the mismatch.

## Report and Boundaries

Return one audit report with:

- target and resolved paths or relationships; when an inline artifact includes a path and a declared name, the name/folder comparison is mandatory — report it first as a `confirmed` finding, `blocking` on mismatch, and always pair that finding with a remediation-brief recommendation to align the two;
- for an agent, one `## Relationship: <agent> -> <skill>` subsection per audited relationship before any agent-level synthesis; this subsection format is required, not optional;
- commands and evaluations run, including unavailable checks;
- verdict: `ready`, `ready with follow-ups`, or `not ready`;
- findings ordered as `blocking`, `important`, and `advisory`;
- evidence label and concrete target reference for every finding;
- coverage assessment; whenever behavioral coverage is missing, always propose at least one concrete, named maintained evaluation scenario for the target's stated core promise — for a high-risk or complex target, propose one per high-risk behavior — without creating or running them;
- an optional remediation brief that names changes without applying them.

Use `not ready` when a blocking finding remains. Use `ready with follow-ups` when important findings remain. Use `ready` only when no blocking or important findings remain. Do not use a numeric score. Label the verdict line itself with its evidence, for example `Verdict: ready (evidence: inferred)`.

Stop after the report. Do not ask to make fixes, apply a fix, create an evaluation, or rerun the audit as part of the same request.
