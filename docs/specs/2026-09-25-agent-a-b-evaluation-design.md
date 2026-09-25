# On-Demand A/B Evaluation for Agent Skills

## Goal

Provide a repeatable, on-demand way to compare the committed version of a
skill with its current working-tree update. The comparison must preserve or
improve behavioral quality before treating lower token or request usage as an
improvement.

The primary user entry point is `/a-b-agent-test`, backed by a reusable custom
skill and a repository-owned comparison CLI.

## Scope

Version 1 evaluates skills that already have a maintained Waza suite under
`evals/<skill-name>/`. It compares `HEAD` with the working tree and uses three
trials per task by default.

Version 1 does not:

- evaluate custom agents or hooks;
- compare arbitrary Git refs;
- run in CI or as part of `npm run check`;
- create evaluation tasks for skills that lack them;
- combine quality and cost into a weighted score;
- estimate telemetry that Waza does not report.

Custom-agent and hook adapters are future extensions of the same user-facing
command.

## User Experience

The direct form names the target skill:

```text
/a-b-agent-test executable-planning
```

When no target is supplied, the workflow asks the user to choose an eligible
changed skill. It asks only for missing choices, using these defaults:

- baseline: committed `HEAD` artifact;
- candidate: current working-tree artifact;
- trials: three per task per variant;
- quality tolerance: zero regression;
- meaningful runtime-token improvement: at least 5%;
- cache: disabled;
- task parallelism: disabled.

Before execution, the workflow shows the resolved skill, model, judge model,
and trial budget. After execution, it prints a concise comparison table, a
verdict, the most important per-task differences, and the path to retained
local JSON evidence.

## Architecture

The feature has three layers with one owner for each responsibility.

### Slash Prompt

A repository-owned `a-b-agent-test.prompt.md` exposes the literal
`/a-b-agent-test` command in VS Code. It accepts an optional skill name and
delegates to the `a-b-agent-test` skill.

The install catalog gains a prompt collection and Copilot destination at
`~/Library/Application Support/Code/User/prompts`. Prompt installation uses the
same `npm run install:clients` workflow as skills, agents, and hooks.

### Workflow Skill

`.agents/skills/a-b-agent-test/SKILL.md` owns interaction and orchestration. It:

1. resolves the target skill;
2. verifies that a maintained Waza suite and committed baseline exist;
3. asks only for unresolved run options;
4. invokes the comparison CLI;
5. reports the CLI verdict and evidence without replacing measured results
   with its own judgment.

The skill does not implement variant materialization, parse Waza JSON, or
calculate metrics.

### Comparison CLI

`npm run eval:compare -- <skill-name>` owns the experiment. It:

1. resolves the selected skill's deployed `SKILL.md` artifact;
2. copies the repository into two isolated temporary workspaces;
3. replaces only the baseline artifact with its `HEAD` contents;
4. rebuilds manifest-driven skill output inside the baseline workspace when
   required;
5. validates both variants and their shared Waza suite;
6. runs the same tasks and trial count against each variant;
7. writes Waza JSON results for both variants;
8. applies Waza's quality gate and comparison capabilities;
9. classifies the result and writes a normalized experiment report;
10. removes temporary workspaces while retaining ignored result evidence.

The command never checks out, resets, stages, commits, or otherwise mutates Git
state. The real working tree is read-only input.

## Experimental Controls

The two variants differ only in the selected deployed skill artifact. The eval
suite, fixtures, repository context, Waza version, model, judge model, task set,
trial count, and runner configuration remain identical.

The runner randomizes whether the baseline or candidate executes first to
reduce order bias. It records the order in the experiment report. Caching and
parallel task execution are disabled because either could obscure paired run
cost or introduce avoidable variance.

The report must confirm that both result files used the same resolved model,
provider, judge model, task IDs, trial count, and compatible Waza result schema.
A mismatch makes the experiment inconclusive.

For manifest-driven skills, the candidate must pass the repository's generated
drift check before comparison. This ensures the experiment measures the
artifact that would actually be installed.

## Metrics

The report keeps quality, runtime efficiency, and static context separate.

### Behavioral Quality

- task pass rate;
- grader pass rate and score where available;
- golden-task failures;
- task completion rate;
- per-task and per-trial outcomes.

### Runtime Efficiency

- input, output, and total runtime tokens;
- premium or provider request count;
- conversation turns;
- tool-call count and success rate;
- wall-clock duration;
- per-task and per-trial variance.

Judge and grader usage is excluded from skill runtime efficiency when Waza
reports it separately. When Waza exposes only combined execution and judging
usage, the report labels the metric as combined and does not claim a runtime
efficiency win from it.

### Static Context

The report includes the baseline and candidate instruction-token counts and
their delta. This is supporting evidence, not a substitute for measured runtime
usage.

## Verdicts

Verdicts follow a quality-gate-then-cost policy:

- `REGRESSION`: Waza reports any quality regression with zero tolerance, or a
  golden task fails.
- `EFFICIENT`: quality does not regress, runtime tokens improve by at least 5%,
  and request count does not increase.
- `QUALITY-SAFE / MIXED COST`: quality does not regress, but cost metrics
  disagree or runtime-token change is within 5%.
- `INCONCLUSIVE`: execution fails, required comparison metadata or telemetry is
  unavailable, variants are not comparable, or trial variance is too high for
  the aggregate difference to be meaningful.

The report always shows raw deltas. A verdict summarizes evidence; it never
hides a request, token, turn, tool-call, or quality regression.

## Failures and Boundaries

The command stops without model execution when:

- the target skill is missing or ambiguous;
- the target has no maintained Waza suite;
- the target has no committed `HEAD` artifact;
- generated output is stale;
- Waza is unavailable or below the minimum supported version;
- the eval suite is invalid;
- baseline and candidate resolve to identical artifact content.

Infrastructure and adapter failures remain distinct from behavioral failures.
Missing telemetry is reported as unavailable rather than inferred.

Local evidence is stored under an ignored results directory using a timestamped
experiment ID. Each experiment retains baseline results, candidate results,
the normalized comparison report, resolved configuration, execution order, and
tool versions. Prompts and tool payloads are retained only when already present
in Waza output and must follow Waza's redaction behavior.

## Validation Strategy

Deterministic tests use a fake Waza executable and fixture result JSON. The
smallest useful matrix covers:

- baseline materialization from `HEAD` without Git mutation;
- candidate materialization from working files;
- manifest-driven build and drift handling;
- exact Waza command construction and three-trial default;
- randomized execution order recorded in evidence;
- quality regression classification;
- efficient classification;
- quality-safe mixed-cost classification;
- inconclusive classification for mismatched metadata, missing telemetry, and
  excessive variance;
- separation of runtime usage from judge usage;
- temporary-workspace cleanup and retained result evidence;
- prompt catalog discovery and installation;
- slash prompt delegation to the workflow skill.

An opt-in live comparison against an existing suite validates the complete
integration. It remains outside `npm run check` because it consumes model calls
and is nondeterministic.

## Future Extensions

After the skill workflow proves useful, add adapters in this order:

1. custom agents, which Waza already supports as `.agent.md` targets;
2. hooks, using deterministic event fixtures before any model-graded layer;
3. arbitrary Git-ref comparisons;
4. optional historical trend reports across retained experiments.

These extensions must preserve the `/a-b-agent-test` contract and the
quality-first verdict policy.
