import assert from "node:assert/strict";
import test from "node:test";

import { parseArtifactArguments } from "../src/lib/artifact-arguments.js";

test("parseArtifactArguments defaults to empty when no arguments provided", () => {
  const result = parseArtifactArguments([]);
  assert.deepEqual(result, {
    clients: [],
    skillDirectories: [],
    agentDirectories: [],
    skills: [],
    agents: [],
    listOnly: false,
    hasDestinationArguments: false,
  });
});

test("parseArtifactArguments --list sets listOnly to true", () => {
  const result = parseArtifactArguments(["--list"]);
  assert.strictEqual(result.listOnly, true);
  assert.deepEqual(result.clients, []);
  assert.deepEqual(result.skills, []);
});

test("parseArtifactArguments --client accepts single client name", () => {
  const result = parseArtifactArguments(["--client", "copilot"]);
  assert.deepEqual(result.clients, ["copilot"]);
  assert.strictEqual(result.hasDestinationArguments, true);
});

test("parseArtifactArguments --client accepts multiple client flags", () => {
  const result = parseArtifactArguments([
    "--client",
    "copilot",
    "--client",
    "claude",
  ]);
  assert.deepEqual(result.clients, ["copilot", "claude"]);
  assert.strictEqual(result.hasDestinationArguments, true);
});

test("parseArtifactArguments --client all expands to placeholder", () => {
  const result = parseArtifactArguments(["--client", "all"]);
  assert.deepEqual(result.clients, ["all"]);
});

test("parseArtifactArguments --client deduplicates while preserving order", () => {
  const result = parseArtifactArguments([
    "--client",
    "copilot",
    "--client",
    "copilot",
    "--client",
    "claude",
    "--client",
    "copilot",
  ]);
  assert.deepEqual(result.clients, ["copilot", "claude"]);
});

test("parseArtifactArguments --skills-dir parses format=path", () => {
  const result = parseArtifactArguments([
    "--skills-dir",
    "copilot=/custom/skills",
  ]);
  assert.deepEqual(result.skillDirectories, ["/custom/skills"]);
  assert.strictEqual(result.hasDestinationArguments, true);
});

test("parseArtifactArguments --skills-dir preserves relative paths without resolution", () => {
  const result = parseArtifactArguments(["--skills-dir", "copilot=./skills"]);
  assert.deepEqual(result.skillDirectories, ["./skills"]);
});

test("parseArtifactArguments --agents-dir parses format=path", () => {
  const result = parseArtifactArguments([
    "--agents-dir",
    "copilot=/custom/agents",
  ]);
  assert.deepEqual(result.agentDirectories, [
    { collection: "copilot", directory: "/custom/agents" },
  ]);
  assert.strictEqual(result.hasDestinationArguments, true);
});

test("parseArtifactArguments --agents-dir deduplicates equivalent mappings", () => {
  const result = parseArtifactArguments([
    "--agents-dir",
    "copilot=/agents",
    "--agents-dir",
    "copilot=/agents",
  ]);
  assert.deepEqual(result.agentDirectories, [
    { collection: "copilot", directory: "/agents" },
  ]);
});

test("parseArtifactArguments --skill format:name", () => {
  const result = parseArtifactArguments(["--skill", "executable-planning"]);
  assert.deepEqual(result.skills, ["executable-planning"]);
});

test("parseArtifactArguments --skill accepts multiple", () => {
  const result = parseArtifactArguments([
    "--skill",
    "planning",
    "--skill",
    "reviewing",
  ]);
  assert.deepEqual(result.skills, ["planning", "reviewing"]);
});

test("parseArtifactArguments --skill deduplicates", () => {
  const result = parseArtifactArguments([
    "--skill",
    "planning",
    "--skill",
    "planning",
  ]);
  assert.deepEqual(result.skills, ["planning"]);
});

test("parseArtifactArguments --agent format:name", () => {
  const result = parseArtifactArguments(["--agent", "copilot:planner"]);
  assert.deepEqual(result.agents, ["copilot:planner"]);
});

test("parseArtifactArguments --agent accepts multiple", () => {
  const result = parseArtifactArguments([
    "--agent",
    "copilot:planner",
    "--agent",
    "claude:reviewer",
  ]);
  assert.deepEqual(result.agents, ["copilot:planner", "claude:reviewer"]);
});

test("parseArtifactArguments --agent deduplicates", () => {
  const result = parseArtifactArguments([
    "--agent",
    "copilot:planner",
    "--agent",
    "copilot:planner",
  ]);
  assert.deepEqual(result.agents, ["copilot:planner"]);
});

test("parseArtifactArguments rejects --client with missing value", () => {
  assert.throws(
    () => parseArtifactArguments(["--client"]),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /--client.*requires/i);
      return true;
    },
  );
});

test("parseArtifactArguments rejects --skills-dir with missing value", () => {
  assert.throws(
    () => parseArtifactArguments(["--skills-dir"]),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /--skills-dir.*requires/i);
      return true;
    },
  );
});

test("parseArtifactArguments rejects --skills-dir with empty format", () => {
  assert.throws(
    () => parseArtifactArguments(["--skills-dir", "=/path"]),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /--skills-dir.*format/i);
      return true;
    },
  );
});

test("parseArtifactArguments rejects --skills-dir with empty path", () => {
  assert.throws(
    () => parseArtifactArguments(["--skills-dir", "copilot="]),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /--skills-dir.*path/i);
      return true;
    },
  );
});

test("parseArtifactArguments rejects --agents-dir with missing value", () => {
  assert.throws(
    () => parseArtifactArguments(["--agents-dir"]),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /--agents-dir.*requires/i);
      return true;
    },
  );
});

test("parseArtifactArguments rejects --agents-dir with empty format", () => {
  assert.throws(
    () => parseArtifactArguments(["--agents-dir", "=/path"]),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /--agents-dir.*format/i);
      return true;
    },
  );
});

test("parseArtifactArguments rejects --agents-dir with empty path", () => {
  assert.throws(
    () => parseArtifactArguments(["--agents-dir", "copilot="]),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /--agents-dir.*path/i);
      return true;
    },
  );
});

test("parseArtifactArguments rejects --skill with missing value", () => {
  assert.throws(
    () => parseArtifactArguments(["--skill"]),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /--skill.*requires/i);
      return true;
    },
  );
});

test("parseArtifactArguments rejects --agent with missing value", () => {
  assert.throws(
    () => parseArtifactArguments(["--agent"]),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /--agent.*requires/i);
      return true;
    },
  );
});

test("parseArtifactArguments rejects unknown flags", () => {
  assert.throws(
    () => parseArtifactArguments(["--unknown"]),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /--unknown.*unknown/i);
      return true;
    },
  );
});

test("parseArtifactArguments rejects --list with other flags", () => {
  assert.throws(
    () => parseArtifactArguments(["--list", "--client", "copilot"]),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /--list.*exclusive/i);
      return true;
    },
  );
});

test("parseArtifactArguments parses complex multi-flag combination", () => {
  const result = parseArtifactArguments([
    "--client",
    "copilot",
    "--client",
    "claude",
    "--skills-dir",
    "copilot=/custom/skills",
    "--agent",
    "copilot:planner",
    "--skill",
    "planning",
  ]);
  assert.deepEqual(result.clients, ["copilot", "claude"]);
  assert.deepEqual(result.skillDirectories, ["/custom/skills"]);
  assert.deepEqual(result.agentDirectories, []);
  assert.deepEqual(result.skills, ["planning"]);
  assert.deepEqual(result.agents, ["copilot:planner"]);
  assert.strictEqual(result.hasDestinationArguments, true);
});
