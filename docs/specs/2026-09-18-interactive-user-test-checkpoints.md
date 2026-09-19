# Interactive User-Test Checkpoints

## Goal

Make interactive executable plans capture independent, user-observed evidence
at meaningful testable boundaries. The Plan Executor must stop for that
evidence before it accepts a phase as ready to continue.

## Scope

This changes the executable-planning skill and Executable Planner agent, the
Plan Executor skill and agent, and their focused contract and behavioral
tests. It does not change autopilot behavior or require user testing for
internal-only work with no independently observable boundary.

## Planner Behavior

For each interactive phase, the planner evaluates whether the phase's
tangible output has a user-testable boundary that is meaningfully independent
of the executor's likely checks. Examples include a complete end-to-end
workflow, a visible UI state or interaction, or an externally observable
operation.

When one exists, the phase's checkpoint must include a User Test with:

- A concrete action the user can invoke themselves.
- A free-text observation prompt asking what occurred or what is displayed.
- No proposed expected outcome, multiple-choice answer, or simple
  confirmation prompt.
- A stated relationship to the phase completion criteria.

The planner must prefer such a test over repeating the executor's test,
lint, typecheck, or build commands. When no meaningful independent user test
is possible, it records that fact and the reason in the phase checkpoint; the
normal confirmation is then the fallback.

Autopilot plans contain no user-test checkpoint and retain their automated
go/no-go phase gates.

## Executor Behavior

After the executor completes a phase's prescribed validation in interactive
mode, it checks the phase checkpoint.

For a User Test checkpoint, the executor updates the canonical plan, stops,
and asks the user to perform the documented action and report their observed
result in free text. It must not suggest what the user should see or accept a
bare confirmation as the preferred evidence. It records the user response as
user-provided evidence, compares it with the completion criteria, and raises
a blocker or clarification question when the observation contradicts them or
is insufficient to determine the result.

Only after the user-test evidence is recorded and accepted does the executor
offer the existing phase continuation, revision, or pause prompt. A phase
without a viable User Test follows the existing confirmation checkpoint after
recording its unavailable rationale.

Whenever completing an operation or step while the plan is not yet complete in
interactive mode:

- If there are actions ready for manual user testing, the executor must prompt
  the user to perform them.
- If there is nothing yet to have the user test, the executor must state "No
  checkpoint tests yet."

## Plan Format

Interactive phase checkpoints gain an explicit field:

```markdown
### Checkpoint

- User Test: <action the user performs, or unavailable>
- Observation prompt: <free-text question, omitted when unavailable>
- Independent evidence: <why this differs from executor validation, or why unavailable>
```

The execution protocol requires the executor to honor these fields. The
canonical plan records the action requested, the user-provided observation,
and the disposition against completion criteria without duplicating the
executor's validation output.

## Validation

Focused contract tests will assert that planner guidance requires conditional
user-test checkpoints with open-ended observation prompts and unavailable
rationales, and that the executor stops to gather and record user evidence
before phase continuation. Behavioral Waza tasks will pressure the planner
to create a UI or end-to-end test checkpoint without supplying an expected
answer, and pressure the executor to halt for the observation rather than
proceeding after mechanical validation alone.

Run the affected skill tests and build drift check after regenerating the
manifest-built planner artifact. Run the Plan Executor Waza suite if its
existing task structure supports the new checkpoint behavior.

## Risks

- A mandatory manual test for every phase would create low-value prompts for
  refactors and documentation-only changes; the unavailable rationale avoids
  this.
- A yes/no prompt could be completed without actual testing; open-ended
  observed-result prompts make the evidence dependent on user interaction.
- User evidence can be ambiguous; the executor must request clarification
  rather than treating it as passing evidence.
