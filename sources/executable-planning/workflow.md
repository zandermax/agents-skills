## Discovery

Before proposing a plan, inspect the relevant repository area and any nearby
tests, documentation, or operational constraints. Identify the smallest set
of facts needed to describe the intended outcome, affected components, and
likely validation.

For work spanning independent domains, gather evidence for each domain
separately. Record findings in the canonical plan rather than relying on
conversation context alone.

## Alignment

Resolve the outcome, scope, interaction mode, storage choice, and constraints
required by the planning contract. Ask only questions that remain unanswered
or that would materially change a safe plan.

When alternatives have meaningful trade-offs, state the recommendation and
record the decision. In autopilot mode, make conservative reversible
assumptions when the answer is not essential to safety or validity.

## Design

Create the canonical plan using the required format. Give each phase a
specific domain boundary, tangible output, completion criteria, validation,
and checkpoint. Use the smallest number of phases that accurately represents
the work: one phase for a small self-contained outcome, and additional phases
when dependencies or independently reviewable results warrant them.

Keep detailed implementation steps deferred until the relevant phase begins.
Name the likely files, components, interfaces, risks, recovery considerations,
and dependencies needed to carry out the work without access to this chat.

Present the plan concisely after updating its canonical artifact. Once the plan is ready to begin, use the harness's native plan-review mechanism when one exists.

## Refinement

Treat user feedback as a plan change. Clarify questions, revise decisions and
scope when requested, and keep the canonical artifact synchronized with the
latest version.

When the user approves an interactive plan, record the approval and stop
before implementation. When the user asks to begin a phase, elaborate only
that phase's steps and follow its documented checkpoint rules.
