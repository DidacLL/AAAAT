import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  availableBlueprintsSchema,
  blueprintIdSchema,
  type BlueprintSummary,
} from "../shared/document-domain-contracts";

import builtInBlueprintSource from "./latex/default-blueprint.tex?raw";

export const BUILTIN_BLUEPRINT_ID = "builtin:default";
export const BUILTIN_BLUEPRINT_SOURCE = builtInBlueprintSource;
export const BLUEPRINT_DIRECTORY_NAME = "blueprints";

function blueprintDirectory(userDataPath: string): string {
  return path.join(userDataPath, BLUEPRINT_DIRECTORY_NAME);
}

function userBlueprintId(fileName: string): string {
  return `user:${encodeURIComponent(fileName)}`;
}

function userBlueprintFiles(userDataPath: string): string[] {
  const directory = blueprintDirectory(userDataPath);
  mkdirSync(directory, { recursive: true });
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".tex"))
    .map((entry) => entry.name)
    .filter((fileName) => path.basename(fileName, path.extname(fileName)).trim().length > 0)
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

export function listAvailableBlueprints(userDataPath: string): BlueprintSummary[] {
  const blueprints: BlueprintSummary[] = [
    { id: BUILTIN_BLUEPRINT_ID, name: "AAAAT Default" },
    ...userBlueprintFiles(userDataPath).map((fileName) => ({
      id: userBlueprintId(fileName),
      name: path.basename(fileName, path.extname(fileName)),
    })),
  ];
  return availableBlueprintsSchema.parse(blueprints);
}

export function resolveBlueprintSource(userDataPath: string, rawBlueprintId: string): string {
  const blueprintId = blueprintIdSchema.parse(rawBlueprintId);
  if (blueprintId === BUILTIN_BLUEPRINT_ID) return BUILTIN_BLUEPRINT_SOURCE;

  const fileName = userBlueprintFiles(userDataPath).find(
    (candidate) => userBlueprintId(candidate) === blueprintId,
  );
  if (!fileName) throw new Error("The selected Blueprint is no longer available.");
  return readFileSync(path.join(blueprintDirectory(userDataPath), fileName), "utf8");
}
