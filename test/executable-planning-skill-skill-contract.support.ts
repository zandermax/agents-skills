import {
	assert,
	buildSkills,
	CONTENT_PATH,
	existsSync,
	expectedH2Order,
	forbiddenPhrases,
	listSections,
	MANIFEST_PATH,
	OUTPUT_PATH,
	parseFrontmatter,
	parseSkillManifest,
	REPO_ROOT,
	readFileSync,
	requiredPhrases,
	test,
} from "./executable-planning-skill.shared.js";

test("executable-planning skill composes required static contract", async () => {
	for (const requiredPath of [MANIFEST_PATH, CONTENT_PATH]) {
		assert.equal(
			existsSync(requiredPath),
			true,
			`missing file: ${requiredPath}`,
		);
	}

	const manifest = parseSkillManifest(
		JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as unknown,
		MANIFEST_PATH,
		REPO_ROOT,
	);

	assert.ok(!/^(?:use|run|call)\b/i.test(manifest.description));

	const ownershipEntries = new Map<string, string>();
	for (const selection of manifest.selections) {
		for (const heading of selection.headings) {
			assert.equal(
				ownershipEntries.has(heading),
				false,
				`duplicate owner mapping for heading: ${heading}`,
			);
			ownershipEntries.set(heading, selection.owner);
			assert.equal(manifest.sectionOwnership[heading], selection.owner);
		}
	}
	assert.equal(ownershipEntries.size, expectedH2Order.length);

	await buildSkills({ repoRoot: REPO_ROOT, mode: "write" });
	assert.equal(existsSync(OUTPUT_PATH), true, `missing output: ${OUTPUT_PATH}`);

	const rendered = readFileSync(OUTPUT_PATH, "utf8");
	const parsed = parseFrontmatter(rendered, OUTPUT_PATH);
	assert.deepEqual(Object.keys(parsed.attributes), [
		"name",
		"description",
		"disable-model-invocation",
	]);
	assert.ok(
		!/^(?:use|run|call)\b/i.test(String(parsed.attributes.description ?? "")),
	);

	const h2Order = listSections(rendered)
		.filter((section) => section.level === 2)
		.map((section) => section.heading);
	assert.deepEqual(h2Order, expectedH2Order);

	for (const phrase of requiredPhrases) {
		assert.equal(
			rendered.includes(phrase),
			true,
			`missing required phrase: ${phrase}`,
		);
	}
	assert.match(
		rendered,
		/When the requester explicitly asks for a repo-backed plan, create or update the canonical file before presenting the plan/,
	);

	for (const phrase of forbiddenPhrases) {
		assert.equal(
			rendered.includes(phrase),
			false,
			`forbidden phrase present: ${phrase}`,
		);
	}

	for (const conditionalPhasePhrase of [
		"For plans with many steps",
		"For plans with 5+ steps",
	]) {
		assert.equal(
			rendered.includes(conditionalPhasePhrase),
			false,
			`conditional phase guidance must be removed: ${conditionalPhasePhrase}`,
		);
	}
});

test("supplied planning contract section set remains stable", () => {
	assert.equal(existsSync(CONTENT_PATH), true, `missing file: ${CONTENT_PATH}`);

	const headings = listSections(readFileSync(CONTENT_PATH, "utf8"))
		.filter((section) => section.level === 2)
		.map((section) => section.heading);

	assert.deepEqual(headings, expectedH2Order);
});
