---
name: plan-it-out
description: Run a fully interactive, session-only planning conversation using executable planning, ending with a self-contained handoff plan document.
disable-model-invocation: true
---
Call the Skill tool with "executable-planning", then apply these overrides
for the whole session; do not ask the user about interaction mode or storage,
they are fixed by this skill.

## Fixed Mode and Storage

- Interaction mode is always interactive.
- Storage is always session-only: never create or update a file under
  `docs/plans/`, and never rely on a harness-native plan artifact either.
  Hold the canonical plan only in this conversation, per the session-only
  rules in Canonical Plan Artifact.
- Still ask the Clarify First questions about outcome, scope, success
  criteria, and constraints; only the interaction-mode and storage questions
  are skipped, since they are fixed above.

## Table of Contents First

Ask the Alignment questions before anything else, framed to establish the
plan's overall parts: the outcome, scope, and the natural domain-based phase
boundaries that will become the table of contents. Do not ask any phase's
specific elaboration questions yet.

Once the outcome and scope are clear, propose the table of contents of
scoped, named phases with tangible outputs, following Plan Design. Get the
user's confirmation of the table of contents before elaborating any phase.

## Elaborate Every Phase in This Session

After the table of contents is confirmed, elaborate every phase in order,
in this same conversation, using the session-only exception in Phase
Elaboration: do not wait for a separate later request to start each phase,
since there is no later session to return to for this plan. For each phase:

1. Ask that phase's focused clarifying questions, scoped only to what it
   still leaves unresolved.
2. Propose its steps, dependencies, risks, and validation.
3. Pause for the user's confirmation before moving to the next phase.

## Always End With a Handoff Document

Once every phase is elaborated and confirmed, always close the session by
presenting one complete, self-contained markdown plan document in the
Required Plan Format, in full, in the conversation. Do not skip this even if
the user only asked about part of the plan. Resolve every open question or
record it as an explicit assumption or decision first, so a brand-new agent
session with no access to this conversation can execute the plan end to end
without further clarification.
