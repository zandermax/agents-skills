import {
	assert,
	checkToolInputPaths,
	describe,
	evaluateToolUse,
	isTemporaryPath,
	it,
} from "./deny-non-read-git.shared.js";

describe("deny-non-read-git hook", () => {
	describe("evaluateToolUse", () => {
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
	});
});
