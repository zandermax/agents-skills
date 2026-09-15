---
name: plan-it-out
description: Runs interactive session-only planning ending with a plan document.
disable-model-invocation: true
---

Call the Skill tool with "executable-planning", then apply these overrides
for the whole session; do not ask the user about interaction mode or storage,
they are fixed by this skill. If the executable-planning skill cannot be loaded,
tell the user and stop; do not attempt to plan without it, since the referenced
sections define the required format.

## Fixed Mode and Storage

- Interaction mode is always interactive.
- Storage is always session-only: never create or update a file under
  `docs/plans/`, and never rely on a harness-native plan artifact either.
  Hold the canonical plan only in this conversation, per the session-only
  rules in Choose storage.
- Still ask the Clarify at outline level questions about outcome, scope, success
  criteria, and constraints; only the interaction-mode and storage questions
  are skipped, since they are fixed above.

## Table of Contents First

Follow Discover before asking questions. Then ask the Clarify at outline level
questions that discovery could not answer, folding unresolved phase-boundary
questions into the same prompt. Do not ask any phase's specific elaboration
questions yet.

Once the outcome and scope are clear, propose the table of contents of
scoped, named phases with tangible outputs, following Design the outline. Get the
user's confirmation of the table of contents before elaborating any phase.

## Elaborate Every Phase in This Session

After the table of contents is confirmed, elaborate every phase in order,
in this same conversation, using the Interactive + session-only handoff rule in
Workflow step 5: do not wait for a separate later request to start each phase,
since there is no later session to return to for this plan. For each phase:

1. Ask that phase's focused clarifying questions, scoped only to what it
   still leaves unresolved.
2. Propose its steps, dependencies, risks, and validation.
3. Pause for the user's confirmation before moving to the next phase.

## Always End With a Handoff Document

Once every phase is elaborated and confirmed, always close the session by
presenting one complete, self-contained markdown plan document in the
Plan Template format, in full, in the conversation. Do not skip this even if
the user only asked about part of the plan. Resolve every open question or
record it as an explicit assumption or decision first, so a brand-new agent
session with no access to this conversation can execute the plan end to end
without further clarification.

If the user asks to stop before all phases are elaborated, present the current
partial plan, mark unelaborated phases as such, and preserve unresolved questions
without converting them into assumptions. If the user requests changes to a
confirmed phase or the table of contents, apply them, re-confirm, and continue
from the current phase.
