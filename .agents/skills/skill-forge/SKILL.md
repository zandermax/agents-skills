---
name: skill-forge
description: Authors or overhauls an agent skill file for this repository.
disable-model-invocation: true
---

# Skill Forge

## Purpose

Use this skill to take a rough idea for a skill ("I want something that
helps with X") to a finished, checked-in `SKILL.md` that actually changes
agent behavior. Two things make that reliable: settling every open design
question with the user before drafting, and grounding the draft in this
repository's own authoring rules so it passes validation on the first try.

Do not draft a skill from assumptions. An untested skill is a guess about
what makes an agent behave differently; only a real interview with the user,
plus a before/after check, tells you if the guess was right.

## When to Use

Use this skill whenever the user explicitly asks to create, draft, author,
or overhaul an agent skill for this repository, or asks how to turn a
recurring technique or workflow into a skill file. It is reachable only by
name (`disable-model-invocation: true`), not something the agent reaches for
on its own.

When the request is to overhaul an existing skill rather than create a new
one, read that skill's current file first, then scope the grilling
interview below to what's changing and why, instead of assuming a
greenfield draft.

## The Grilling Interview

Before drafting anything, interview the user relentlessly until every open
design question is settled. Treat the skill's design as a tree: each
decision (purpose, triggers, output shape, ...) branches into further
decisions that depend on it.

Work the tree in rounds. The **frontier** is every decision whose
prerequisites are already settled — the questions answerable right now
without guessing at something not yet decided. Ask the whole frontier in one
round, numbered, each with your recommended answer, then stop and wait for
the user's answers. Do not ask a question whose answer depends on another
question still open in the same round; that question belongs to a later
round.

Format a round like this:

```
❓ Q1 - <question title>: <question body, plain language, options if useful>
➡️ <your recommended answer>

❓ Q2 - <question title>: <question body>
➡️ <your recommended answer>
```

Finding facts is your job, never the user's. When a frontier question needs
a fact from the environment (existing similar skills, repository
conventions, an install catalog, prior art elsewhere), go find it yourself —
read the files, search the repository, or dispatch a sub-task to research it
— instead of asking the user something you could look up. A running
investigation is just an unsettled prerequisite: only the questions
downstream of it wait; ask the rest of the frontier now. Decisions belong to
the user; put each to them and wait for an answer.

Each round the user answers reshapes the tree: newly settled decisions
unblock the questions that depended on them. Recompute the frontier and ask
the next round. The interview is done when the frontier is empty — every
branch visited, nothing left silently assumed. Do not start drafting until
the user has confirmed you both share the same understanding.

Use the frontier to settle at least these branches before drafting:

- **Purpose and triggers**: what should the skill make the agent do, and
  what phrasing or situation should surface it?
- **Invocation**: should the model reach for this skill on its own, or
  should it only fire when the user names it explicitly (add
  `disable-model-invocation: true`)?
- **Authoring shape**: hand-authored single `SKILL.md`, or manifest-driven
  (`sources/<name>/skill.json` plus fragments), per the "Repository
  Authoring Constraints" below.
- **Output location and name**: where the finished file will live and its
  kebab-case name.
- **Verification depth**: how rigorously the finished skill should be
  pressure-tested before it's considered done.

## Repository Authoring Constraints

A drafted skill only counts as finished once it satisfies this repository's
own validation, so bake these rules into the draft rather than discovering
them afterward:

- **Where it lives**: a new skill defaults to
  `.agents/skills/<name>/SKILL.md`, where `<name>` matches the skill's
  frontmatter `name` exactly — the folder name and the frontmatter name must
  be identical.
- **Hand-authored vs. manifest-driven**: use a single hand-authored
  `SKILL.md` for a self-contained skill. Use a manifest-driven skill under
  `sources/<name>/` with a `skill.json` only when it composes reusable
  sections, uses transforms, or needs generated output — that path also
  requires running the repository's build step before the file is usable.
  Choose manifest-driven for composition and reuse, never because a skill
  is merely long.
- **Frontmatter is minimal**: only `name`, `description`, and optionally
  `disable-model-invocation: true` are allowed. Anything else (tool lists,
  target harness, model, handoffs) belongs on an agent definition, not a
  skill.
- **Description is a concise purpose statement, not an instruction**: write it
  in the third person describing what the skill does (e.g., "Creates or
  maintains..."), avoiding instructional phrasing like "Use when...". Keep it
  concise (maximum 80 characters) and focused on purpose rather than internal steps.
- **No harness-specific literal tool names or paths** in the body — describe
  what needs to happen (search the repository, run the project's checks) so
  the skill works across whichever harness loads it, not just the one you
  drafted it in.
- **Validate before declaring done**: after writing the file, confirm the
  new skill is discoverable and that the repository's own checks (its build
  step for manifest-driven skills, and its overall validation/check step)
  pass with no new errors. Fix anything reported and re-run until clean.

## Lightweight Verification Loop

A skill is only worth keeping if it actually changes what an agent does, so
check that before calling the draft finished:

1. Pick one realistic scenario the skill should change the outcome for.
2. Run that scenario once as a baseline, without the new skill present, and
   note what the agent does by default.
3. Run the same scenario again with the new skill present, and compare: did
   the agent's behavior change in the way the skill intends?
4. If it didn't change, the skill's instructions are too vague, too
   optional-sounding, or missing the right trigger — revise and repeat this
   loop. If it changed but not quite right, tighten the wording that caused
   the gap.

This is a single before/after comparison for a real scenario, not a
benchmark suite: no assertion files, scoring scripts, or review tooling are
required to consider a skill validated this way. Reach for something more
rigorous only if the user asks for it explicitly.

## Worked Example

A user says: "I keep asking for the same kind of PR summary and typing it
out each time — can we make that a skill?"

**Round 1** (nothing decided yet, so purpose and invocation are both askable
now):

```
❓ Q1 - Purpose: should this skill produce the PR summary itself, or just
   remind you of the format you already use?
➡️ Produce the summary itself, from staged/committed changes — that's the
   repetitive part you're describing.

❓ Q2 - Invocation: should the agent reach for this on its own when you ask
   to "describe these changes" or "draft a PR", or only when you name the
   skill directly?
➡️ Model-invoked — the trigger phrasing ("summarize this PR", "describe
   these changes") is specific enough to not misfire on unrelated requests.
```

Once the user answers both, the next round can safely ask about output
shape and authoring shape, since neither depended on anything still open.

The resulting frontmatter draft:

```yaml
---
name: pr-summary-generator
description: Summarizes a PR, describes changes for review, or drafts PR
  descriptions.
---
```
