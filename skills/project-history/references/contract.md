# Project history contract

This is the behavioral contract for the script assets.

## Assets and commands

Copy the complete asset set below into `scripts/project-history/` in the target, preserving each basename. The entry points import modular helpers transitively; copying only the entry points is incomplete.

| Skill source asset                     | Role                                          |
| -------------------------------------- | --------------------------------------------- |
| `scripts/check-project-history.mjs`    | Checker CLI                                   |
| `scripts/pre-push-project-history.mjs` | Pre-push CLI                                  |
| `scripts/record-history.mjs`           | Recorder CLI                                  |
| `scripts/history-document-data.mjs`    | Root YAML schema                              |
| `scripts/history-document-parse.mjs`   | YAML fields, dates, and record mapping        |
| `scripts/history-document-format.mjs`  | YAML serialization                            |
| `scripts/history-document-io.mjs`      | Contained filesystem and committed-tree reads |
| `scripts/history-domain-log.mjs`       | Log records and domain paths                  |
| `scripts/history-entry-validation.mjs` | Decisions, dates, branches, and multiplicity  |
| `scripts/history-git.mjs`              | Git metadata                                  |
| `scripts/history-sync.mjs`             | History synchronization                       |
| `scripts/history-validation.mjs`       | Aggregate validation                          |
| `scripts/record-history-helpers.mjs`   | Arguments, branch metadata, and writes        |
| `scripts/record-history-input.mjs`     | Existing and unrecorded history               |
| `scripts/record-history-operation.mjs` | Recording and guarded amendment               |
| `scripts/yaml.mjs`                     | Bundled standalone YAML parser and serializer |
| `scripts/yaml.LICENSE`                 | ISC copyright and permission notice           |

Verify every asset and this contract before installing anything. Run with Node.js built-ins, Git, and the bundled parser only, without target-project package dependencies. Preserve the parser attribution and its notice in all copies. Find the repository root with Git, not the caller's working directory.

- `node scripts/project-history/check-project-history.mjs`: validate working-tree history's schema and durable commit coverage against actual local Git metadata; report dated branch-snapshot drift separately as advisories. Print `git status --short --branch` and validation results. Exit 0 on success, 1 on invalid or missing history. The checker never changes files, refs, the index, configuration, or remote state.
- `node scripts/project-history/check-project-history.mjs --startup`: also warn when actual branch count is strictly greater than the configured threshold. A warning alone does not fail validation. Count actual refs even when the recorded snapshot is stale; emit the warning before the validation summary.
- `node scripts/project-history/pre-push-project-history.mjs <remote-name> <remote-url>`: accept standard ref-update lines on stdin. For any non-deletion update, validate durable history from committed HEAD, including committed domain documents, without a working-tree fallback. Never write files, stage, synchronize, change refs/configuration, or amend HEAD: Git has already selected the push object. Missing or invalid durable history and malformed input/repository failures exit 1 with `node scripts/project-history/record-history.mjs` as the explicit repair command before retrying. Stale branch snapshots alone pass. Deletion-only pushes and no updates exit 0. Current unpushed branches and still-present, still-merged removal candidates produce advisory notices, not cleanup gates. Never contact a remote or perform a push.
- `node scripts/project-history/record-history.mjs [--subject <subject>] [--decision <decision>] [--domain <domain>] [--no-commit] [--amend]`: discover unrecorded reachable commits, serialize them and the prospective snapshot in YAML, stage history files, and create the commit with matching UTC committer timestamp. Repeat `--decision` for multiple decisions. `--domain` selects an indexed domain by name, defaulting to the first. `--no-commit` still writes and stages history, but does not commit. `--amend` records the existing HEAD without a new prospective entry, with the hook safeguards below. Exit 0 on success, 1 on failure.

The committed HEAD document is the canonical durable history index for pre-push, including branches other than HEAD being pushed; older branch tips need not contain today's inventory. Its inventory is a dated snapshot, not an assertion that current refs have the same tips or even still exist. Missing HEAD or documents, malformed input/documents, and Git/read failures must fail closed with actionable stderr, never a successful empty result. Diagnostics identify offending fields, refs, documents, or commit subjects.

## Changelog document

The root document is `PROJECT_HISTORY.yaml`, a YAML mapping whose `status` precedes exactly one of `log` or `domains`. Serialized field names are snake_case.

