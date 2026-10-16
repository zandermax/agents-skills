---
name: project-history
description: Sets up Git decision changelogs, branch inventories, and pre-push guards.
---

# Project history

The script assets provided with this skill are source assets. No target project is protected until the one-time installation is completed. Do not claim that checks or hooks are active before target-specific installation and validation.

Read `references/contract.md` before installing the skill. It defines the document syntax, timestamp semantics, branch coverage, domain splitting, CLI behavior, and hook integration.

## Script assets

| Relative to this skill                 | Purpose                                                                                            | Copy into the target project                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `scripts/check-project-history.mjs`    | Read-only Git status, history and branch validation, plus startup branch-count warning             | `scripts/project-history/check-project-history.mjs`    |
| `scripts/pre-push-project-history.mjs` | Validate committed history before allowing a push; reuse the checker without invoking another hook | `scripts/project-history/pre-push-project-history.mjs` |
| `scripts/record-history.mjs`           | Automatically record unrecorded commits, update branch inventory, and commit prospective snapshot  | `scripts/project-history/record-history.mjs`           |

Script assets must be self-contained: Node.js built-ins and Git only; no external package dependencies or imports.

## One-time installation into a target project

1. Read the target project's existing guidance, history, and hook configuration. Discover its root, all local and remote-tracking branches, and reachable commits from the existing local repository state (it is acceptable that remote-tracking branches may be stale without fetching). Do not fetch, commit, push, or change unrelated configuration. If the checks are already installed, inspect their existing contract and stop rather than creating a competing changelog.
2. Verify all three script assets exist in the skill's `scripts/` directory (located under the skill directory, e.g. `<skill-dir>/scripts/`, `~/.claude/skills/project-history/scripts/`, or `~/.agents/skills/project-history/scripts/`). If any script asset or references/contract.md is missing, stop, report which file is absent, and do not install anything partially. Copy those scripts into `scripts/project-history/` in the target project.
3. Create `PROJECT_HISTORY.md` using the contract. Put `## Git status` before `## Log`. In `## Git status`, specify `Updated at`, `Main branch`, and `Branch warning threshold`. Use UTC Git committer datetimes on the snapshot and every decision entry. Only consider the remote state: do not include non-remote pushed local branches and do not specify separate remote and local branches. In each branch record, include `branchName`, `committedAt`, `subject`, `status`, `planningDoc`, and show `ref` last. If the local branch has unpushed changes relative to the remote branch, mark it in `branchName` as `<branch> [unpushed changes]`. In each log entry, include `committedAt`, `subject`, and `decisions` (an array of strings). Decisions must come from agent conversations, not git messages, and must not contain the git message (which is redundant and superfluous). A commit may have multiple decisions, one, or none (`decisions: []`). Record worthwhile decisions that benefit future work, explicitly mentioning the domain (e.g. skill, feature, architecture, tooling). Phrase each decision as a sentence following "in this project for the work being done for this commit, it was decided that..." (e.g. "the project-history skill should block adding more than a specific number of branches, using a pre-push git hook"), not conventional commit style. Format the JSON as a readable array with one key-value pair per line. Each branch's `status` must be one of:
   - `removal candidate`: when the plan doc that relates to it is complete and archived, and the branch has been merged into the main branch
   - `in active development`: when there is an active plan doc that relates to it on its own branch
   - `ready to merge`: when it has a plan that is complete but has not been merged to the main branch
   - `no related plan`: when there is not a plan that relates to that branch
     `planningDoc` is the relative path to the markdown file that relates to the branch, or `"(none)"` if none found. Use a configurable branch-warning threshold of 10 unless the project already specifies another value.
