# Skill Evaluations (Waza)

This directory contains on-demand behavioral evaluation suites for `SKILL.md` artifacts using [Waza](https://microsoft.github.io/waza/) (`microsoft/waza`).

## Purpose & How It Differs from `test/`

- **`test/` (Deterministic Unit & Integration Tests)**:
  - Fast, fully offline, and deterministic.
  - Validates TypeScript code, schema conformance, artifact build outputs, frontmatter properties, and structural rules.
  - Runs automatically on every pull request and push via `npm test` and `npm run check`.
- **`evals/` (Behavioral Model-Graded Evaluations)**:
  - Evaluates how AI models and agents interpret and adhere to skills when given realistic prompts and interactive scenarios.
  - Involves model inference, live agent execution, and behavioral grading (assertions on output content, tool invocation patterns, and LLM judge criteria).
  - Run **strictly on-demand** by contributors or agents when creating a new skill or making material behavioral changes.
  - **Never** executed in CI, `npm test`, or `npm run check`.

## Directory Structure

Evaluations follow standard Waza conventions:

```text
evals/
  <skill-name>/
    eval.yaml        # Evaluation suite definition (targets, graders, tasks)
    tasks/           # Task definitions (*.yaml) with inputs and assertions
    fixtures/        # Optional task fixtures, mock inputs, or templates
```

## Prerequisites & Installation

Waza is an external CLI binary written in Go, not an npm package. It must be installed on your local machine:

1. Visit the [Waza documentation](https://microsoft.github.io/waza/) and [GitHub releases](https://github.com/microsoft/waza/releases).
2. Install the `waza` binary and ensure it is available on your `PATH`.
3. Configure your target model credentials (e.g., Azure OpenAI, OpenAI, or other supported provider API keys/environment variables) per Waza documentation.

## Running Evaluations

You can run evaluations via the repository npm script:

```bash
# Run the executable-planning evaluation suite
npm run eval:waza -- run executable-planning -v

# Or run directly with the waza CLI
waza run executable-planning -v
```

Local caches and execution outputs (e.g. `.waza-cache/`) are ignored by version control.

## Remember That

```sh
npm run eval:waza -- run remember-that -v
```

The five cases cover clear capture into an existing private topic, clarification
of a conflicting preference, read-only retrieval, a repair request that must not
create memory, and safe recovery after a reported repository-backed registration
conflict. The last case checks the agent's refusal to bypass the helper; actual
symlink resolution and helper execution are covered by deterministic tests.
Tasks configure `MEMORY_DIR=private-memory` and `AGENTS_SKILLS_HOME=test-home`
inside their temporary workspace. They must not access real home directories,
global configuration, or session history.

File graders check observable artifacts and unchanged fixture content. Model
graders check execution evidence, clarification, reporting, and unsafe-link
handling, without repairing outcomes during grading. The target skill body is
injected, `remember-that` is required, and unrelated repository skills are disabled:
adherence, not automatic discovery. Optional `ctx` and customization-evaluation
integrations are not exercised by the capture fixtures.

## Workspace Isolation

`npm run eval:waza` copies this repository to a temporary workspace before
starting Waza. Agents and tools invoked by an evaluation can therefore modify
only that copy, never the checkout that launched the evaluation. The temporary
workspace is removed when the run completes.

On macOS, the runner additionally starts Waza through `sandbox-exec`. It
permits writes only in the temporary workspace (including Waza's runtime
temporary directory), Waza's state directory at `~/.waza`, Copilot's state
directory at `~/.copilot`, and the embedded Copilot SDK's license cache at
`~/Library/Caches/copilot-sdk`. Other platforms retain copy-based isolation.

Pass `--keep-workspace` to preserve the copy for debugging; the runner prints
its path before returning.
