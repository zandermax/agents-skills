---
name: learn-from-that
description: Diagnoses conversation friction and proposes generalizable improvements.
---

# Learn From That

Analyzes the active conversation transcript in-flight (or at the end of a session) to identify friction points, hangups, repetitive tool loops, permission boundary blocks, excessive turn counts, and context bloat. Proposes minimal, durable, and generalizable remediations to make future interactions shorter and more effective.

## Invariant Remediation Hierarchy

All suggestions and interventions MUST follow this strict precedence order:

1. **Shared Skills & Dedicated Tools (`agents-skills/`)**:
   - Primary target: Could a tool, script, subagent, or reusable skill eliminate this churn, tool loop, or manual back-and-forth?
   - Enhance or add capabilities to `agents-skills` (which is symlinked into all agents) before altering instructions.
2. **Instruction Refactoring & Deletion (`config-stuff/` & `AGENTS.md`)**:
   - Examine instructions in `config-stuff` (e.g. `agents.local.md`) and harness/workspace `AGENTS.md`.
   - **Subtraction-First Principle**: NEVER suggest adding instructions unless it is conclusively determined that modifying, clarifying, or removing existing instructions cannot solve the problem. Eliminate contradictory, ambiguous, or bloated instructions before adding rules.
3. **Private Memory & Preferences (`~/.memory/` or `$MEMORY_DIR`)**:
   - If the issue stems from an uncaptured, durable personal preference or convention, route it to topic-specific memory notes via `remember-that` conventions (`~/.memory/<topic>-notes/SKILL.md`).
4. **User Prompting Habits (Last Resort Only)**:
   - Suggest changes to how the user prompts or interacts ONLY after tools, skills, instructions, and memory have been fully considered and ruled out.
   - When suggesting user habit improvements, focus on generalizable patterns (e.g. upfront scope boundaries, avoiding raw diff pasting) rather than ad-hoc advice.

## Operational Distinctions

- **`learn-from-that` vs `agent-polish`**:
  - `learn-from-that` operates **in-flight** or immediately at turn conclusion on the **active conversation transcript** to diagnose immediate hangups, permission stops, tool churn, and turn counts.
  - `agent-polish` operates **retrospectively across multiple past sessions** (`~/.omp/agent/sessions/`, `history.db`) to identify broad trends and macro context consumption.
  - When uncertain whether an issue observed in `learn-from-that` is systemic or an anomaly, recommend cross-session verification via `agent-polish`.

## Diagnostic Categories

When inspecting the active conversation transcript, evaluate:

1. **Hangups & Permission Boundaries**:
   - Did the agent encounter denied permission gates, read-only boundary errors, or blocked shell commands?
   - Did the conversation pause unnecessarily on questions the repository context could answer?
2. **Tool Loops & Retries**:
   - Did the agent retry failing commands, repeatedly grep/read nonexistent files, or make circular edits?
   - Were dedicated tools (`grep`, `glob`, `read`, LSP) bypassed in favor of clumsy bash pipelines?
3. **Turn Churn & Conversation Length**:
   - How many turns were taken relative to task complexity?
   - Did the agent or user take multiple turns steering simple requirements that could have been established by an explicit convention or skill?
4. **Context Bloat & Token Efficiency**:
   - Were whole files read when targeted line ranges were sufficient?
   - Did oversized error outputs or git diffs flood the context window?
5. **Generalizability**:
   - Are proposed remedies systemic across future tasks, or overly tailored to this single prompt? Reject ad-hoc, brittle rules.

## Output Structure

When invoked, provide a concise, evidence-grounded report:

1. **Session Telemetry & Friction Points**:
   - Number of turns, key hangups, failed tool calls, or steering loops identified in the transcript.
2. **Analysis & Root Cause**:
   - Why the inefficiency occurred (missing tool capability, ambiguous instruction, uncaptured preference, or missing context).
3. **Proposed Actionable Remedies** (ordered strictly by hierarchy):
   - **Skills/Tools (`agents-skills`)**: Concrete updates or tool recommendations.
   - **Instruction Refactoring (`config-stuff`/`AGENTS.md`)**: Concrete deletions, consolidations, or modifications (with unified diffs). Explicit justification if an addition is required.
   - **Private Memory (`~/.memory`)**: Concrete preferences or conventions to register.
   - **User Workflow**: High-leverage user habits (only if lower layers cannot address it).
4. **Safety & Non-Destructive Invariant**:
   - Present all changes as proposals for user review; never automatically overwrite instructions or memories without confirmation.
