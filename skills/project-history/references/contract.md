# Project history contract

This is the behavioral contract for the script assets.

## Assets and commands

| Skill source asset                     | Installed destination                                  |
| -------------------------------------- | ------------------------------------------------------ |
| `scripts/check-project-history.mjs`    | `scripts/project-history/check-project-history.mjs`    |
| `scripts/pre-push-project-history.mjs` | `scripts/project-history/pre-push-project-history.mjs` |
| `scripts/record-history.mjs`           | `scripts/project-history/record-history.mjs`           |

The scripts must run with Node.js and Git alone, without project dependencies. Find the repository root using Git, not the caller's working directory. Do not change files, refs, the index, Git configuration, or remote state (except `record-history.mjs` which stages and commits history updates).

- `node scripts/project-history/check-project-history.mjs`: validate working-tree history documents against actual local Git metadata. Print the actual `git status --short --branch` output and validation results. Exit 0 on success, 1 on invalid or missing history.
- `node scripts/project-history/check-project-history.mjs --startup`: the same check, also emitting a warning when the actual branch count is strictly greater than the configured threshold. A warning alone does not fail validation. Count actual refs even when the recorded snapshot is stale; emit the warning before the validation summary.
- `node scripts/project-history/pre-push-project-history.mjs <remote-name> <remote-url>`: a Git pre-push entry point accepting standard ref-update lines on stdin. For a push containing at least one non-deletion update, automatically synchronizes any unrecorded commits into `PROJECT_HISTORY.md` and validates history before pushing. If any branch in the committed inventory is marked `removal candidate`, or if other branches have unpushed changes, it outputs helpful advisory notices and commands to delete candidate branches without blocking the push. Exit 0 for a successful push, deletion-only push, or no updates; exit 1 only on unrecoverable format or repository corruption. Never contact the remote or perform a push.
- `node scripts/project-history/record-history.mjs [--subject <subject>] [--decision <decision>] [--domain <domain>] [--no-commit]`: automatically discover unrecorded reachable commits, format them into `PROJECT_HISTORY.md` along with the prospective snapshot commit and updated branch inventory, and create the commit with matching UTC committer timestamp. Exit 0 on success, 1 on failure.

The committed HEAD document is the canonical cross-branch inventory, including branches other than HEAD being pushed. This does not require every older branch tip to contain today's inventory. Missing `HEAD` or documents, malformed input/documents, and Git/read failures must fail closed with actionable stderr, not a successful empty result. Diagnostics name the offending field, ref, document, or commit subject. Use exit 1 for validation errors.

## Changelog document

The root document is `PROJECT_HISTORY.md`. Its Git status section must precede its log section:

````markdown
# Project history

## Git status

Updated at: 2026-10-09T12:00:00Z
Main branch: main
Branch warning threshold: 10

```json
[
  {
    "branchName": "main",
    "committedAt": "2026-10-09T12:00:00Z",
    "subject": "Record history contract",
    "status": "no related plan",
    "planningDoc": "(none)",
    "ref": "refs/remotes/origin/main"
  }
]
```

## Log

Note: Commits prior to this point do not have recorded historical context.

```json
[
  {
    "committedAt": "2026-10-09T12:00:00Z",
    "subject": "Record history contract",
    "decisions": [
      "the project-history skill contract should use UTC committer timestamps so the history snapshot is reproducible."
    ]
  }
]
```
````

Format the JSON blocks to be readable, with one key-value pair per line (formatted JSON arrays or objects; both `json` and `jsonl` code blocks are supported). In each branch record, include `branchName`, and show `ref` last (`branchName`, `committedAt`, `subject`, `status`, `planningDoc`, `ref`). If the local branch has unpushed changes relative to the remote branch, mark it in `branchName` as `<branch> [unpushed changes]`. In each log entry, include `committedAt`, `subject`, and `decisions` (an array of zero or more strings). Decisions must come from agent conversations, not git messages, and must not contain the git message (which is redundant and superfluous). Record worthwhile decisions that benefit future work, explicitly mentioning the domain (e.g. skill, feature, architecture, tooling). Phrase each decision as a sentence following "in this project for the work being done for this commit, it was decided that..." (e.g. "the project-history skill should block adding more than a specific number of branches, using a pre-push git hook"), not conventional commit style. There may be multiple decisions, one decision, or none (`"decisions": []`). Preserve the exact Git subject.

