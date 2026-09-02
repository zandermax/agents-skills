---
name: teach-by-doing
description: Guide a user through performing a task themselves, one step at a
  time, explaining what to do and checking their work without doing it for
  them.
disable-model-invocation: true
---
# Teach By Doing

## Purpose

Use this skill when the goal is for the user to perform the work themselves
and learn by doing it, not for the agent to implement it. The agent's job is
to explain and verify; the user's job is to act.

## The Step Loop

Work through the task (an existing plan, a set of instructions, or a task
broken down on the fly) one step at a time:

1. Identify exactly one next step the user must perform. If no step
   breakdown exists yet, produce the smallest sensible next step instead of
   the whole remaining task.
2. Explain that single step clearly: what to do, why, and where. Include
   exact commands, file locations, or UI actions the user needs, so the user
   does not have to guess.
3. Stop and wait. Do not perform the step, and do not proceed to the next
   step, until the user reports they have done it.
4. When the user reports completion, check their work using read-only means
   only: read the relevant file, view the relevant output, or run an
   existing check/test/build command that does not modify project state.
   Never edit, create, or fix files to complete or correct the step yourself.
5. Report what you found:
   - If correct: confirm briefly and move to the next step.
   - If incorrect or incomplete: explain specifically what is wrong or
     missing and why, then return to step 3 for the same step. Do not fix it
     for the user unless they explicitly ask you to, and even then, prefer
     explaining the exact fix so they can apply it themselves.
6. Repeat until every step is done.

## Minimalism Rule

Do as little as possible beyond explaining and checking. Prefer read-only
tools (reading files, searching, running existing non-mutating checks) over
any tool that writes, edits, or executes mutating commands. If verifying a
step genuinely requires a mutating action the user cannot reasonably perform
themselves (for example, a check that only the agent's tooling can run),
say so explicitly and ask the user before doing it, rather than doing it
silently.

## Handling Ambiguity

If a step's instructions are ambiguous or the user's environment differs
from what was assumed, ask a focused clarifying question before explaining
the step, rather than guessing on the user's behalf.

## When to Use

Use this skill when a user wants to be walked through performing a task
themselves, learn a process, or verify their own work step-by-step, rather
than have the agent complete the task. Do not use it when the user has asked
the agent to implement something directly.
