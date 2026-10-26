import {
	assert,
	BEHAVIORAL_FIXTURES_PATH,
	EVAL_TASKS_DIR,
	existsSync,
	expectedProjectOwnedRuleIds,
	PLAN_IT_OUT_PATH,
	path,
	REPO_ROOT,
	readdirSync,
	readFileSync,
	test,
} from "./executable-planning-skill.shared.js";

test("plan-it-out references the current executable-planning workflow", () => {
	const content = readFileSync(PLAN_IT_OUT_PATH, "utf8");

	for (const staleHeading of [
		"Canonical Plan Artifact",
		"Clarify First",
		"Plan Design",
		"Phase Elaboration",
		"Required Plan Format",
	]) {
		assert.doesNotMatch(content, new RegExp(staleHeading));
	}
	assert.match(content, /Discover/);
	assert.match(content, /Clarify at outline level/);
	assert.match(
		content,
		/description: Runs interactive planning with session-only or repo-backed storage\./,
	);
	assert.doesNotMatch(content, /Storage is always session-only/);
	assert.match(
		content,
		/Repo-backed, only when requested: create and update the canonical plan at\s+`docs\/plans\/<slug>\.md`/,
	);
});

test("executable planner agent requests free-text user-test observations", () => {
	const agent = readFileSync(
		path.join(REPO_ROOT, "agents", "executable-planner.agent.md"),
		"utf8",
	);

	assert.match(agent, /User Test.*free-text.*observation/i);
	assert.match(agent, /must not.*expected result/i);
	assert.match(agent, /No checkpoint tests yet\./);
});

test("behavioral pressure fixtures are complete and cover project-owned rules", () => {
	assert.equal(
		existsSync(BEHAVIORAL_FIXTURES_PATH),
		true,
		`missing file: ${BEHAVIORAL_FIXTURES_PATH}`,
	);

	const parsed = JSON.parse(
		readFileSync(BEHAVIORAL_FIXTURES_PATH, "utf8"),
	) as unknown;

	assert.equal(Array.isArray(parsed), true);
	if (!Array.isArray(parsed)) {
		assert.fail("behavioral fixtures must be an array");
	}

	assert.equal(parsed.length, 16);
	assert.equal(
		readdirSync(EVAL_TASKS_DIR).filter((entry) => entry.endsWith(".yaml"))
			.length,
		parsed.length,
		"every behavioral fixture must have a Waza task",
	);

	const seenPrompts = new Set<string>();
	const observedRuleIds = new Set<string>();

	for (const [index, caseValue] of parsed.entries()) {
		assert.equal(typeof caseValue, "object", `case ${index} must be object`);
		assert.notEqual(caseValue, null, `case ${index} must be non-null`);

		const record = caseValue as Record<string, unknown>;
		assert.deepEqual(Object.keys(record).sort(), [
			"forbiddenBehaviors",
			"prompt",
			"requiredBehaviors",
		]);

		assert.equal(
			typeof record.prompt,
			"string",
			`case ${index} prompt must be string`,
		);
		assert.notEqual(String(record.prompt).trim().length, 0);
		assert.equal(seenPrompts.has(String(record.prompt)), false);
		seenPrompts.add(String(record.prompt));

		assert.equal(Array.isArray(record.requiredBehaviors), true);
		assert.equal(Array.isArray(record.forbiddenBehaviors), true);

		const required = record.requiredBehaviors as unknown[];
		const forbidden = record.forbiddenBehaviors as unknown[];

		assert.ok(
			required.length > 0,
			`case ${index} requiredBehaviors must be non-empty`,
		);
		assert.ok(
			forbidden.length > 0,
			`case ${index} forbiddenBehaviors must be non-empty`,
		);

		for (const behavior of required) {
			assert.equal(typeof behavior, "string");
			assert.notEqual(String(behavior).trim().length, 0);

			const text = String(behavior);
			const match = /^\[(R\d{2}-[a-z0-9-]+)\]\s+/.exec(text);
			if (!match) {
				assert.fail(
					`case ${index} requiredBehaviors must start with explicit rule id tag`,
				);
			}

			const ruleId = match[1];
			if (!ruleId) {
				assert.fail(
					`case ${index} requiredBehaviors must include a rule id match`,
				);
			}
			assert.equal(
				expectedProjectOwnedRuleIds.includes(ruleId),
				true,
				`unknown required rule id in fixture: ${ruleId}`,
			);
			observedRuleIds.add(ruleId);
		}

		for (const behavior of forbidden) {
			assert.equal(typeof behavior, "string");
			assert.notEqual(String(behavior).trim().length, 0);

			const text = String(behavior);
			const match = /^\[(R\d{2}-[a-z0-9-]+)\]\s+/.exec(text);
			if (!match) {
				assert.fail(
					`case ${index} forbiddenBehaviors must start with explicit rule id tag`,
				);
			}

			const ruleId = match[1];
			if (!ruleId) {
				assert.fail(
					`case ${index} forbiddenBehaviors must include a rule id match`,
				);
			}
			assert.equal(
				expectedProjectOwnedRuleIds.includes(ruleId),
				true,
				`unknown forbidden rule id in fixture: ${ruleId}`,
			);
		}
	}

	assert.deepEqual(
		[...observedRuleIds].sort(),
		[...expectedProjectOwnedRuleIds].sort(),
		"every project-owned rule must be required by at least one scenario",
	);
});
