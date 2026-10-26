import {
	assert,
	describe,
	dispatchShadowEvaluation,
	evaluatePreToolSafety,
	evaluateToolUse,
	fileURLToPath,
	it,
	runHook,
} from "./deny-non-read-git.shared.js";

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
				new URL("../../../agent-hooks/pre-tool-safety.mts", import.meta.url),
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
			for (const path of ["../../../agent-hooks/deny-non-read-git.json"]) {
				const config = await import(path, { with: { type: "json" } });
				assert.equal(config.default.hooks.PreToolUse.length, 1);
			}
		});
	});
});
