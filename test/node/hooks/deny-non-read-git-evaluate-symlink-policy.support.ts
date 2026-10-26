import {
	assert,
	describe,
	evaluatePreToolSafety,
	evaluateToolUse,
	it,
	mkdir,
	mkdtemp,
	os,
	path,
	pathToFileURL,
	rm,
	symlink,
	writeFile,
} from "./deny-non-read-git.shared.js";

describe("deny-non-read-git hook", () => {
	describe("evaluateToolUse", () => {
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

		it("handles symlink workspace inspection for aliases and in-workspace symlinks", async () => {
			const temporaryDirectory = await mkdtemp(
				path.join(os.tmpdir(), "symlink-workspace-test-"),
			);

			try {
				const _workspaceTarget = path.join(process.cwd(), "AGENTS.md");
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
