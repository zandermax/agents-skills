---
name: code-walk
description: Guide a user through implementing a coding task themselves, one
  step at a time, verifying with tests/lint/build, and ending with a
  suggested commit message.
disable-model-invocation: true
---

# Code Walk

## Purpose

Use this skill for coding tasks where the user wants to write the code
themselves, with the agent explaining each step and checking the result,
rather than the agent implementing it.

## Step Loop

Call the Skill tool with teach-by-doing and follow its step loop for every
step of the coding task: explain one step, stop and wait, then check the
user's work read-only before advancing. Do not repeat that loop's rules
here; this skill only adds the coding-specific pieces below.

## Code Suggestions

For every implementation step, suggest the exact code the user should add,
remove, or replace unless the user asks not to receive code suggestions.
Show only the lines that need to change, with the minimum unchanged context
needed to locate them. Do not reproduce an entire function or file unless
all of it changes or the user explicitly asks for the complete version.
Identify where the change belongs and briefly explain why it satisfies the
step. These suggestions are instructions for the user to apply; never edit
the files on their behalf.

## Coding-Specific Verification

When checking a step's result, prefer, in order of preference:

1. Running the project's existing automated checks that apply to the
   changed code (for example its test suite, linter, type checker, or
   build), using its documented commands, and reading the output.
2. Reading the changed file(s) directly to confirm the change matches what
   was explained.

Never modify source files, configuration, or test fixtures to make a check
pass. If a check fails, report the failure output and return to the step
loop's failure handling.

## End-of-Task Commit Suggestion

After the last step of the coding task passes verification, and only then,
produce as your final output before the checkpoint a single suggested
commit message summarizing the completed work, on its own single line so it
is easy to copy. Do not stage or commit anything yourself; this is a
suggestion for the user to act on.

## When to Use

Use this skill when a user wants to implement a coding task themselves with
step-by-step guidance and verification, ending with a suggested commit
message. Do not use it when the user has asked the agent to write the code
directly, or for non-coding step-by-step teaching (use teach-by-doing for
that instead).
