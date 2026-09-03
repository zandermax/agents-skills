## When to Use

Use this skill when creating or maintaining executable implementation plans that must work across IDE and autonomous harness execution.

Use this skill for multi-step efforts where durable canonical plan state, domain-based phases, and explicit validation/checkpoints are required.

Do not use this skill for direct implementation-only requests that do not require planning artifacts.

## Harness Adaptation

Adapt read/search operations to the current harness and gather enough context to produce a complete plan.

Adapt plan persistence to one canonical artifact and keep it synchronized after each material state change.

Adapt clarification prompts to the harness's native interactive question mechanism, calling whichever tool that harness provides for asking the user structured questions. Use it in interactive mode for clarification, phase confirmations, and awaiting-user items; if no such mechanism exists, ask in plain conversation. In autopilot mode, never use it and record conservative reversible assumptions instead.

Adapt delegation to available subagent mechanisms; when unavailable, record the limitation and produce a smallest-sound single-agent fallback, both when outlining steps and when executing an autopilot plan that requested parallel delegation.

Adapt phase-elaboration triggers to the harness: wait for an explicit user request in interactive mode, or elaborate automatically immediately before execution in autopilot mode. Never invoke git actions beyond read-only inspection through any harness tool, regardless of what the harness otherwise permits.
