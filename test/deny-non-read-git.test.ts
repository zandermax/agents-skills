import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
	checkCommandForNonReadGit,
	checkToolInputPaths,
	evaluateToolUse,
	isTemporaryPath,
	splitShellStatements,
	tokenizeStatement,
} from "../agent-hooks/deny-non-read-git.mts";
import { dispatchShadowEvaluation } from "../agent-hooks/pre-tool-safety.js";
import { evaluateToolUse as evaluatePreToolSafety } from "../agent-hooks/pre-tool-safety.mts";

function runHook(hookPath: string, payload: unknown) {
	return spawnSync(process.execPath, ["--import", "tsx", hookPath], {
		input: JSON.stringify(payload),
		encoding: "utf8",
		env: { ...process.env, DECISION_SHADOW: "0" },
	});
}

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

		it("dispatches shadow scoring in a detached child and can skip it", () => {
			const events: unknown[][] = [];
			const child = {
				stdin: {
					write(value: unknown) {
						events.push(["write", value]);
					},
					end() {
						events.push(["end"]);
					},
				},
				unref() {
					events.push(["unref"]);
				},
			};
			const previous = process.env.DECISION_SHADOW;
			delete process.env.DECISION_SHADOW;
			try {
				assert.equal(
					dispatchShadowEvaluation({ toolName: "read" }, ((
						command: unknown,
						args: unknown,
						options: unknown,
					) => {
						const cmdArgs = args as string[];
						const opts = options as { detached?: boolean; stdio?: unknown };
						events.push([
							"spawn",
							command,
							cmdArgs[0],
							cmdArgs[1],
							opts.detached,
							opts.stdio,
						]);
						return child;
					}) as unknown as typeof import("node:child_process").spawn),
					true,
				);
				process.env.DECISION_SHADOW = "0";
				assert.equal(
					dispatchShadowEvaluation({ toolName: "read" }, (() => {
						throw new Error("shadow dispatch was not skipped");
					}) as unknown as typeof import("node:child_process").spawn),
					false,
				);
			} finally {
				if (previous === undefined) {
					delete process.env.DECISION_SHADOW;
				} else {
					process.env.DECISION_SHADOW = previous;
				}
			}

			const firstEvent = events[0];
			assert.ok(firstEvent);
			assert.equal(firstEvent[4], true);
			assert.deepEqual(firstEvent[5], ["pipe", "ignore", "ignore"]);
			const lastEvent = events.at(-1);
			assert.ok(lastEvent);
			assert.equal(lastEvent[0], "unref");
			const secondEvent = events[1];
			assert.ok(secondEvent);
			assert.equal(JSON.parse(String(secondEvent[1])).toolName, "read");
		});

		it("prints the existing hook decision when shadow dispatch is disabled", () => {
			const hookPath = fileURLToPath(
				new URL("../agent-hooks/pre-tool-safety.mts", import.meta.url),
			);
			const allow = runHook(hookPath, {
				tool_name: "run_in_terminal",
				tool_input: { command: "git status" },
			});
			const ask = runHook(hookPath, {
				tool_name: "run_in_terminal",
				tool_input: { command: "git commit -m x" },
			});

			assert.equal(allow.status, 0);
			assert.deepEqual(JSON.parse(allow.stdout), {
				hookSpecificOutput: {
					hookEventName: "PreToolUse",
					permissionDecision: "allow",
				},
			});
			assert.equal(ask.status, 0);
			assert.equal(
				JSON.parse(ask.stdout).hookSpecificOutput.permissionDecision,
				"ask",
			);
			assert.match(
				JSON.parse(ask.stdout).hookSpecificOutput.permissionDecisionReason,
				/Non-read git operation/,
			);
		});

		it("keeps one registered PreToolUse entrypoint per config", async () => {
			for (const path of ["../agent-hooks/deny-non-read-git.json"]) {
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
			assert.equal(checkCommandForNonReadGit("git reflog"), null);
			assert.equal(checkCommandForNonReadGit("git reflog -n 30"), null);
			assert.equal(checkCommandForNonReadGit("git reflog show"), null);
			assert.equal(checkCommandForNonReadGit("git reflog exists HEAD"), null);
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

		it("denies mutating reflog operations", () => {
			assert.match(
				checkCommandForNonReadGit("git reflog expire --all") ?? "",
				/git reflog expire/,
			);
			assert.match(
				checkCommandForNonReadGit("git reflog delete HEAD@{1}") ?? "",
				/git reflog delete/,
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

		it("always allows /tmp/ access for read, write, and command operations", () => {
			assert.equal(isTemporaryPath("/tmp"), true);
			assert.equal(isTemporaryPath("/tmp/"), true);
			assert.equal(isTemporaryPath("/tmp/test.txt"), true);
			assert.equal(isTemporaryPath("/tmp/nested/deep/file.txt"), true);
			assert.equal(isTemporaryPath("/private/tmp/file.txt"), true);
			assert.equal(isTemporaryPath("/var/log/system.log"), false);
			assert.equal(isTemporaryPath("/etc/hosts"), false);

			assert.equal(checkToolInputPaths({ filePath: "/tmp/test.txt" }), null);
			assert.equal(checkToolInputPaths({ path: "/tmp" }), null);
			assert.equal(checkToolInputPaths({ dirPath: "/tmp/subdir" }), null);
			assert.equal(
				checkToolInputPaths({ filePath: "/private/tmp/nested/deep/file.txt" }),
				null,
			);

			assert.equal(
				evaluateToolUse("create_file", {
					filePath: "/tmp/created-file.txt",
					content: "data",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("replace_string_in_file", {
					filePath: "/tmp/modified.txt",
					oldString: "a",
					newString: "b",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("create_directory", {
					dirPath: "/tmp/new-dir",
				}).decision,
				"allow",
			);

			assert.equal(
				evaluateToolUse("run_in_terminal", {
					command: "cat /tmp/input.txt > /tmp/output.txt",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("run_in_terminal", {
					command: "sed -i s/old/new/ /tmp/input.txt",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("run_in_terminal", {
					command: "echo 'build output' > /tmp/build.log",
				}).decision,
				"allow",
			);
			assert.equal(
				evaluateToolUse("run_in_terminal", {
					command: "rm -f /tmp/cleanup.tmp",
				}).decision,
				"allow",
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

		it("handles symlink workspace inspection for aliases and in-workspace symlinks", async () => {
			const temporaryDirectory = await mkdtemp(
				path.join(os.tmpdir(), "symlink-workspace-test-"),
			);

			try {
				const workspaceTarget = path.join(process.cwd(), "AGENTS.md");
				const aliasWorkspaceDir = path.join(
					temporaryDirectory,
					"workspace-alias",
				);
				// Symlink pointing to the current workspace root (simulates ~/.copilot/repos <-> ~/repos/work)
				await symlink(process.cwd(), aliasWorkspaceDir);

				const inAliasFile = path.join(aliasWorkspaceDir, "AGENTS.md");
				assert.equal(
					evaluateToolUse("read_file", { filePath: inAliasFile }).decision,
					"allow",
				);

				// In-workspace symlink pointing to an external file (placed in node_modules to avoid race conditions with workspace copying tests)
				const inWorkspaceLink = path.join(
					process.cwd(),
					"node_modules",
					"test-workspace-link-tmp.md",
				);
				await symlink("/etc/hosts", inWorkspaceLink);

				try {
					assert.equal(
						evaluateToolUse("read_file", { filePath: inWorkspaceLink })
							.decision,
						"ask",
					);
					assert.equal(
						evaluatePreToolSafety("read_file", {
							filePath: inWorkspaceLink,
						}).decision,
						"ask",
					);
				} finally {
					await rm(inWorkspaceLink, { force: true });
				}
			} finally {
				await rm(temporaryDirectory, { recursive: true, force: true });
			}
		});

		it("permits reading symlinked skills inside approved roots from an external workspace", async () => {
			const temporaryDirectory = await mkdtemp(
				path.join(os.tmpdir(), "symlinked-skill-test-"),
			);
			const originalCwd = process.cwd();

			try {
				process.chdir(temporaryDirectory);

				const symlinkedSkillPath = path.join(
					os.homedir(),
					".agents",
					"skills",
					"plan-checker",
					"SKILL.md",
				);

				const result = evaluateToolUse("read_file", {
					filePath: symlinkedSkillPath,
				});
				assert.equal(result.decision, "allow");

				const readResult = evaluateToolUse("read", {
					filePath: symlinkedSkillPath,
				});
				assert.equal(readResult.decision, "allow");
			} finally {
				process.chdir(originalCwd);
				await rm(temporaryDirectory, { recursive: true, force: true });
			}
		});

		it("asks for a broken in-workspace symlink and allows another open workspace folder", async () => {
			const temporaryDirectory = await mkdtemp(
				path.join(os.tmpdir(), "workspace-boundary-"),
			);
			const siblingDirectory = path.join(temporaryDirectory, "sibling");
			const brokenLink = path.join(
				process.cwd(),
				"node_modules",
				"broken-workspace-link-tmp.md",
			);
			const storageRoot = path.join(
				temporaryDirectory,
				"workspaceStorage",
				"workspace-id",
			);
			const workspaceFile = path.join(temporaryDirectory, "workspace.json");
			const transcriptPath = path.join(
				storageRoot,
				"GitHub.copilot-chat",
				"transcripts",
				"session.jsonl",
			);

			try {
				await mkdir(siblingDirectory, { recursive: true });
				await symlink(
					path.join(temporaryDirectory, "missing-target.txt"),
					brokenLink,
				);
				assert.equal(
					evaluateToolUse("read_file", { filePath: brokenLink }).decision,
					"ask",
				);

				const siblingFile = path.join(siblingDirectory, "notes.txt");
				const context = { cwd: siblingDirectory };
				assert.equal(
					evaluateToolUse("read_file", { filePath: siblingFile }, context)
						.decision,
					"allow",
				);
				assert.equal(
					evaluatePreToolSafety("read_file", { filePath: siblingFile }, context)
						.decision,
					"allow",
				);
				assert.equal(
					evaluateToolUse(
						"run_in_terminal",
						{ command: `cat ${siblingFile}` },
						context,
					).decision,
					"allow",
				);

				await mkdir(path.dirname(transcriptPath), { recursive: true });
				await writeFile(
					workspaceFile,
					JSON.stringify({
						folders: [{ path: "." }, { path: "sibling" }],
					}),
				);
				await writeFile(
					path.join(storageRoot, "workspace.json"),
					JSON.stringify({ workspace: pathToFileURL(workspaceFile).href }),
				);
				assert.equal(
					evaluateToolUse(
						"read_file",
						{ filePath: siblingFile },
						{ transcriptPath },
					).decision,
					"allow",
				);
			} finally {
				await rm(brokenLink, { force: true });
				await rm(temporaryDirectory, { recursive: true, force: true });
			}
		});
	});
});
