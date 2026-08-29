# Executable Planning Skill Design

## Summary

Convert the existing Executable Planner custom agent into a thin VS Code/Copilot adapter backed by a portable `executable-planning` skill. Initialize this repository as a statically checked Node.js project whose deterministic builder combines discrete project-owned planning rules, selected sections from a verbatim snapshot of Copilot's official Plan agent, and skill-specific material into a committed `SKILL.md`.

The reusable skill is the source of truth for planning behavior. The custom agent retains only harness-specific configuration, planning-only guardrails, and instructions to load the skill. This separation allows the custom agent to use more skills later without duplicating their workflows.

## Goals

- Make the planning workflow available as a project skill at `.agents/skills/executable-planning/SKILL.md`.
- Keep the custom agent at `.github/agents/executable-planner.agent.md` as a thin orchestrator that requires the skill.
- Preserve a verbatim local copy of the attached official Copilot Plan agent as a versioned input.
- Incorporate relevant official discovery, alignment, design, refinement, and plan-quality guidance without leaking VS Code-only tools or session paths.
- Preserve the existing Executable Planner rules for local plans, autopilot mode, domain phases, tangible outputs, checkpoints, deferred issues, and subagent-authored phase steps.
- Make generation deterministic, testable, and reusable for additional skills later.
- Commit the generated skill so compatible harnesses can discover it immediately after checkout.
- Provide an idempotent install script that symlinks the agent and skill into supported user-level client locations.
- Enforce source boundaries, manifests, frontmatter, imported transformations, and client mappings with static checks.

## Non-Goals

- Automatically update the local official Plan agent snapshot from VS Code internals or the network.
- Generate custom agents for every skill.
- Execute implementation plans or implement project work.
- Build a general-purpose Markdown rendering or templating framework.
- Preserve official-agent wording when it conflicts with the project-owned planning contract.

## Ownership Model

There are four artifact classes with deliberately different responsibilities:

| Artifact                                      | Responsibility                               |
| --------------------------------------------- | -------------------------------------------- |
| `sources/executable-planning/core.md`         | Canonical project planning behavior          |
| `sources/executable-planning/skill-only.md`   | Skill discovery and cross-harness adaptation |
| `vendor/copilot/Plan.agent.md`                | Byte-for-byte official-agent snapshot        |
| `.agents/skills/executable-planning/SKILL.md` | Built skill consumed by clients              |

The existing custom-agent body seeds `core.md` during migration. The custom-agent adapter changes independently when its tools, subagent access, handoffs, or required skills change.

## Repository Layout

```text
.
├── .agents/
│   └── skills/
│       └── executable-planning/
│           └── SKILL.md
├── .github/
│   └── agents/
│       └── executable-planner.agent.md
├── docs/
│   └── superpowers/
│       ├── plans/
│       └── specs/
├── sources/
│   └── executable-planning/
│       ├── core.md
│       ├── skill-only.md
│       ├── skill.json
│       └── transforms.json
├── scripts/
│   └── install-clients.ts
├── src/
│   ├── build-skills.ts
│   ├── check-customizations.ts
│   └── lib/
│       ├── frontmatter.ts
│       ├── manifests.ts
│       ├── markdown-sections.ts
│       ├── render-skill.ts
│       └── transforms.ts
├── test/
│   ├── build-skills.test.ts
│   ├── frontmatter.test.ts
│   ├── install-clients.test.ts
│   ├── markdown-sections.test.ts
│   ├── render-skill.test.ts
│   └── fixtures/
├── vendor/
│   └── copilot/
│       ├── Plan.agent.md
│       └── README.md
├── biome.json
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.json
```

## Node Project

Use npm, strict TypeScript, ECMAScript modules, and a supported Node.js LTS release declared in `package.json` through `engines.node`. Use Node's built-in `node:test` runner and `node:assert`, avoiding a separate test framework. Use `yaml` for structured YAML parsing and serialization. Use Biome for formatting and linting, and TypeScript with `noEmit` for static type analysis. Markdown handling remains deliberately narrow: heading-aware section extraction implemented with small project functions, not a full Markdown AST dependency.

