import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	checkCommandForNonReadGit,
	evaluateToolUse,
	splitShellStatements,
	tokenizeStatement,
} from "../.github/hooks/deny-non-read-git.mts";

describe("deny-non-read-git hook", () => {
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
		it("allows non-command tools", () => {
			const result = evaluateToolUse("read_file", {
				filePath: "src/index.ts",
			});
			assert.equal(result.decision, "allow");
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