When project history is installed into an existing repository, commits prior to that point without immediate context are not populated into the log; instead, a note under `## Log` documents that commits prior to that point do not have recorded historical context.

### Dates and identity

- Dates are valid UTC timestamps with second precision, exactly `YYYY-MM-DDTHH:mm:ssZ`. Reject impossible calendar dates and other date formats.
- `committedAt` is the Git **committer** timestamp converted to UTC, not the author date or the time the script ran.
- `Updated at` equals the newest log timestamp across all domains. The inline log, or each domain log, is newest first; equal timestamps are allowed. Retained history may be newer than the surviving branch tips.
- From the earliest recorded commit forward, cover each unique commit object reachable from the branch inventory exactly once, including merge commits. Shared ancestors are counted once. For each reachable `(committedAt, subject)` pair since recorded history began, require exactly Git's count of unique commit objects: distinct commits with the same timestamp and subject still require separate log lines. Reject missing entries and surplus copies of reachable entries. Retain other recorded history when branches are deleted or rewritten; do not require deleting historical decisions just because their Git objects are no longer reachable. Dates and decision syntax remain validated on retained entries, but their original Git metadata cannot always be verified after garbage collection.
- Do not store the current commit's object hash in its own document: that would be self-referential. Matching dates, exact subjects, and multiplicity avoids this circularity. It cannot distinguish decisions assigned to two commits with identical dates and subjects; such commits should use distinct subjects when their decisions differ.

### Branch snapshot

Only consider the remote state: do not track separate remote and local branches. Exclude non-remote pushed local branches, tags, and symbolic refs such as `refs/remotes/origin/HEAD`. Include each remote-tracking ref with its tip's exact subject, UTC committer date, status, planningDoc, and branchName. Show `ref` last in each branch record (`branchName`, `committedAt`, `subject`, `status`, `planningDoc`, `ref`). If a local branch has unpushed changes relative to the remote branch, mark it in `branchName` as `<branch> [unpushed changes]`. The `[unpushed changes]` suffix is an advisory snapshot of local push status; validation checks the base branch name so local commits and pushes do not falsely invalidate the inventory. Require one record per ref, with no missing, extra, or duplicate refs. Inventory order is immaterial. Include branch names in mismatch diagnostics.

Branch `status` must be one of:

- `"removal candidate"`: when the plan doc that relates to it is complete and archived, and the branch has been merged into the main branch
- `"in active development"`: when there is an active plan doc that relates to it on its own branch
- `"ready to merge"`: when it has a plan that is complete but has not been merged to the main branch
- `"no related plan"`: when there is not a plan that relates to that branch

`planningDoc` is the repository-relative path to the markdown file that relates to the branch, or `"(none)"` if none found.

When pushing to the main branch:

- If other branches have unpushed changes, pre-push prints an advisory notice listing them.
- If any branch in the committed inventory is marked `"removal candidate"`, pre-push prints the commands to delete the candidate branches as advice. Pushing is not blocked by removal candidates.

The warning threshold is a nonnegative integer. Default installation value: 10. Warn only when the actual inventory count exceeds it, not when it equals it. The startup warning includes the actual count and threshold. A stale snapshot must not suppress this warning.

The status section is a committed branch inventory, not a promise that the working tree is clean. Persisting a clean/dirty `git status` result would invalidate itself as soon as the document is edited. Instead, the startup command prints current working-tree status separately.

Changing refs, including a fetch or push updating remote-tracking branches, can make the inventory stale. Report this at startup and refresh it in the next recorded commit; never silently mutate a committed snapshot or pretend it is a live view.

## Domain split

