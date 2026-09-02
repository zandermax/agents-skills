import path from "node:path";

import type { ParsedArtifactArguments } from "./artifact-arguments.js";
import type { Artifact } from "./artifacts.js";
import type { InstallCatalog } from "./catalog.js";

export interface InstallTarget {
  readonly collection: string;
  readonly directory: string;
}

export interface ArtifactRequest {
  readonly listOnly: boolean;
  readonly artifacts: readonly Artifact[];
  readonly targets: readonly InstallTarget[];
}

export interface ResolveArtifactRequestOptions {
  readonly cwd: string;
  readonly homeDirectory: string;
}

function resolveDirectory(
  directory: string,
  options: ResolveArtifactRequestOptions,
): string {
  if (directory.startsWith("~/")) {
    return path.normalize(
      path.resolve(options.homeDirectory, directory.slice(2)),
    );
  }
  return path.normalize(path.resolve(options.cwd, directory));
}

function addTarget(
  targets: InstallTarget[],
  collectionsByDirectory: Map<string, string>,
  collection: string,
  directory: string,
): void {
  const existingCollection = collectionsByDirectory.get(directory);
  if (existingCollection !== undefined && existingCollection !== collection) {
    throw new Error(
      `conflicting collections mapped to ${directory}: ${existingCollection}, ${collection}`,
    );
  }
  if (existingCollection === undefined) {
    collectionsByDirectory.set(directory, collection);
    targets.push(Object.freeze({ collection, directory }));
  }
}

function selectArtifacts(
  parsed: ParsedArtifactArguments,
  artifacts: readonly Artifact[],
): readonly Artifact[] {
  const artifactsById = new Map(
    artifacts.map((artifact) => [artifact.id, artifact]),
  );

  for (const skill of parsed.skills) {
    const artifact = artifactsById.get(skill);
    if (artifact?.kind !== "skill") {
      throw new Error(`unknown skill: ${skill}`);
    }
  }
  for (const agent of parsed.agents) {
    const artifact = artifactsById.get(agent);
    if (artifact?.kind !== "agent") {
      throw new Error(`unknown agent: ${agent}`);
    }
  }

  if (parsed.skills.length === 0 && parsed.agents.length === 0) {
    return artifacts;
  }

  const selectedIds = new Set([...parsed.skills, ...parsed.agents]);
  return artifacts.filter((artifact) => selectedIds.has(artifact.id));
}

export function resolveArtifactRequest(
  parsed: ParsedArtifactArguments,
  catalog: InstallCatalog,
  artifacts: readonly Artifact[],
  options: ResolveArtifactRequestOptions,
): ArtifactRequest {
  let selectedArtifacts = selectArtifacts(parsed, artifacts);
  if (parsed.listOnly) {
    return Object.freeze({
      listOnly: true,
      artifacts: selectedArtifacts,
      targets: Object.freeze([]),
    });
  }

  const clientsByName = new Map(
    catalog.clients.map((client) => [client.name, client]),
  );
  const collectionsByName = new Map(
    catalog.collections.map((collection) => [collection.name, collection]),
  );
  const targets: InstallTarget[] = [];
  const collectionsByDirectory = new Map<string, string>();
  const selectedClientNames =
    parsed.clients.length === 0 && !parsed.hasDestinationArguments
      ? catalog.clients.map((client) => client.name)
      : parsed.clients.includes("all")
        ? catalog.clients.map((client) => client.name)
        : parsed.clients;

  for (const clientName of selectedClientNames) {
    const client = clientsByName.get(clientName);
    if (client === undefined) {
      throw new Error(`unknown client: ${clientName}`);
    }
    for (const destination of client.destinations) {
      addTarget(
        targets,
        collectionsByDirectory,
        destination.collection,
        resolveDirectory(destination.path, options),
      );
    }
  }

  for (const directory of parsed.skillDirectories) {
    addTarget(
      targets,
      collectionsByDirectory,
      "skills",
      resolveDirectory(directory, options),
    );
  }
  for (const agentDirectory of parsed.agentDirectories) {
    const collection = collectionsByName.get(agentDirectory.collection);
    if (collection === undefined || collection.artifactKind !== "agent") {
      throw new Error(`unknown agent collection: ${agentDirectory.collection}`);
    }
    addTarget(
      targets,
      collectionsByDirectory,
      collection.name,
      resolveDirectory(agentDirectory.directory, options),
    );
  }

  const targetCollections = new Set(targets.map((target) => target.collection));
  if (parsed.skills.length === 0 && parsed.agents.length === 0) {
    selectedArtifacts = selectedArtifacts.filter((artifact) =>
      targetCollections.has(artifact.collection),
    );
  }
  for (const artifact of selectedArtifacts) {
    if (
      artifact.kind === "agent" &&
      !targetCollections.has(artifact.collection)
    ) {
      throw new Error(
        `selected agent ${artifact.id} has no target for collection ${artifact.collection}`,
      );
    }
  }

  return Object.freeze({
    listOnly: false,
    artifacts: selectedArtifacts,
    targets: Object.freeze(targets),
  });
}

export function formatArtifactListing(
  catalog: InstallCatalog,
  artifacts: readonly Artifact[],
): string {
  const clientsByCollection = new Map<string, string[]>();
  for (const client of catalog.clients) {
    for (const destination of client.destinations) {
      const clients = clientsByCollection.get(destination.collection) ?? [];
      clients.push(client.name);
      clientsByCollection.set(destination.collection, clients);
    }
  }

  return artifacts
    .map((artifact) => {
      const clients = clientsByCollection.get(artifact.collection) ?? [];
      return `${artifact.kind} ${artifact.id} [${clients.join(", ")}]`;
    })
    .join("\n");
}
