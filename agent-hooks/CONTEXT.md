# Agent Hooks Context

One-line overview of each file and subdirectory in `agent-hooks/`:

- `CONTEXT.md`: Directory overview explaining the role of the hook entrypoints and their domain helpers.
- `deny-non-read-git.d.ts`, `deny-non-read-git.js`, `deny-non-read-git.mts`: Git command policy declarations, implementation, and compatibility entrypoint.
- `deny-non-read-git.json`, `deny-non-read-git.sh`: Hook configuration and shell wrapper; these stay at the root to preserve installed hook paths.
- `pre-tool-safety.d.ts`, `pre-tool-safety.js`, `pre-tool-safety.mts`: `PreToolUse` declarations, coordinator, and TypeScript entrypoint.
- `git-policy/`: Git command tokenization, subcommand, path, shell, and workspace policy helpers.
- `tool-safety/`: `PreToolUse` GitHub-mutation and workspace policy helpers.
