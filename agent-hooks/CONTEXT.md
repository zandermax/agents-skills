# Agent Hooks Context

One-line overview of each file in this directory:

- `CONTEXT.md`: Directory overview explaining the role of each file in `agent-hooks/`.
- `deny-non-read-git.d.ts`: TypeScript declarations for the shell command parsing, git read-only policy, and workspace boundary checking APIs.
- `deny-non-read-git.js`: Core policy engine implementing shell command tokenization, git read-only subcommand enforcement, and workspace boundary path validation.
- `deny-non-read-git.json`: Hook configuration defining the `PreToolUse` command runner that resolves and invokes `pre-tool-safety.mts`.
- `deny-non-read-git.mts`: Entrypoint and backward-compatibility module re-exporting safety APIs and delegating direct CLI execution to `pre-tool-safety.js`.
- `deny-non-read-git.sh`: Shell wrapper hook resolving script symlinks and executing `pre-tool-safety.mts` via Node and tsx.
- `pre-tool-safety.d.ts`: TypeScript declarations for the `PreToolUse` evaluation orchestrator and shadow evaluation APIs.
- `pre-tool-safety-git.js`: Policy checker evaluating tool use against mutating GitHub operations and delegating shell git commands to `deny-non-read-git.js`.
- `pre-tool-safety.js`: Top-level hook coordinator evaluating tool payloads against GitHub mutations, workspace boundaries, and command safety policies to emit allow/ask decisions.
- `pre-tool-safety.mts`: TypeScript entrypoint for the `PreToolUse` hook that re-exports evaluation functions and runs CLI execution when invoked directly.
- `pre-tool-safety-workspace.d.ts`: TypeScript declarations for workspace path policy enforcement functions.
- `pre-tool-safety-workspace.js`: Workspace boundary policy module checking command strings and tool inputs against allowed workspace roots via `deny-non-read-git.js`.