```yaml
# Project history

status:
  updated_at: "2026-10-09T12:00:00Z"
  main_branch: main
  branch_warning_threshold: 10
  branches:
    - branch_name: main
      committed_at: "2026-10-09T12:00:00Z"
      subject: Record history contract
      status: no related plan
      planning_doc: (none)
      ref: refs/remotes/origin/main

# Note: Commits prior to this point do not have recorded historical context.
log:
  - committed_at: "2026-10-09T12:00:00Z"
    subject: Record history contract
    decisions:
      - the project-history skill should use UTC committer timestamps so snapshots are reproducible.
```

Each branch includes `branch_name`, `committed_at`, `subject`, `status`, `planning_doc`, and `ref` last. Each log entry includes `committed_at`, the exact Git `subject`, and `decisions`, an array of zero or more strings (`decisions: []` when none). Decisions come from agent conversations, not Git messages, and must not contain the Git message. Record worthwhile decisions benefiting future work, explicitly naming their domain (skill, feature, architecture, tooling). Phrase each as a sentence completing "in this project for the work being done for this commit, it was decided that..." without that introductory text; for example, "the project-history skill should block adding more than a specific number of branches, using a pre-push git hook", not a conventional commit message.

At installation, do not populate older commits lacking immediate conversational context. Keep the comment before `log` or `domains` to document that historical boundary. Preserve existing recorded decisions.

### Dates and identity

- Dates are valid UTC timestamps with second precision, exactly `YYYY-MM-DDTHH:mm:ssZ`. Reject impossible calendar dates and other formats.
- `committed_at` is the Git **committer** timestamp converted to UTC, not the author date or script execution time.
- `updated_at` equals the newest log timestamp across all domains. Inline and domain logs are newest first; equal timestamps are allowed. Retained history may be newer than surviving branch tips.
- From the earliest recorded commit forward, cover every unique commit object reachable from actual local and remote-tracking branches exactly once, including merges, independently of the dated inventory. Shared ancestors count once. For each reachable `(committed_at, subject)` pair since recording began, require Git's count of unique objects: distinct commits with the same timestamp and subject need separate records. Reject missing entries and surplus copies of reachable entries.
- Retain history after branch deletion or rewriting. Validate retained dates and decision syntax even when Git metadata is no longer verifiable after garbage collection.
- Never store the current commit's hash in its own document: that is self-referential. Dates, exact subjects, and multiplicity avoid the cycle, but cannot distinguish decisions on commits with identical dates and subjects. Use distinct subjects when those decisions differ.

### Branch snapshot

Only inventory remote-tracking refs. Exclude separate local branch records, tags, and symbolic refs such as `refs/remotes/origin/HEAD`. Record each remote tip's exact subject, UTC committer date, status, plan, and branch name, with `ref` last.

Persist the plain branch name in `branch_name`, with no unpushed-state marker or replacement field/configuration. Accept the legacy ` [unpushed changes]` suffix while reading; explicit inventory updates normalize names without discarding decisions. Require unique, syntactically valid remote-tracking refs and names matching their ref suffix, valid UTC timestamps, nonempty subjects, supported statuses, and safe repository-relative plan paths. Inventory order is immaterial. An empty inventory is valid when no remote-tracking refs exist.

Validate these snapshot fields independently of live refs, including records for deleted branches. Live additions, removals, or changed tip subjects/dates produce clear advisory diagnostics in the checker and pre-push output, never schema failures. They do not waive durable commit coverage, timestamp, decision, duplicate, or document/path validation.

Branch `status` is one of:

- `removal candidate`: related plan is complete and archived, and branch is merged into main.
- `in active development`: an active plan relates to the branch on its own branch.
- `ready to merge`: related plan is complete but branch is not merged into main.
- `no related plan`: no plan relates to the branch.

`planning_doc` is the repository-relative plan Markdown path, or `"(none)"`.

When pushing to main, compute unpushed-branch notices from current local branches, the push remote's tracking refs, and ancestry. Persisted markers never drive warnings. Removal candidates in the committed snapshot produce advisory deletion commands only when their refs still exist and are still merged into main; the scripts do not delete branches or treat old metadata as current proof.

The warning threshold is a nonnegative integer, default 10. Warn only when actual count exceeds it, not when equal. Include actual count and threshold; a stale snapshot must not suppress this warning.

