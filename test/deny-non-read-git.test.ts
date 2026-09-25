import assert from "node:assert/strict";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
	checkCommandForNonReadGit,
	checkToolInputPaths,
	evaluateToolUse,
	splitShellStatements,
	tokenizeStatement,
} from "../.github/hooks/deny-non-read-git.mts";
import { evaluateToolUse as evaluatePreToolSafety } from "../.github/hooks/pre-tool-safety.mts";

describe("deny-non-read-git hook", () => {
	describe("pre-tool-safety compatibility", () => {
		it("keeps the legacy and canonical entrypoints on the same decisions", () => {
			const input = {
				command: "git commit -m 'feat'",
			};
			assert.deepEqual(
				evaluatePreToolSafety("run_in_terminal", input),
				evaluateToolUse("run_in_terminal", input),
			);
		});

		it("keeps one registered PreToolUse entrypoint per config", async () => {
			for (const path of [
				"../.github/hooks/deny-non-read-git.json",
				"../.agents/hooks/deny-non-read-git.json",
			]) {
				const config = await import(path, { with: { type: "json" } });
				assert.equal(config.default.hooks.PreToolUse.length, 1);
			}
		});
	});

	describe("splitShellStatements", () => {
		it("splits on semicolons, &&, ||, and pipes outside quotes", () => {
			const stmts = splitShellStatements(
				'git status && echo "hello; world" | grep hello',
			);
			assert.deepEqual(stmts, [
				"git status",
				'echo "hello; world"',
				"grep hello",
			]);
		});

		it("handles multiple statements with newlines", () => {
			const stmts = splitShellStatements("git log\ngit diff");
			assert.deepEqual(stmts, ["git log", "git diff"]);
		});
	});

	describe("tokenizeStatement", () => {
		it("preserves quoted tokens with spaces", () => {
			const tokens = tokenizeStatement('git commit -m "initial commit"');
			assert.deepEqual(tokens, ["git", "commit", "-m", "initial commit"]);
		});
	});

	describe("checkCommandForNonReadGit", () => {
		it("allows read-only git status, log, diff, show, and rev-parse", () => {
			assert.equal(checkCommandForNonReadGit("git status"), null);
			assert.equal(checkCommandForNonReadGit("git log -n 5 --oneline"), null);
			assert.equal(checkCommandForNonReadGit("git diff HEAD~1"), null);
			assert.equal(checkCommandForNonReadGit("git show HEAD"), null);
			assert.equal(checkCommandForNonReadGit("git rev-parse HEAD"), null);
			assert.equal(checkCommandForNonReadGit("git --no-pager diff"), null);
			assert.equal(checkCommandForNonReadGit("git -C /tmp status"), null);
		});

		it("allows read-only branch, tag, remote, and stash subcommands", () => {
			assert.equal(checkCommandForNonReadGit("git branch"), null);
			assert.equal(checkCommandForNonReadGit("git branch -a"), null);
			assert.equal(checkCommandForNonReadGit("git branch --list"), null);
			assert.equal(checkCommandForNonReadGit("git tag"), null);
			assert.equal(checkCommandForNonReadGit("git tag -l 'v*'"), null);
			assert.equal(checkCommandForNonReadGit("git remote -v"), null);
			assert.equal(checkCommandForNonReadGit("git stash list"), null);
			assert.equal(checkCommandForNonReadGit("git stash show"), null);
			assert.equal(
				checkCommandForNonReadGit("git config --get user.name"),
				null,
			);
		});

		it("denies mutating branch commands", () => {
			assert.match(
				checkCommandForNonReadGit("git branch -d my-feature") ?? "",
				/git branch with mutation flag '-d'/,
			);
			assert.match(
				checkCommandForNonReadGit("git branch new-branch") ?? "",
				/git branch creation for 'new-branch'/,
			);
		});

		it("denies mutating tag commands", () => {
			assert.match(
				checkCommandForNonReadGit("git tag v1.0.0") ?? "",
				/git tag creation for 'v1.0.0'/,
			);
			assert.match(
				checkCommandForNonReadGit("git tag -d v1.0.0") ?? "",
				/git tag with mutation flag '-d'/,
			);
		});

		it("denies mutating stash operations", () => {
			assert.match(
				checkCommandForNonReadGit("git stash") ?? "",
				/git stash \(defaults to push\/create\)/,
			);
			assert.match(
				checkCommandForNonReadGit("git stash pop") ?? "",
				/git stash pop/,
			);
		});

		it("denies commit, push, checkout, and rebase commands", () => {
			assert.match(
				checkCommandForNonReadGit('git commit -m "feat"') ?? "",
				/git commit/,
			);
			assert.match(
				checkCommandForNonReadGit("git push origin main") ?? "",
				/git push/,
			);
			assert.match(
				checkCommandForNonReadGit("git checkout main") ?? "",
				/git checkout/,
			);
			assert.match(
				checkCommandForNonReadGit("git checkout -b new-branch") ?? "",
				/git checkout/,
			);
			assert.match(
				checkCommandForNonReadGit("git rebase mainline") ?? "",
				/git rebase/,
			);
			assert.match(
				checkCommandForNonReadGit("git reset --hard") ?? "",
				/git reset/,
			);
		});

		it("denies non-read operations inside chained statements", () => {
			assert.match(
				checkCommandForNonReadGit("git status && git add .") ?? "",
				/git add/,
			);
		});

		it("allows non-git commands", () => {
			assert.equal(checkCommandForNonReadGit("npm test"), null);
			assert.equal(checkCommandForNonReadGit("ls -la"), null);
			assert.equal(checkCommandForNonReadGit('echo "git commit"'), null);
		});
	});

	describe("evaluateToolUse", () => {
		it("allows unknown payload shapes without guessing", () => {
			assert.equal(evaluateToolUse("unknown_tool", null).decision, "allow");
			assert.equal(evaluateToolUse("unknown_tool", []).decision, "allow");
		});

		it("preserves GitHub mutation precedence over path checks", () => {
			const result = evaluateToolUse("mcp_github_mcp_se_push_files", {
				filePath: "/tmp/outside-workspace.txt",
			});
			assert.equal(result.decision, "ask");
			assert.match(result.reason ?? "", /Mutating Git\/GitHub tool/);
		});

		it("allows non-command tools", () => {
			const result = evaluateToolUse("read_file", {
				filePath: "src/index.ts",
			});
			assert.equal(result.decision, "allow");
		});

		it("asks before a path-bearing tool accesses outside the workspace", () => {
			const result = evaluateToolUse("read_file", {
				filePath: "/var/log/outside-workspace.txt",
			});
			assert.equal(result.decision, "ask");
			assert.match(result.reason ?? "", /outside the active workspace/);
		});

		it("allows workspace-relative paths and classifies external paths", () => {
			assert.equal(checkToolInputPaths({ filePath: "src/index.ts" }), null);
			assert.equal(
				checkToolInputPaths({ filePath: `${process.cwd()}/src/index.ts` }),
				null,
			);
			assert.match(
				checkToolInputPaths({ filePath: "/tmp/outside.txt" }) ?? "",
				/outside the active workspace/,
			);
		});

		it("allows approved read-only diagnostic resources", () => {
			assert.equal(
				evaluateToolUse("read_file", {
					filePath: "/tmp/diagnostic-output.txt",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("read_file", {
					filePath: "~/.memory/git-workflow-notes/SKILL.md",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("read_file", {
					filePath:
						"~/Library/Application Support/Code/User/workspaceStorage/session/chat-session-resources/content.txt",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("run_in_terminal", {
					command: "grep -o pattern /tmp/diagnostic-output.txt | wc -l",
				}).decision,
				"allow",
			);
		});

		it("rejects malformed or write-capable external access", () => {
			for (const filePath of [
				"/memories/repo/skill-invocation-paradigm.md",
				"~/.memory/git-workflow-notes/notes.txt",
				"/var/log/system.log",
			]) {
				const result = evaluateToolUse("read_file", { filePath });
				assert.equal(result.decision, "ask", filePath);
			}
			assert.equal(
				evaluateToolUse("run_in_terminal", {
					command: "cat /tmp/input.txt > /tmp/output.txt",
				}).decision,
				"ask",
			);
			assert.equal(
				evaluateToolUse("run_in_terminal", {
					command: "sed -i s/old/new/ /tmp/input.txt",
				}).decision,
				"ask",
			);
		});

		it("follows symlinks when classifying read paths", async () => {
			const temporaryDirectory = await mkdtemp(
				path.join(os.tmpdir(), "path-policy-"),
			);
			const workspaceTarget = path.join(process.cwd(), "AGENTS.md");
			const workspaceLink = path.join(temporaryDirectory, "workspace-link.md");
			const externalLink = path.join(temporaryDirectory, "external-link.md");

			try {
				await symlink(workspaceTarget, workspaceLink);
				await symlink("/etc/hosts", externalLink);
				assert.equal(
					evaluateToolUse("read_file", { filePath: workspaceLink }).decision,
					"allow",
				);
				assert.equal(
					evaluateToolUse("read_file", { filePath: externalLink }).decision,
					"ask",
				);
			} finally {
				await rm(temporaryDirectory, { recursive: true, force: true });
			}
		});

		it("asks before a command accesses an external absolute path", () => {
			const result = evaluateToolUse("run_in_terminal", {
				command: "cat /var/log/outside-workspace.txt",
			});
			assert.equal(result.decision, "ask");
			assert.match(result.reason ?? "", /outside the active workspace/);
		});

		it("allows an absolute executable while checking its arguments", () => {
			assert.equal(
				evaluateToolUse("run_in_terminal", { command: "/usr/bin/git status" })
					.decision,
				"allow",
			);
		});

		it("allows safe read-only git command tool use", () => {
			const result = evaluateToolUse("run_in_terminal", {
				command: "git status",
			});
			assert.equal(result.decision, "allow");
		});

		it("asks for confirmation on mutating git command tool use", () => {
			const result = evaluateToolUse("run_in_terminal", {
				command: "git commit -m 'feat'",
			});
			assert.equal(result.decision, "ask");
			assert.match(result.reason ?? "", /git commit/);
		});

		it("asks for confirmation on mutating github MCP tools", () => {
			const result = evaluateToolUse("mcp_github_mcp_se_push_files", {
				files: [],
			});
			assert.equal(result.decision, "ask");
		});
	});
});
