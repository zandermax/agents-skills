import {
	assert,
	checkToolInputPaths,
	describe,
	evaluateToolUse,
	it,
} from "./deny-non-read-git.shared.js";

describe("deny-non-read-git hook", () => {
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
			assert.equal(checkToolInputPaths({ filePath: "/tmp/outside.txt" }), null);
			assert.match(
				checkToolInputPaths({ filePath: "/var/log/outside.txt" }) ?? "",
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
					filePath: "~/.agents/skills/ctx/SKILL.md",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("read_file", {
					filePath: "~/.copilot/skills/auto-vulnerability-fixer/SKILL.md",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("read_file", {
					filePath:
						"~/.copilot/installed-plugins/atlassian/atlassian/skills/capture-tasks-from-meeting-notes/SKILL.md",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("read_file", {
					filePath: "~/.vscode/extensions/test-extension/SKILL.md",
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
				evaluateToolUse("read_file", {
					filePath:
						"~/Library/Application Support/Code/User/prompts/remember-that.agent.md",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("read_file", {
					filePath:
						"~/Library/Application Support/Code/copilot-terminal-output/copilot-terminal-output-test.txt",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("run_in_terminal", {
					command: String.raw`grep "SKILL.md" /Users/zander/Library/Application\ Support/Code/copilot-terminal-output/copilot-terminal-output-1ab8913c-40dc-419c-b3e2-0352d39bc089.txt | head -n 30`,
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("read", {
					filePath: "~/.agents/skills/ctx/SKILL.md",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("readFile", {
					filePath: "~/.agents/skills/ctx/SKILL.md",
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
				"/memories/repo/SKILL.md",
				"/var/log/system.log",
			]) {
				const result = evaluateToolUse("read_file", { filePath });
				assert.equal(result.decision, "ask", filePath);
			}
			assert.equal(
				evaluateToolUse("run_in_terminal", {
					command: "cat /var/log/input.txt > /var/log/output.txt",
				}).decision,
				"ask",
			);
			assert.equal(
				evaluateToolUse("run_in_terminal", {
					command: "sed -i s/old/new/ /var/log/input.txt",
				}).decision,
				"ask",
			);
		});
	});
});
