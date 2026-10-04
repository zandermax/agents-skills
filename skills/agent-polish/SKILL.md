---
name: agent-polish
description: Analyzes agent sessions for workflow tips, cost advice, and instruction fixes.
---

# Agent Polish

Analyzes recent `omp` and agent interaction history across local workspace sessions to produce actionable improvements for workflow efficiency, context cost reduction, and repository instruction refinement (`AGENTS.md`).

## Modes of Operation

Select the mode based on the explicit user request or infer from the query:

1. **`tips`**: Workflow and prompting habits. Evaluates user phrasing, task structure, tool loops, friction points, and correction cycles.
2. **`cost-tips`**: Token consumption and context efficiency. Analyzes turn counts, input/cache growth, compaction timing, file inspection breadth, and oversized prompt payloads.
3. **`improve`**: Repository instruction audit. Identifies recurring agent mistakes, tool missteps, or build/test churn in recent sessions to propose minimal, surgical additions or clarifications to `AGENTS.md`.

When no specific mode is specified, default to presenting a balanced summary across all three modes (1–2 top insights per area).

---

## Session Discovery and Data Ingestion

Session data is read-only. Never modify or delete session files.

### 1. Workspace Session Transcripts

- Environment variable `PI_SESSION_FILE`: Points directly to the active session transcript when running inside `omp`.
- Workspace session store: `~/.omp/agent/sessions/<workspace-slug>/`
  - Workspace slug is the normalized directory path (e.g., `-repos-fine-ants` or `-Users-zander-repos-...`).
  - Contains `.jsonl` files named `<timestamp>_<session-id>.jsonl`.
  - Tool execution artifacts and full logs live under `<timestamp>_<session-id>/`.
- Session SQLite Database: `~/.omp/agent/history.db`
  - `history`: Prompt texts, timestamps, session IDs, and workspace associations.
  - `session_recaps`: Auto-generated recaps summarizing session progress.
  - `session_titles`: User-visible titles for past sessions.

### 2. Inspecting Recent Sessions

1. Identify the 3–5 most recent sessions for the current workspace by inspecting timestamps in `~/.omp/agent/sessions/<workspace-slug>/` or querying `~/.omp/agent/history.db`.
2. Read JSONL event lines for target sessions:
   - `message` events where `role: "user"`: Analyze prompt clarity, task scope, pasted content, and follow-up corrections.
   - `message` events where `role: "assistant"`: Analyze tool call decisions, error responses, and output verbosity.
   - `toolCall` / tool result entries: Check for failed commands, repeated grep/read attempts on nonexistent files, or build failures.
   - `usage` objects: Track `input`, `output`, `cacheRead`, `cacheWrite`, and `totalTokens` across turns.
   - `mode_change`, `model_change`, and compaction markers (`ttsr_injection` or context reset messages).

---

## Execution Guidelines by Mode

### Mode 1: Workflow & Prompting Tips (`tips`)

Focus on how human prompts and agent reactions interact.

- **Check for**:
  - Repeated steering: Did the user have to prompt 2–3 times to get the intended command, format, or architectural style?
  - Vagueness vs. over-specification: Did short prompts trigger broad exploratory reading, or did dense prompts overload early turns?
  - Tool churn: Did the agent cycle repeatedly on failing bash commands, syntax errors, or failing edits instead of switching strategies?
  - Missed dedicated tools: Did the agent use bash scripts or custom find loops where specialized tools (`grep`, `glob`, `read`, LSP) exist?
- **Output Requirements**:
  - Provide 3–5 concrete, grounded tips.
  - Reference specific session events, recurring prompts, or error patterns as evidence.
  - For each tip, contrast the observed pattern with the recommended practice.

### Mode 2: Token & Cost Optimization (`cost-tips`)

Focus on context bloat, token burn, and compaction efficiency.

- **Check for**:
  - Exponential context growth: Sessions with many turns where cumulative input tokens ballooned due to reading whole files repeatedly rather than surgical line slices.
  - Oversized manual pastes: User pasting large stack traces, git diffs, or code snippets into chat when the agent could read them directly from disk.
  - Compaction timing: Were sessions allowed to grow beyond 100k+ tokens without resetting or breaking tasks into discrete phases?
  - Redundant tool re-reads: Did the agent re-read unchanged files or re-run passing tests multiple times in the same turn?
- **Output Requirements**:
  - Present token metrics (input tokens, total tokens, turn counts) for high-burn sessions.
  - Highlight 3–5 specific cost-reduction opportunities.
  - Quantify estimated token savings (e.g., using line-range reads, delegating scout subtasks, avoiding direct file pastes in prompt).

### Mode 3: Instruction Improvement (`improve`)

Focus on auditing project instructions (`AGENTS.md` or repo instructions) to eliminate agent stumbling blocks.

- **Check for**:
  - Recurring agent errors: Did the agent run forbidden git commands (e.g., `git status`, `git commit`)? Did it run full test suites when unit tests were requested?
  - Missing project conventions: Did the agent produce code with incorrect casing, wrong import styles, or deprecated APIs that the user had to correct?
  - Verification gaps: Did the agent declare work complete without running the project-specific build or lint commands?
- **Output Requirements**:
  - Read the active workspace `AGENTS.md`.
  - Propose 2–4 concise, minimal rules or corrections directly addressing the observed errors.
  - Present the exact proposed markdown diff or snippet.
  - Adhere to the golden rule: Never modify `AGENTS.md` automatically; present the proposed changes for user confirmation.

---

## Output Contract and Discipline

1. **Evidence First**: Every recommendation must cite an observed session timestamp, error message, or prompt pattern. Never hallucinate session statistics or invent patterns not present in the logs.
2. **Read-Only Analysis**: Do not mutate session files, project files, or git status during analysis.
3. **Concise and Actionable**: Avoid boilerplate preamble. Present findings in bulleted, high-signal format with clear headings.
