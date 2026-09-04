import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseArtifactArguments } from "../src/lib/artifact-arguments.js";
import {
  formatArtifactListing,
  resolveArtifactRequest,
} from "../src/lib/artifact-selection.js";
import { discoverArtifacts } from "../src/lib/artifacts.js";
import { loadInstallCatalog } from "../src/lib/catalog.js";
import {
  buildArtifactLinks,
  installArtifacts,
} from "../src/lib/install-artifacts.js";

function printResult(
  result: Awaited<ReturnType<typeof installArtifacts>>,
): void {
  for (const destination of result.created) {
    console.log(`created ${destination}`);
  }
  for (const destination of result.repaired) {
    console.log(`repaired ${destination}`);
  }
  for (const destination of result.existing) {
    console.log(`existing ${destination}`);
  }
  console.log(
    `summary created=${result.created.length} repaired=${result.repaired.length} existing=${result.existing.length}`,
  );
}

export async function runCli(arguments_: readonly string[]): Promise<void> {
  const scriptPath = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(scriptPath), "..");
  const catalog = await loadInstallCatalog(repoRoot);
  const artifacts = await discoverArtifacts(catalog, repoRoot);
  const parsed = parseArtifactArguments(arguments_);

  if (parsed.listOnly) {
    console.log(formatArtifactListing(catalog, artifacts));
    return;
  }

  const request = resolveArtifactRequest(parsed, catalog, artifacts, {
    cwd: process.cwd(),
    homeDirectory:
      process.env.AGENTS_SKILLS_HOME ??
      process.env.EXECUTABLE_PLANNING_HOME ??
      os.homedir(),
  });
  printResult(await installArtifacts(buildArtifactLinks(request)));
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