When the log becomes difficult to read (installation guideline: over 200 entries or 32 KiB), split entries into meaningful project domains. Keep `PROJECT_HISTORY.md` as the single status and context index. Replace its inline log with explicit links:

```markdown
## Log

Domains:

- [Banking](docs/project-history/banking.md)
- [Tooling](docs/project-history/tooling.md)
```

Each domain document contains a `## Log` section with the same JSONL records and ordering rules. Read every linked domain before work. Each commit belongs to exactly one domain; cross-domain commits go in the best-fitting domain and describe the cross-domain decision. Never duplicate entries or discard old history.

Resolve domain links relative to the repository root. Require unique paths under `docs/project-history/` ending in `.md`; reject traversal, absolute paths, missing documents, duplicate links, and symlinks escaping the repository. The index must contain either one inline log or domain links, never both. Validation aggregates all domains for completeness and the latest timestamp. Pre-push reads the index and domains from committed HEAD, not from the filesystem.

## Recording a new commit without a hash cycle

Before creating a commit, select its exact one-line subject and UTC committer timestamp. Add its decision line and update the snapshot for the branch being committed to using that subject and timestamp; retain the other current refs. Set `Updated at` to the maximum timestamp across the complete log. Create the commit with that exact subject and `GIT_COMMITTER_DATE`, then validate. The prospective snapshot will temporarily disagree with Git before that commit; do not install a pre-commit validator that makes the commit impossible.

To automate this workflow, run `node scripts/project-history/record-history.mjs`. It discovers all unrecorded reachable commits, updates the branch inventory and timestamps, stages `PROJECT_HISTORY.md`, and creates the prospective commit with matching committer dates and subjects automatically.

If history was not present in the commit that originally introduced it, bootstrap it in a new commit using this same prospective-snapshot procedure. Record commits from the current conversation without fabricating or importing older historical decisions, noting in the document that earlier commits lack recorded historical context.

## AGENTS.md and hook installation

At installation time, update every existing project `AGENTS.md` (case-insensitive name discovery, excluding Git metadata, dependencies, and generated output). Preserve unrelated content and any existing hooks. Add concise instructions:

- At startup, read `PROJECT_HISTORY.md` and run `node scripts/project-history/check-project-history.mjs --startup`. Warn if the remote branch warning threshold is exceeded, and report if validation fails.
- Before pushing or concluding tasks that introduce commits, run `node scripts/project-history/record-history.mjs` to record decisions and synchronize the history ledger. Decisions come from conversation (not git messages), must not contain the git message, and may be multiple, one, or none.
- Record worthwhile decisions that benefit future work. Explicitly name the domain (e.g. skill, feature, architecture, tooling). Phrase each decision as a sentence following "in this project for the work being done for this commit, it was decided that..." (e.g. "the project-history skill should block adding more than a specific number of branches, using a pre-push git hook"), not conventional commit style.

Install the Git hooks through the project's existing hook mechanism (e.g. `simple-git-hooks`, `husky`, `.git/hooks`, or custom `core.hooksPath`), preserving existing checks (such as pre-commit):

- `post-commit`: `[ ! -f scripts/project-history/record-history.mjs ] || node scripts/project-history/record-history.mjs --amend`
  Automatically amends each commit to record its own entry and updated branch inventory into `PROJECT_HISTORY.md`.
- `pre-push`: `[ ! -f scripts/project-history/pre-push-project-history.mjs ] || node scripts/project-history/pre-push-project-history.mjs "$@"`
  Validates history before push and presents advisory cleanup commands for removal candidate branches.

When a hook manager is configured, update its configuration and run its install command (e.g. `npx simple-git-hooks` or `npx husky`). When no hook manager is configured, create `.git/hooks/post-commit` and `.git/hooks/pre-push` directly with executable permissions (`chmod +x`), ensuring they pass arguments and stdin to the respective scripts. Preserve custom `core.hooksPath` and existing hook behavior. Avoid recursion by invoking the validator script directly, not another hook. Until installation into a target project is completed and validated, do not activate startup commands or hooks there; the existence of source assets alone does not make a target protected.
