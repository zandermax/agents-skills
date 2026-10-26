import {
	artifacts,
	assert,
	catalog,
	formatArtifactListing,
	test,
} from "./artifact-selection.shared.js";

test("formatArtifactListing lists each artifact once with compatible clients in catalog order", () => {
	assert.strictEqual(
		formatArtifactListing(catalog, artifacts),
		[
			"skill planning [copilot, claude]",
			"skill reviewing [copilot, claude]",
			"agent copilot:planner [copilot]",
			"agent claude:reviewer [claude]",
		].join("\n"),
	);
});
