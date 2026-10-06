import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseFrontmatter } from "../src/lib/frontmatter.js";

const skillPath = new URL("../skills/decide/SKILL.md", import.meta.url);

async function readSkill(): Promise<{
	raw: string;
	attributes: Record<string, unknown>;
	body: string;
}> {
	const raw = await readFile(skillPath, "utf8");
	const { attributes, body } = parseFrontmatter(raw, "SKILL.md");
	return { raw, attributes, body };
}

test("decide skill defines valid frontmatter and metadata", async () => {
	const { attributes } = await readSkill();

	assert.equal(attributes.name, "decide");
	assert.equal(
		attributes.description,
		"Makes local typed decisions via Ollaya using choice, score, or noul.",
	);
	assert.equal(attributes["disable-model-invocation"], true);
});

test("decide skill specifies invocation, decision types, and auto-detection", async () => {
	const { body } = await readSkill();

	assert.match(body, /\/decide/);
	assert.match(body, /\bnoul\b/);
	assert.match(body, /\bchoice\b/);
	assert.match(body, /\bscore\b/);

	assert.match(body, /\/decide noul <question>/);
	assert.match(body, /\/decide choice <option1, option2, \.\.\.> <question>/);
	assert.match(body, /\/decide score <level0, level1, \.\.\.> <question>/);

	assert.match(body, /yes\/no question.*default to `noul`/i);
	assert.match(body, /discrete set of options.*default to `choice`/i);
	assert.match(body, /ordinal ranks.*default to `score`/i);
});

test("decide skill defines Ollaya discovery, health checks, and fallback startup", async () => {
	const { body } = await readSkill();

	assert.match(body, /http:\/\/127\.0\.0\.1:11435\/api\/version/);
	assert.match(body, /command -v ollaya/);
	assert.match(body, /ollaya serve/);
	assert.match(body, /for i in \$\(seq 1 5\); do/);
});

test("decide skill specifies decision API payloads and models", async () => {
	const { body } = await readSkill();

	assert.match(body, /http:\/\/127\.0\.0\.1:11435\/api\/decide/);
	assert.match(body, /winnow:e4b/);
	assert.match(body, /laya:en/);

	assert.match(body, /"type":\s*"noul"/);
	assert.match(body, /"type":\s*"choice"/);
	assert.match(body, /"type":\s*"score"/);
	assert.match(body, /"instructions":/);
	assert.match(body, /"criteria":/);
});

test("decide skill defines presentation cards for all decision types", async () => {
	const { body } = await readSkill();

	assert.match(body, /### 5\. Format and Present Decision/);
	assert.match(body, /#### For Noul/);
	assert.match(body, /noul >= 0\.5/);
	assert.match(body, /#### For Choice/);
	assert.match(body, /selected_choice/);
	assert.match(body, /#### For Score/);
	assert.match(body, /Expected score value/);
});
