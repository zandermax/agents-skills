import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const checkerPath = new URL(
	"../.agents/skills/plan-checker/SKILL.md",
	import.meta.url,
);
const honePath = new URL(
	"../.agents/skills/hone-the-plan/SKILL.md",
	import.meta.url,
);

async function readSkills(): Promise<{
	checker: string;
	hone: string;
}> {
	return {
		checker: await readFile(checkerPath, "utf8"),
		hone: await readFile(honePath, "utf8"),
	};
}

test("plan-checker defines target selection and plan safety boundaries", async () => {
	const { checker } = await readSkills();

	assert.match(checker, /explicitly supplied plan/);
	assert.match(checker, /eligible active plan document/);
	assert.match(checker, /latest complete plan in conversation/);
	assert.match(checker, /must not be mutated/);
	assert.match(checker, /Never edit implementation code/);
});

test("plan-checker defines layered readiness and evidence rules", async () => {
	const { checker } = await readSkills();

	assert.match(checker, /Apply the general rubric to every plan/);
	assert.match(
		checker,
		/When the plan follows executable-planning conventions/,
	);
	assert.match(checker, /explicitly state that the format was detected/);
	assert.match(
		checker,
		/classify every missing execution-critical field as an `error`/,
	);
	assert.match(checker, /`error`: contradiction/);
	assert.match(checker, /The verdict is `ready` only when no `error` remains/);
	assert.match(checker, /labeled `unverified`/);
});

test("plan-checker owns the shared risk screen and bounded repair loop", async () => {
	const { checker } = await readSkills();

	assert.match(checker, /The authoritative automatic-review triggers are/);
	assert.match(checker, /three or more phases/);
	assert.match(checker, /A simple plan may skip separate review/);
	assert.match(checker, /at most two repair cycles/);
	assert.match(checker, /If blocking errors remain, return `not-ready`/);
	assert.match(checker, /Always end with a complete final report/);
});

test("plan-checker separates interactive and autopilot decisions", async () => {
	const { checker } = await readSkills();

	assert.match(checker, /In interactive mode/);
	assert.match(checker, /Present decision points as concrete options/);
	assert.match(checker, /If no interactive question mechanism exists/);
	assert.match(checker, /In autopilot mode/);
	assert.match(checker, /Resolve decisions conservatively/);
	assert.match(checker, /Record each assumption/);
});

test("plan-checker defines a persistence-stable freshness fingerprint", async () => {
	const { checker } = await readSkills();

	assert.match(checker, /normalized reviewable plan content/);
	assert.match(checker, /Equivalent conversational and persisted plans/);
	assert.match(checker, /Any semantic plan change invalidates a prior verdict/);
	assert.match(checker, /step completion markers/);
	assert.match(checker, /recorded execution evidence/);
	assert.match(checker, /user confirmation.*satisfies readiness/i);
});

test("hone-the-plan delegates to plan-checker in autopilot mode", async () => {
	const { hone } = await readSkills();

	assert.match(hone, /name: hone-the-plan/);
	assert.match(hone, /disable-model-invocation: true/);
	assert.match(hone, /plan-checker/);
	assert.match(hone, /Run in autopilot mode/);
	assert.match(hone, /Apply all recommended fixes/);
	assert.match(hone, /maximum of two repair cycles/);
	assert.match(hone, /complete plan-checker final report/);
	assert.match(hone, /Do not implement the plan/);
});

test("hone-the-plan does not duplicate the checker rubric", async () => {
	const { checker, hone } = await readSkills();
	const checkerHeadings = [...checker.matchAll(/^## (.+)$/gm)].map(
		(match) => match[1],
	);

	for (const heading of checkerHeadings) {
		assert.doesNotMatch(hone, new RegExp(`^## ${heading}$`, "m"));
	}
});
