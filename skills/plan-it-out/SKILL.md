---
name: plan-it-out
description: Runs interactive planning with session-only or repo-backed storage.
disable-model-invocation: true
---

Call the Skill tool with "executable-planning", then apply these overrides
for the whole session. Do not ask about interaction mode or storage; both are
set by this skill, with repo-backed storage only when the user requests it.
If the executable-planning skill cannot be loaded,
tell the user and stop; do not attempt to plan without it, since the referenced
sections define the required format.

## Fixed Mode and Storage

- Interaction mode is always interactive. Do not ask about interaction mode.
- Do not ask about storage. Session-only is the default. Repo-backed storage is
  used only when the user requests it. Do not use harness-native plan storage.
- Session-only: never create or update a planning file. Hold the canonical plan
  only in this conversation, per the session-only rules in Choose storage.
- Repo-backed, only when requested: create and update the canonical plan at
  `docs/plans/<slug>.md`, per the repo-backed rules in Choose storage.
- Still ask the Clarify at outline level questions about outcome, scope, success
  criteria, and constraints.

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
in this same conversation. For session-only, use the Interactive + session-only
handoff rule in Workflow step 5. For repo-backed, persist each confirmed phase
to the canonical file. Do not wait for a separate later request to start each
phase. For each phase:

1. Ask that phase's focused clarifying questions, scoped only to what it
   still leaves unresolved.
2. Propose its steps, dependencies, risks, and validation.
3. Pause for the user's confirmation before moving to the next phase.

## Always End With a Handoff Document

Once every phase is elaborated and confirmed, always close the session by
presenting one complete, self-contained markdown plan document in the
Plan Template format, in full, in the conversation. When storage is repo-backed,
that same document is the canonical file at `docs/plans/<slug>.md`. Do not skip
this even if the user only asked about part of the plan. Resolve every open
question or record it as an explicit assumption or decision first, so a
brand-new agent session with no access to this conversation can execute the
plan end to end without further clarification.

If the user asks to stop before all phases are elaborated, present the current
partial plan, mark unelaborated phases as such, and preserve unresolved questions
without converting them into assumptions. If the user requests changes to a
confirmed phase or the table of contents, apply them, re-confirm, and continue
from the current phase.
