import {
	assert,
	describe,
	evaluateToolUse,
	it,
	path,
} from "./deny-non-read-git.shared.js";

describe("deny-non-read-git hook", () => {
	describe("evaluateToolUse", () => {
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

		it("evaluates list_dir on workspace and external paths", () => {
			assert.equal(
				evaluateToolUse("list_dir", { path: process.cwd() }).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("list_dir", {
					path: path.join(process.cwd(), "docs"),
				}).decision,
				"allow",
			);
			const extResult = evaluateToolUse("list_dir", {
				path: "/var/log",
			});
			assert.equal(extResult.decision, "ask");
			assert.match(extResult.reason ?? "", /outside the active workspace/);
		});

		it("allows read_file and list_dir on approved roots, denies unapproved", () => {
			const home = process.env.HOME ?? "";
			assert.equal(
				evaluateToolUse("read_file", {
					filePath: path.join(home, ".copilot", "agents", "foo.agent.md"),
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("read_file", {
					filePath: path.join(home, ".agents", "skills", "test", "helper.txt"),
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("list_dir", {
					path: path.join(home, ".claude", "skills"),
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("read_file", {
					filePath: path.join(home, ".memory", "test-notes", "SKILL.md"),
				}).decision,
				"allow",
			);
			// Arbitrary system files require confirmation
			assert.equal(
				evaluateToolUse("read_file", {
					filePath: "/var/log/system.log",
				}).decision,
				"ask",
			);
			// Root-level /memories require confirmation
			assert.equal(
				evaluateToolUse("read_file", {
					filePath: "/memories/repo/test.md",
				}).decision,
				"ask",
			);
		});
	});
});
