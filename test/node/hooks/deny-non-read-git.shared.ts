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
} from "../../../agent-hooks/deny-non-read-git.mts";
import { dispatchShadowEvaluation } from "../../../agent-hooks/pre-tool-safety.js";
import { evaluateToolUse as evaluatePreToolSafety } from "../../../agent-hooks/pre-tool-safety.mts";

function runHook(hookPath: string, payload: unknown) {
	return spawnSync(process.execPath, ["--import", "tsx", hookPath], {
		input: JSON.stringify(payload),
		encoding: "utf8",
		env: { ...process.env, DECISION_SHADOW: "0" },
	});
}

export {
	assert,
	checkCommandForNonReadGit,
	checkToolInputPaths,
	describe,
	dispatchShadowEvaluation,
	evaluatePreToolSafety,
	evaluateToolUse,
	fileURLToPath,
	isTemporaryPath,
	it,
	mkdir,
	mkdtemp,
	os,
	path,
	pathToFileURL,
	rm,
	runHook,
	spawnSync,
	splitShellStatements,
	symlink,
	tokenizeStatement,
	writeFile,
};