The package is private and has no publishing lifecycle. Its scripts are:

- `npm run build`: generate every skill declared by the source manifests and write changed outputs.
- `npm test`: run unit and integration tests.
- `npm run format`: run Biome's safe writes over supported repository files.
- `npm run lint`: run Biome plus customization-specific static lint rules without writing.
- `npm run typecheck`: run strict TypeScript analysis without emitting files.
- `npm run check`: run lint, type analysis, tests, customization validation, and in-memory output drift checks.
- `npm run install:clients`: symlink the relevant artifacts into supported client locations.

Do not define an npm `install` lifecycle script because `npm install` would then mutate user configuration unexpectedly. The explicit `install:clients` command performs client installation.

## Skill Manifest

Each source skill has a `skill.json` manifest so the generator can support additional skills without hard-coded paths in its entry point. The executable-planning manifest declares:

- Skill name and output path.
- Skill discovery description, written as a triggering condition beginning with `Use when`.
- Ordered project-owned body fragments.
- Official-agent source path.
- Named official sections to import.
- Path to a finite list of exact, required transformations for imported sections.
- Required and forbidden output phrases used as semantic assertions.
- A section-ownership map assigning every output heading to exactly one source.

The manifest is configuration, not a free-form template language. Unsupported keys, duplicate inputs, duplicate section ownership, missing sections, or paths outside the repository fail validation.

## Composition Pipeline

Generation proceeds in a fixed sequence:

1. Discover `sources/*/skill.json` manifests in lexical order.
2. Validate each manifest and ensure its declared name matches its source and output folder names.
3. Parse project-owned Markdown fragments and the official agent snapshot.
4. Remove the official snapshot's YAML frontmatter before processing its body.
5. Extract only official sections named in the manifest. For the initial skill these cover Discovery, Alignment, Design, Refinement, and portable plan-quality guidance.
6. Apply the ordered exact-match operations in `transforms.json`. Every removal or replacement declares an expected match count. The build fails if the source does not match exactly, so an official snapshot change cannot silently alter the result. These operations remove or rewrite VS Code-specific tool references, `/memories/session/plan.md`, handoff behavior, editor-only commands, and statements whose behavior is owned by `core.md`.
7. Render skill frontmatter with only skill-compatible fields. The initial output contains `name` and `description`; agent-only fields such as `target`, `tools`, `agents`, and `handoffs` are forbidden.
8. Assemble the body in declared order: project core, normalized official guidance, then skill-only material.
9. Validate section ownership. No two inputs may contribute the same output heading, and imported official text may not contain phrases assigned to project core. There is no precedence resolution, fuzzy deduplication, or LLM step.
10. Compare or write the result.

All composition and transformation rules are declarative, finite, and statically testable. Identical inputs always produce byte-identical output.

## Planning Behavior

The generated skill preserves these project-owned requirements:

- Clarify the outcome, success criteria, scope, environment, interaction mode, and plan persistence before drafting when unresolved.
- Infer local persistence from `local plan` and infer unattended execution from `auto-run`, `autorun`, `autopilot`, `unattended`, and equivalent wording.
- Treat the plan artifact as the canonical state record and update it after every material implementation event.
- Use at least two conceptually domain-based phases, each iterative and ending in a tangible, independently reviewable output.
- Break phases into executable steps, with subagents responsible for step outlines unless the work is genuinely easy for one agent.
- Require user confirmation at every phase boundary in interactive mode.
- Use automated evidence-based gates in autopilot mode.
- Insert user-interest items as the immediate awaiting-user step at interactive checkpoints, and preserve deferred items at a named later phase or trigger.
- Maintain stable status markers, one current step, and exactly one next action while work is active.

The imported official guidance adds:

- A discovery, alignment, design, and refinement loop instead of assuming planning is linear.
- Repository research through read-only exploration before detailed design.
- Parallel discovery for independent domains when subagents are available.
- Explicit dependencies and parallelism between steps.
- Specific architecture references and scope boundaries.
- A scannable plan presentation in addition to persistence.
- Iteration until explicit approval in interactive mode.