The committed branch inventory is not a clean/dirty working-tree promise: persisting `git status` would invalidate itself when edited. The startup checker prints live status separately. Ref changes (including fetch/push updates to tracking refs) can stale the inventory. Report this at startup and refresh in the next recorded commit; do not silently mutate a committed snapshot or pretend it is live.

## Domain split

Split when the log exceeds 200 entries or 32 KiB, keeping `PROJECT_HISTORY.yaml` as the single status and context index. Replace the inline `log` with a `domains` array:

```yaml
domains:
  - docs/project-history/banking.yaml
  - docs/project-history/tooling.yaml
```

Each domain is a YAML mapping with an inline `log` array using the same record schema and ordering. Read every domain before work. Each commit belongs to one best-fitting domain; cross-domain decisions stay together. Never duplicate entries or discard old history.

Resolve paths relative to the repository root. Require unique paths under `docs/project-history/` ending in `.yaml` (or `.yml`); reject traversal, absolute paths, control characters, missing documents, duplicate links, and symlinks escaping the repository. Domain documents cannot link to further domains. The root must contain either inline `log` or `domains`, never both. Aggregate all domains for completeness and newest timestamp. Committed validation reads index and domains from HEAD, not the filesystem.

## Recording without a hash cycle

Before creating a commit, choose its exact one-line subject and UTC committer timestamp. Add its decision record and update the snapshot using actual remote-tracking tips, retaining other refs and their status/plan metadata. Set `updated_at` to the maximum timestamp across the entire log. Create the commit with that subject and `GIT_COMMITTER_DATE`, then validate. The prospective snapshot temporarily disagrees with Git until its commit exists; never install a pre-commit validator that makes this impossible.

`record-history.mjs` automates discovery, inventory updates, YAML serialization, staging the root and changed domain, and committing with matching dates and subjects. Bootstrap missing history in a new prospective-snapshot commit. Record current-conversation commits without fabricating older decisions, retaining the note that earlier commits lack context.

## AGENTS.md and hook installation

Update every existing project AGENTS.md, including nested and case-insensitive variants, excluding Git metadata, dependencies, and generated output. Preserve unrelated guidance and existing hooks. If none exists, create root guidance only:

- At startup, read `PROJECT_HISTORY.yaml` and indexed domains and run `node scripts/project-history/check-project-history.mjs --startup`; warn on the threshold and report failed validation.
- Before pushing or concluding tasks introducing commits, run `node scripts/project-history/record-history.mjs` to record conversational decisions and synchronize the ledger. Decisions may be multiple, one, or none; never include the Git message.
- Record worthwhile domain-specific decisions using the sentence-completion phrasing above.

Use the existing hook manager or `core.hooksPath`, preserving checks:

- `post-commit`: `[ ! -f scripts/project-history/record-history.mjs ] || node scripts/project-history/record-history.mjs --amend`
  Amend the commit to record its entry and YAML inventory. Skip recursive invocation, active rebases, merges, cherry-picks, reverts, bisects, and multi-parent merge commits.
- `pre-push`: `[ ! -f scripts/project-history/pre-push-project-history.mjs ] || node scripts/project-history/pre-push-project-history.mjs "$@"`
  Strictly read-only validation of committed history and live cleanup advice. Fail invalid durable history with the explicit recorder command. Never repair, stage, synchronize, or amend during pre-push.

Run a configured hook manager's install command. Without one, install executable `.git/hooks/post-commit` and `.git/hooks/pre-push` (or use `core.hooksPath`), forwarding arguments and stdin. Never install a pre-commit history validator.

For Node.js targets with root `package.json`, add `"history:record": "node scripts/project-history/record-history.mjs"` to `scripts`, preserving unrelated commands. This enables `npm run history:record` without a new runtime dependency.

Until installation and target-specific validation complete, do not activate startup commands or hooks. Source assets alone do not protect a target.

Mutation boundaries: one-time authorized installation writes assets, guidance, history, and hook configuration. Explicit recording writes/stages and may commit; `--no-commit` still stages. Guarded post-commit amendment is unchanged. Checker and pre-push execution are read-only even on failure. Branch cleanup and snapshot drift alone are advisory, but pushes with missing or malformed durable history do not always succeed.
