import {
	assert,
	executablePlannerPath,
	executablePlanningCorePath,
	listSections,
	parseFrontmatter,
	planExecutorPath,
	planScoutPath,
	readFile,
	test,
} from "./check-customizations.shared.js";

const EXECUTABLE_PLANNER_FRONTMATTER_BLOCK = [
	"---",
	"name: Executable Planner",
	"description: Create and maintain an executable plan without implementing project work",
	'argument-hint: Goal and constraints; add "autopilot" for unattended runs and a storage choice (local/repo, native, or session-only)',
	"tools:",
	"  [AskUserQuestion, ToolSearch, Read, WebFetch, WebSearch, Agent, Edit, Write, Glob, Grep, TodoWrite, Skill]",
	'agents: ["Plan Scout", "Plan Checker"]',
	"user-invocable: true",
	"disable-model-invocation: false",
	"handoffs:",
	"  - label: Execute 💀",
	"    agent: Plan Executor",
	"    prompt: Execute the approved current phase. If it is not elaborated or confirmed, stop and request elaboration or confirmation.",
	"    send: true",
	"  - label: Elaborate 💬",
	"    agent: Executable Planner",
	"    prompt: Elaborate or clarify the current phase, then ask for confirmation before execution.",
	"    send: true",
	"  - label: Complete ✅",
	"    agent: Plan Executor",
	"    prompt: Complete the plan and archive it only when no steps remain and final validation passes.",
	"    send: true",
	"---",
	"",
].join("\n");
const EXECUTABLE_PLANNER_BODY = [
	"",
	"You are a planner. You create and maintain executable plans; you never implement project work.",
	"",
	"**Required skill:** load `executable-planning` before doing anything else, along with any other skill this agent names.",
	"",
	"The skill describes behavior through abstract mechanisms. In this harness they map to:",
	"",
	"- **Question mechanism**: `AskUserQuestion` (or the harness equivalent). Batch all unresolved questions into one call, with predefined options where answers are fixed. For a User Test, request a free-text observation and must not suggest an expected result. Whenever completing an operation or step while the plan is not yet complete, prompt the user for any test actions, or note \"No checkpoint tests yet.\" when there is nothing yet to test. Don't call it once autopilot execution has begun. Autopilot mode is active only when the user's request includes the word 'autopilot'. In autopilot mode, resolve any open question by choosing the most conservative option, record it under an 'Assumptions' heading in the plan, and continue; never block waiting for input.",
	"- **Plan-review mechanism**: the `handoffs` frontmatter starts implementation through VS Code's native UI. This declarative adapter mapping applies after each response; the skill decides when a plan is ready. Other harnesses use their equivalent transition mechanism or present the plan in conversation.",
	"- **Subagent mechanism**: the `Agent` tool may use **Plan Scout** for read-only discovery and **Plan Checker** for the independent shared `plan-checker` risk review. Plan Scout is not a readiness reviewer. If Plan Checker is not exposed by the harness, execute the shared `plan-checker` protocol in the current context as `hone-the-plan` requires; do not report the checker as unavailable solely because no separately named reviewer tool is listed.",
	"- **Persistence**: `Edit` and `Write`, only for files under `docs/plans/` (including `docs/plans/archive/`). Never edit any other path. In session-only mode, write no files at all.",
	"- **`TodoWrite`**: optionally mirror the steps of the phase being elaborated. The plan stays canonical; never keep state only in the todo list.",
	"",
	"Whoever implements the plan after handoff might not load the skill. The plan's Execution Protocol section is what governs them, so never omit or abbreviate it.",
	"",
].join("\n");

test("executable planner agent is a thin adapter with stable frontmatter fields", async () => {
	const [agentContent, coreContent] = await Promise.all([
		readFile(executablePlannerPath, "utf8"),
		readFile(executablePlanningCorePath, "utf8"),
	]);

	assert.deepEqual(
		parseFrontmatter(agentContent, "executable-planner.agent.md").attributes,
		parseFrontmatter(
			EXECUTABLE_PLANNER_FRONTMATTER_BLOCK,
			"expected planner frontmatter",
		).attributes,
	);

	const parsedAgent = parseFrontmatter(
		agentContent,
		"agents/executable-planner.agent.md",
	);

	assert.deepEqual(parsedAgent.attributes, {
		name: "Executable Planner",
		description:
			"Create and maintain an executable plan without implementing project work",
		"argument-hint":
			'Goal and constraints; add "autopilot" for unattended runs and a storage choice (local/repo, native, or session-only)',
		tools: [
			"AskUserQuestion",
			"ToolSearch",
			"Read",
			"WebFetch",
			"WebSearch",
			"Agent",
			"Edit",
			"Write",
			"Glob",
			"Grep",
			"TodoWrite",
			"Skill",
		],
		agents: ["Plan Scout", "Plan Checker"],
		"user-invocable": true,
		"disable-model-invocation": false,
		handoffs: [
			{
				label: "Execute 💀",
				agent: "Plan Executor",
				prompt:
					"Execute the approved current phase. If it is not elaborated or confirmed, stop and request elaboration or confirmation.",
				send: true,
			},
			{
				label: "Elaborate 💬",
				agent: "Executable Planner",
				prompt:
					"Elaborate or clarify the current phase, then ask for confirmation before execution.",
				send: true,
			},
			{
				label: "Complete ✅",
				agent: "Plan Executor",
				prompt:
					"Complete the plan and archive it only when no steps remain and final validation passes.",
				send: true,
			},
		],
	});

	assert.equal(parsedAgent.body, EXECUTABLE_PLANNER_BODY);

	assert.match(
		coreContent,
		/fresh tool output as the sole evidence for claims about repository state, uncommitted changes, validation results, or completion/i,
	);

	const coreHeadings = new Set(
		listSections(coreContent)
			.filter((section) => section.level >= 2)
			.map((section) => section.heading),
	);
	for (const section of listSections(parsedAgent.body)) {
		if (section.level >= 2) {
			assert.ok(
				!coreHeadings.has(section.heading),
				`agent body duplicates canonical core heading: ${section.heading}`,
			);
		}
	}
});

test("plan scout is a non-invocable read-only investigator", async () => {
	const content = await readFile(planScoutPath, "utf8");
	const parsed = parseFrontmatter(content, "agents/plan-scout.agent.md");

	assert.deepEqual(parsed.attributes, {
		name: "Plan Scout",
		description: "Answers narrow codebase questions for the Executable Planner",
		tools: [
			"Glob",
			"Grep",
			"Read",
			"WebFetch",
			"WebSearch",
			"AskUserQuestion",
			"Skill",
		],
		agents: [],
		"user-invocable": false,
		"disable-model-invocation": false,
	});
	assert.match(parsed.body, /Never edit files, run commands, or plan the work/);
	assert.match(parsed.body, /aiming for under 400 words/);
});

test("plan executor declares structured-question capability in tools", async () => {
	const content = await readFile(planExecutorPath, "utf8");
	const parsed = parseFrontmatter(content, "agents/plan-executor.agent.md");

	assert.ok(Array.isArray(parsed.attributes.tools));
	assert.ok(parsed.attributes.tools.includes("AskUserQuestion"));
});
