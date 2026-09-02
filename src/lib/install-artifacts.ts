import { lstat, mkdir, readlink, realpath, symlink } from "node:fs/promises";
import path from "node:path";

import type { ArtifactRequest } from "./artifact-selection.js";

export interface ResolvedLink {
  readonly kind: "file" | "directory";
  readonly sourcePath: string;
  readonly destinationPath: string;
}

export interface InstallResult {
  readonly created: readonly string[];
  readonly existing: readonly string[];
}

function normalizePath(targetPath: string): string {
  return path.normalize(path.resolve(targetPath));
}

function deduplicateLinks(
  links: readonly ResolvedLink[],
): readonly ResolvedLink[] {
  const linksByDestination = new Map<string, ResolvedLink>();
  for (const link of links) {
    const destination = normalizePath(link.destinationPath);
    const existing = linksByDestination.get(destination);
    if (existing === undefined) {
      linksByDestination.set(destination, link);
      continue;
    }
    if (
      existing.kind !== link.kind ||
      normalizePath(existing.sourcePath) !== normalizePath(link.sourcePath)
    ) {
      throw new Error(`Conflicting destination mappings: ${destination}`);
    }
  }
  return Array.from(linksByDestination.values());
}

async function validateSource(link: ResolvedLink): Promise<void> {
  try {
    const stats = await lstat(link.sourcePath);
    if (link.kind === "file" && !stats.isFile()) {
      throw new Error(`Source is not a file: ${link.sourcePath}`);
    }
    if (link.kind === "directory" && !stats.isDirectory()) {
      throw new Error(`Source is not a directory: ${link.sourcePath}`);
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new Error(`Source is missing: ${link.sourcePath}`);
    }
    throw error;
  }
}

async function classifyDestination(
  link: ResolvedLink,
): Promise<"create" | "existing"> {
  const stats = await lstat(link.destinationPath).catch((error: unknown) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }
    throw error;
  });
  if (stats === undefined) {
    return "create";
  }
  if (!stats.isSymbolicLink()) {
    throw new Error(
      `Destination exists and is not a symlink: ${link.destinationPath}`,
    );
  }

  const currentTarget = await readlink(link.destinationPath);
  const absoluteTarget = path.resolve(
    path.dirname(link.destinationPath),
    currentTarget,
  );
  let actualSource: string;
  try {
    actualSource = normalizePath(await realpath(absoluteTarget));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new Error(
        `Destination symlink is broken: ${link.destinationPath} -> ${currentTarget}`,
      );
    }
    throw error;
  }

  const expectedSource = normalizePath(await realpath(link.sourcePath));
  if (actualSource !== expectedSource) {
    throw new Error(
      `Destination symlink points elsewhere: ${link.destinationPath} -> ${currentTarget}`,
    );
  }
  return "existing";
}

function symlinkType(kind: ResolvedLink["kind"]): "file" | "dir" {
  return kind === "directory" ? "dir" : "file";
}

export function buildArtifactLinks(
  request: ArtifactRequest,
): readonly ResolvedLink[] {
  const links: ResolvedLink[] = [];
  for (const target of request.targets) {
    for (const artifact of request.artifacts) {
      if (artifact.collection !== target.collection) {
        continue;
      }
      links.push(
        Object.freeze({
          kind: artifact.entryKind,
          sourcePath: artifact.sourcePath,
          destinationPath: path.join(
            target.directory,
            artifact.destinationName,
          ),
        }),
      );
    }
  }
  return Object.freeze(links);
}

export async function installArtifacts(
  links: readonly ResolvedLink[],
): Promise<InstallResult> {
  const deduplicatedLinks = deduplicateLinks(links);
  const errors: string[] = [];
  const actions: Array<{ link: ResolvedLink; action: "create" | "existing" }> =
    [];

  for (const link of deduplicatedLinks) {
    try {
      await validateSource(link);
      actions.push({ link, action: await classifyDestination(link) });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (errors.length > 0) {
    throw new Error(`Install validation failed:\n- ${errors.join("\n- ")}`);
  }

  const created: string[] = [];
  const existing: string[] = [];
  for (const { link, action } of actions) {
    if (action === "existing") {
      existing.push(link.destinationPath);
      continue;
    }
    await mkdir(path.dirname(link.destinationPath), { recursive: true });
    try {
      await symlink(
        link.sourcePath,
        link.destinationPath,
        symlinkType(link.kind),
      );
    } catch (error) {
      if (
        process.platform === "win32" &&
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "EPERM"
      ) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `${message}. On Windows, enable Developer Mode or grant symlink permission.`,
        );
      }
      throw error;
    }
    created.push(link.destinationPath);
  }
  return Object.freeze({
    created: Object.freeze(created),
    existing: Object.freeze(existing),
  });
}