4. When installing project history, do not populate commits that have not been part of the current conversation. Any previously-existing commits without immediate context should not be recorded. Instead, include a note in the history document under `## Log` (e.g. `Note: Commits prior to this point do not have recorded historical context.`) documenting that commits prior to that point do not have recorded historical context. Record only commits from the current conversation (such as the initial setup commit), recording worthwhile decisions reached in conversation (or `decisions: []` if none) following the domain-specific phrasing guidelines. Preserve existing decision history if project history was already established.
5. Split the log when it exceeds 200 entries or 32 KiB (either condition triggers the split). Separate it into project-domain documents under `docs/project-history/`, similar to domain memories. Choose domains from top-level project areas and record them in the root index, linking every domain and retaining one entry per commit without duplication. All recorded historical context remains reachable from that index.
6. Add the following guidance to **every existing project AGENTS.md**, including nested and case-insensitive variants. Discover them during installation, excluding dependencies, generated output, and `.git`; preserve unrelated instructions. If no AGENTS.md exists, create one at the repository root containing only the guidance below. If the repository has no commits or is a shallow clone, report this to the user and stop before installing. Replace the sample threshold only if the project chooses another value.
7. Install the Git hooks into the project, preserving all existing checks:
   - `post-commit`: `[ ! -f scripts/project-history/record-history.mjs ] || node scripts/project-history/record-history.mjs --amend`
     Automatically amends each commit to record its own entry and updated branch inventory into `PROJECT_HISTORY.md` without requiring manual history recording. The script automatically and safely skips amending during active rebases, merges (`MERGE_HEAD`), cherry-picks (`CHERRY_PICK_HEAD`), reverts, bisects, or on multi-parent merge commits.
   - `pre-push`: `[ ! -f scripts/project-history/pre-push-project-history.mjs ] || node scripts/project-history/pre-push-project-history.mjs "$@"`
     Validates history before push. If unrecorded commits exist, it automatically synchronizes them into `PROJECT_HISTORY.md` so pushing always succeeds seamlessly. If removal candidate branches or other unpushed branches exist, it presents cleanup commands as advice without blocking the push.
   - When a hook manager is configured (such as `simple-git-hooks` or `husky`), add both commands and run the hook manager's install command (e.g. `npx simple-git-hooks`) to install the hooks into Git.
   - When no hook manager is configured, install `.git/hooks/post-commit` and `.git/hooks/pre-push` directly (or under `core.hooksPath` if configured) with executable permissions (`chmod +x`), ensuring they pass arguments and stdin to the respective scripts.
   - Do not install a pre-commit history validator: the prospective snapshot does not match Git until its commit exists.
8. Run `node scripts/project-history/record-history.mjs` (passing `--decision <text>` for any worthwhile decisions reached in conversation, or omitting if none) to record history and create the prospective snapshot commit automatically. Then run the checker and exercise the installed pre-push entry point locally with actual ref-update input, without pushing. Do not claim installation validation before this passes.

## Guidance to add to each AGENTS.md

```markdown
## Project history and startup validity

- At startup, read `PROJECT_HISTORY.md` and run `node scripts/project-history/check-project-history.mjs --startup`. Warn if the remote branch warning threshold is exceeded, and report if validation fails.
- Before pushing or concluding tasks that introduce commits, run `node scripts/project-history/record-history.mjs` to record decisions and synchronize the history ledger. Decisions come from conversation (not git messages), must not contain the git message, and may be multiple, one, or none.
- Record worthwhile decisions that benefit future work. Explicitly name the domain (e.g. skill, feature, architecture, tooling). Phrase each decision as a sentence following "in this project for the work being done for this commit, it was decided that..." (e.g. "the project-history skill should block adding more than a specific number of branches, using a pre-push git hook"), not conventional commit style.
```

## Scope boundaries

This skill sets up project history once; it does not auto-commit, auto-push, rewrite Git history, manufacture decisions, delete branches, or continuously reinstall itself. Routine history maintenance is governed by the installed AGENTS.md instructions. Branch warnings are advisory, not approval gates. Invalid committed history blocks pushes until it is repaired in a commit.
