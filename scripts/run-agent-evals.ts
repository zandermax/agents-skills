import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScenarioResult, SupportedCli } from "../src/lib/agent-evals.js";
import {
	buildCliInvocation,
	detectAvailableClis,
	evaluateScenario,
	parseCliTranscript,
	parseEvalScenarios,
	selectSupportedCli,
} from "../src/lib/agent-evals.js";

function commandExists(command: string): boolean {
	try {
		execFileSync("command", ["-v", command], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

function printScenarioResult(result: ScenarioResult): void {
	const status = result.pass ? "PASS" : "FAIL";
	console.log(`${status} ${result.name}`);
	console.log(`  gate1 (memory/skill access): ${result.gate1.detail}`);
	console.log(`  gate2 (behavioral adherence): ${result.gate2.detail}`);
}

async function runScenarios(
	targetDir: string,
	cli: SupportedCli,
): Promise<readonly ScenarioResult[]> {
	const evalsPath = path.join(targetDir, "evals.json");
	const raw = await readFile(evalsPath, "utf8");
	const scenarios = parseEvalScenarios(raw, evalsPath);

	const results: ScenarioResult[] = [];
	for (const scenario of scenarios) {
		const invocation = buildCliInvocation(cli, scenario.prompt);
		const spawned = spawnSync(invocation.command, invocation.args, {
			cwd: targetDir,
			encoding: "utf8",
		});
		const transcript = parseCliTranscript(spawned.stdout ?? "");
		results.push(evaluateScenario(scenario, transcript));
	}
	return results;
}

export async function runCli(arguments_: readonly string[]): Promise<void> {
	const dirFlagIndex = arguments_.indexOf("--dir");
	const targetDir = arguments_[dirFlagIndex + 1];
	if (dirFlagIndex === -1 || targetDir === undefined) {
		throw new Error(
			"usage: run-agent-evals --dir <path-to-directory-containing-evals.json>",
		);
	}

	const available = detectAvailableClis(commandExists);
	const cli = selectSupportedCli(available);

	if (cli === undefined) {
		console.log(
			"skipped — no supported CLI available (expected 'copilot' or 'claude' on PATH)",
		);
		return;
	}

	const results = await runScenarios(path.resolve(targetDir), cli);
	for (const result of results) {
		printScenarioResult(result);
	}

	const failed = results.filter((result) => !result.pass);
	if (failed.length > 0) {
		process.exitCode = 1;
	}
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	runCli(process.argv.slice(2)).catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
