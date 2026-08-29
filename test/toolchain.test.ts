import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

type PackageJson = {
	type?: string;
	engines?: {
		node?: string;
		npm?: string;
	};
	scripts?: Record<string, string>;
};

test("toolchain package contract is configured", async () => {
	const packageJsonText = await readFile(
		new URL("../package.json", import.meta.url),
		"utf8",
	);
	const packageJson = JSON.parse(packageJsonText) as PackageJson;

	assert.equal(packageJson.type, "module");
	assert.equal(packageJson.engines?.node, "24.15.0");
	assert.equal(packageJson.scripts?.install, undefined);

	assert.equal(typeof packageJson.scripts?.["install:clients"], "string");
	assert.equal(typeof packageJson.scripts?.format, "string");
	assert.equal(typeof packageJson.scripts?.lint, "string");
	assert.equal(typeof packageJson.scripts?.typecheck, "string");
	assert.equal(typeof packageJson.scripts?.check, "string");
});