Where the official guidance expects only a session memory plan, the project contract wins: local plans live under `plans/`, while non-local plans use the best persistent artifact available in the harness. Where the official guidance says phases are needed only for larger plans, the project contract wins: every plan has at least two domain phases.

## Thin Custom Agent

The custom agent retains its existing name, description, argument hint, tool permissions, subagent configuration, and model invocation settings unless implementation discovers an invalid field. Its body becomes concise and contains:

- A planning-only role and prohibition on implementation.
- `**REQUIRED SKILL:** Use executable-planning for all planning behavior.`
- A requirement to load any additional skills named by the agent before planning.
- Harness-specific notes that cannot live in the portable skill, such as preferred tools or handoffs.
- A fallback instruction to report inability to load the required skill rather than silently reproducing a stale embedded workflow.

The adapter does not duplicate the full workflow. This makes later skill additions an agent-composition change instead of another synchronization problem.

## Client Installation

`scripts/install-clients.ts` accepts `--client all`, `--client copilot`, `--client claude`, or `--client agents`. The default is `all`. It creates parent directories and absolute symlinks using this static mapping:

| Client                              | Repository artifact                          | User-level location                             |
| ----------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| VS Code and GitHub Copilot          | `.github/agents/executable-planner.agent.md` | `~/.copilot/agents/executable-planner.agent.md` |
| VS Code and GitHub Copilot          | `.agents/skills/executable-planning/`        | `~/.copilot/skills/executable-planning/`        |
| Claude Code                         | `.agents/skills/executable-planning/`        | `~/.claude/skills/executable-planning/`         |
| Cross-client Agent Skills consumers | `.agents/skills/executable-planning/`        | `~/.agents/skills/executable-planning/`         |

Installation is idempotent when a destination already links to the expected source. It refuses to replace a regular file, directory, or unrelated symlink and reports the exact conflict. It does not require elevated privileges and supports an injectable home directory for tests. The README documents any client reload, discovery, invocation, or configuration step required after linking. If a client cannot consume one of these formats directly, the README states that boundary instead of implying support.

## Official Snapshot Provenance

`vendor/copilot/Plan.agent.md` stores the attachment verbatim, including frontmatter and VS Code-specific references. `vendor/copilot/README.md` records:

- Source: built-in GitHub Copilot Plan custom agent supplied from VS Code.
- Capture date: 2026-08-28.
- Upstream version: not provided by the source attachment.
- Update procedure: replace the snapshot intentionally, run `npm run build`, inspect the generated diff, and run `npm run check`.

The generator must fail when a manifest-requested heading is absent. An upstream structural change therefore requires an explicit adaptation rather than silently dropping guidance.

## Error Handling

Build and check commands fail with actionable messages for:

- Missing, malformed, or unsupported manifest fields.
- Invalid YAML frontmatter.
- Missing input or output paths.
- Skill names that do not match directory names or the Agent Skills naming rules.
- Missing or duplicate requested Markdown headings.
- An exact transformation whose required match count changes after an official snapshot update.
- Duplicate output headings or source-ownership violations.
- Forbidden agent-only fields or VS Code-specific tokens in generated `SKILL.md`.
- Missing required semantic phrases.
- Generated drift during `npm run check`.
- Invalid or colliding installation targets.

Errors identify the manifest, source file, and section or rule involved. Build validates every skill before writing any output so a failure cannot leave a partially updated set. Biome lint and strict TypeScript checks run before repository validation. Custom static lint rules enforce schemas and cross-document invariants that general source linting cannot express.

## Testing Strategy

Development follows test-first slices using Node's built-in test runner:

1. Frontmatter tests cover valid parsing, malformed YAML, delimiter handling, and agent-field filtering.
2. Markdown-section tests cover heading extraction, nested content, fenced-code headings, duplicate headings, and missing headings.
3. Transformation tests use a compact official-agent fixture to prove exact match counts, removal of tool references, session paths, UI handoffs, and core-owned statements while retaining imported planning semantics.
4. Renderer tests prove fixed composition order, unique section ownership, frontmatter validity, deterministic output, and required/forbidden phrase assertions.
5. Integration tests build the executable-planning fixture and compare it byte-for-byte with an expected `SKILL.md`.
6. Repository-level checks build the real skill in memory and compare it with the committed output.
7. Customization validation checks that the generated skill's folder matches its frontmatter name and that the custom agent explicitly requires the skill without duplicating canonical sections.
8. Installer tests use temporary home directories to cover every client mapping, idempotence, missing parents, spaces in paths, and refusal to overwrite files, directories, or unrelated links.
9. Static checks run Biome, strict TypeScript, manifest validation, frontmatter validation, forbidden-token scans, link-target validation, and section-ownership validation.

Skill behavior should also be tested with pressure scenarios after generation: first record baseline planning failures without loading the skill, then run equivalent scenarios with the skill and verify compliance with interaction mode, persistence, phase, checkpoint, and deferral rules. If the current harness cannot isolate a no-skill baseline reliably, retain scenario fixtures and document that manual behavioral verification remains outstanding rather than claiming it passed.

## Documentation

The repository README explains:

- The source-of-truth model.
- How agents install dependencies, build, test, format with Biome, and check drift.
- How to update the official snapshot.
- How to add another generated skill and reference it from a custom agent.
- How to run `npm run install:clients` for each supported client.
- Any reload, discovery, invocation, or configuration steps required to make the symlinked agent and skill usable.
- Which artifact each client can consume and known client limitations.

Documentation is written for agents performing maintenance and humans reviewing results. Build outputs contain only the client-facing skill content and no maintenance notices.

## Delivery Phases

Implementation should produce tangible results in three domain-based phases:

1. **Build foundation:** an initialized strict TypeScript Node project with Biome, tested parsing, extraction, exact transformations, rendering, and static drift-check infrastructure.
2. **Planning knowledge package:** checked-in source documents and official snapshot that generate a valid portable skill with the merged behavior.
3. **Client integration and maintainability:** a thin custom agent that requires the skill, idempotent client symlink installation, complete documentation, behavioral scenarios, and a passing repository-wide check.

Each phase ends with automated validation and an interactive user checkpoint before implementation continues.

## Success Criteria

- A clean checkout can run `npm install`, `npm run format`, and `npm run check` successfully on the declared Node version, with the formatting diff inspected before completion.
- `npm run build` is idempotent.
- Editing a source input and running `npm run check` without rebuilding reports generated drift.
- The committed skill has valid Agent Skills frontmatter, is located at `.agents/skills/executable-planning/SKILL.md`, and contains no forbidden agent-only frontmatter or VS Code-specific tool/session references.
- The generated skill includes both the project planning contract and the normalized official planning loop.
- The custom agent requires the generated skill and no longer duplicates its canonical workflow.
- Replacing or structurally changing the official snapshot causes either a deliberate generated diff or a clear build failure.
- A second skill can be added through a new source directory and manifest without modifying the generator entry point.
- `npm run install:clients` creates the documented links, is idempotent, and never overwrites an unrelated destination.
- The README contains all non-link steps required for each supported client to discover and use its installed artifact.
- Biome, strict TypeScript, and customization-specific linting pass after the final formatting run.

## Decisions

- Use `.agents/skills/executable-planning/` as the committed cross-harness target.
- Make reusable skill behavior canonical; keep the custom agent thin.
- Merge the official Plan agent into the generated skill only, not into the custom-agent body.
- Vendor the official Plan agent verbatim and adapt it during deterministic generation.
- Use manifest-driven, single-owner section composition with exact required transformations; do not use embedded source markers, fuzzy cleanup, precedence rules, or an LLM.
- Initialize an npm strict TypeScript project with ESM, `yaml`, Biome, and the built-in test runner.
- Commit generated output and enforce drift with `npm run check`.
- Install through an explicit idempotent symlink command rather than the npm install lifecycle.
