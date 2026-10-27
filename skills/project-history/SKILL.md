---
name: project-history
description: Sets up Git decision changelogs, branch inventories, and pre-push guards.
---

# Project history

The script assets provided with this skill are source assets. No target project is protected until the one-time installation is completed. Do not claim that checks or hooks are active before target-specific installation and validation.

Read `references/contract.md` before installing the skill. It defines the YAML syntax, timestamp semantics, branch coverage, domain splitting, CLI behavior, and hook integration.

## Script assets

Copy **every file below** from this skill's `scripts/` directory into the target's `scripts/project-history/`, preserving basenames and relative imports. The three entry points alone are not an installation.

| Source asset                           | Purpose                                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| `scripts/check-project-history.mjs`    | Read-only validation and startup branch-count warning       |
| `scripts/pre-push-project-history.mjs` | Pre-push validation, synchronization, and advisory cleanup  |
| `scripts/record-history.mjs`           | Recording CLI entry point                                   |
| `scripts/history-document-data.mjs`    | Parse and validate the YAML history schema                  |
| `scripts/history-document-parse.mjs`   | YAML fields, record mapping, and canonical dates            |
| `scripts/history-document-format.mjs`  | Canonical snake_case YAML serialization                     |
| `scripts/history-document-io.mjs`      | Repository-contained working and committed document reads   |
| `scripts/history-domain-log.mjs`       | Inline logs and safe domain paths                           |
| `scripts/history-entry-validation.mjs` | Dates, decisions, branch inventory, and commit multiplicity |
| `scripts/history-git.mjs`              | Repository discovery and Git metadata                       |
| `scripts/history-sync.mjs`             | Synchronize unrecorded commits and branch inventory         |
| `scripts/history-validation.mjs`       | Aggregate index and domain validation                       |
| `scripts/record-history-helpers.mjs`   | CLI arguments, branch metadata, and YAML writes             |
| `scripts/record-history-input.mjs`     | Read existing history and identify unrecorded commits       |
| `scripts/record-history-operation.mjs` | Prospective recording and guarded post-commit amendment     |
| `scripts/yaml.mjs`                     | Bundled standalone YAML parser and serializer               |
| `scripts/yaml.LICENSE`                 | Bundled parser's ISC copyright and permission notice        |

Runtime assets require Node.js built-ins, the bundled `yaml.mjs`, and Git only; no target-project package dependencies. Keep the parser attribution and `yaml.LICENSE` with every installed copy.

## One-time installation into a target project

1. Read the target project's existing guidance, history, and hook configuration. Discover its root, all local and remote-tracking branches, and reachable commits from existing local repository state; remote-tracking branches may be stale without fetching. Do not fetch, commit, push, or change unrelated configuration during discovery. If checks are already installed, inspect their contract and stop rather than creating a competing changelog. If the repository has no commits or is shallow, report this and stop before installing.
2. Verify `references/contract.md` and **all files in the asset table** exist under the skill directory (for example, `<skill-dir>/scripts/`, `~/.claude/skills/project-history/scripts/`, or `~/.agents/skills/project-history/scripts/`). If anything is missing, report the exact file and stop without installing partially. Copy the complete asset set to `scripts/project-history/`, including every transitive helper and the parser's notice.
3. Create `PROJECT_HISTORY.yaml` using the contract. Its top-level `status` mapping precedes `log` (or `domains`). Include `updated_at`, `main_branch`, `branch_warning_threshold`, and `branches`. Use UTC Git committer datetimes. Only inventory remote-tracking refs; exclude separate local branch records, tags, and symbolic refs. Each branch contains `branch_name`, `committed_at`, `subject`, `status`, `planning_doc`, and `ref` last. Mark local unpushed changes as `<branch> [unpushed changes]` in `branch_name`. Default the configurable warning threshold to 10 unless the project specifies otherwise. Each branch's `status` must be:
   - `removal candidate`: its plan is complete and archived, and the branch is merged into main.
   - `in active development`: an active plan relates to the branch on its own branch.
   - `ready to merge`: its plan is complete but the branch is not merged into main.
   - `no related plan`: no plan relates to the branch.

   Set `planning_doc` to the repository-relative plan Markdown path or `"(none)"`.

