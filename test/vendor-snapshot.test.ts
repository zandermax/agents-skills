import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { parseFrontmatter } from "../src/lib/frontmatter.js";
import {
	assertUniqueHeadings,
	listSections,
	requireSection,
} from "../src/lib/markdown-sections.js";

const SNAPSHOT_PATH = path.resolve("vendor/copilot/Plan.agent.md");
const EXPECTED_SHA256 =
	"f941698683bf4fbb09c612177d27879fc242c8a55236a9127ee899acc784adfe";
const EXPECTED_BYTES = 5250;
const EXPECTED_LINES = 105;
const REQUIRED_SECTION_HEADINGS = [
	"1. Discovery",
	"2. Alignment",
	"3. Design",
	"4. Refinement",
] as const;

function countNewlineBytes(buffer: Buffer): number {
	let count = 0;

	for (const byte of buffer) {
		if (byte === 0x0a) {
			count += 1;
		}
	}

	return count;
}

test("official Copilot Plan snapshot has pinned provenance and structure", () => {
	assert.equal(
		existsSync(SNAPSHOT_PATH),
		true,
		`expected snapshot to exist: ${SNAPSHOT_PATH}`,
	);

	const snapshotBytes = readFileSync(SNAPSHOT_PATH);

	assert.equal(snapshotBytes.byteLength, EXPECTED_BYTES);
	assert.equal(countNewlineBytes(snapshotBytes), EXPECTED_LINES);

	const digest = createHash("sha256").update(snapshotBytes).digest("hex");
	assert.equal(digest, EXPECTED_SHA256);

	const snapshotSource = snapshotBytes.toString("utf8");
	const parsed = parseFrontmatter(snapshotSource, SNAPSHOT_PATH);

	assert.ok(Object.keys(parsed.attributes).length > 0);

	const sections = listSections(parsed.body);
	assertUniqueHeadings(sections, SNAPSHOT_PATH);

	for (const heading of REQUIRED_SECTION_HEADINGS) {
		const section = requireSection(parsed.body, heading, SNAPSHOT_PATH);
		assert.equal(section.level, 2);
	}
});