4. Each log record contains `committed_at`, the exact Git `subject`, and a `decisions` array with multiple, one, or no decisions (`decisions: []`). Decisions come from agent conversations, never Git messages, and must not contain the Git message. Record worthwhile decisions that benefit future work and explicitly name their domain (skill, feature, architecture, tooling). Phrase each as a sentence completing "in this project for the work being done for this commit, it was decided that..." without the introductory text; for example, "the project-history skill should block adding more than a specific number of branches, using a pre-push git hook", not a conventional commit message.
5. Do not populate previously existing commits that were not part of the current conversation. Put `# Note: Commits prior to this point do not have recorded historical context.` before `log` (or `domains`) to document that boundary. Record only commits from the current conversation, such as initial setup, without manufacturing old decisions. Preserve existing decision history.
6. Split the log when it exceeds 200 entries or 32 KiB (either triggers splitting). Use `docs/project-history/<domain>.yaml` and a root `domains` list, choosing domains from top-level project areas. Keep one entry per commit without duplication and all history reachable from the root index. Read all indexed domains before work.
7. Add the guidance below to **every existing project AGENTS.md**, discovering case-insensitive and nested variants while excluding dependencies, generated output, and `.git`. Preserve unrelated instructions. If none exists, create only the root guidance.
8. Install the Git hooks through the existing mechanism, preserving every existing check:
   - `post-commit`: `[ ! -f scripts/project-history/record-history.mjs ] || node scripts/project-history/record-history.mjs --amend`
     Amends each commit to record its entry and branch inventory in `PROJECT_HISTORY.yaml`. Safely skips during active rebases, merges (`MERGE_HEAD`), cherry-picks (`CHERRY_PICK_HEAD`), reverts, bisects, and multi-parent merge commits; avoids recursive amendment.
   - `pre-push`: `[ ! -f scripts/project-history/pre-push-project-history.mjs ] || node scripts/project-history/pre-push-project-history.mjs "$@"`
     Synchronizes unrecorded history and validates before push. Removal candidates and other unpushed branches produce advisory commands, not branch-cleanup approval gates. Unrecoverable validation failures still fail closed.
   - For hook managers such as `simple-git-hooks` or `husky`, update both commands and run the manager's install command.
   - Otherwise install executable `.git/hooks/post-commit` and `.git/hooks/pre-push`, or use the configured `core.hooksPath`, passing arguments and stdin to the scripts.
   - Do not install a pre-commit history validator: the prospective snapshot cannot match Git until its commit exists.
9. If the target has a root `package.json`, add `"history:record": "node scripts/project-history/record-history.mjs"` to `scripts`, preserving unrelated commands, so recording is available through `npm run history:record`.
10. Run `node scripts/project-history/record-history.mjs` with `--decision <text>` for worthwhile decisions from conversation, or omit decisions if none. This creates the prospective snapshot commit. Then run the checker and exercise the installed pre-push entry point locally with actual ref-update input, without pushing. Do not claim installation validated unless both pass.

## Guidance to add to each AGENTS.md

```markdown
## Project history and startup validity

- At startup, read `PROJECT_HISTORY.yaml` and all indexed domains, and run `node scripts/project-history/check-project-history.mjs --startup`. Warn if the remote branch warning threshold is exceeded, and report if validation fails.
- Before pushing or concluding tasks that introduce commits, run `node scripts/project-history/record-history.mjs` to record decisions and synchronize the history ledger. Decisions come from conversation (not Git messages), must not contain the Git message, and may be multiple, one, or none.
- Record worthwhile decisions that benefit future work. Explicitly name the domain (e.g. skill, feature, architecture, tooling). Phrase each decision as a sentence completing "in this project for the work being done for this commit, it was decided that..." without that intro text, not a conventional commit message.
```

## Scope boundaries

This skill installs project history once. Outside the authorized installation and installed hooks, it does not autonomously commit, push, rewrite history, manufacture decisions, delete branches, or continuously reinstall itself. Routine maintenance follows the installed AGENTS.md. Branch warnings are advisory; invalid history fails validation. Source assets alone never activate target startup checks or hooks.
