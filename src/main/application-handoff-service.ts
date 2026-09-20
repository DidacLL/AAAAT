import { lstatSync, readFileSync } from "node:fs";

import {
  applicationHandoffSchema,
  type ApplicationHandoff,
} from "../shared/application-handoff-contracts";
import {
  applicationDocumentsResultSchema,
  type ApplicationDocumentsResult,
} from "../shared/application-material-contracts";
import { createApplicationDocuments } from "./application-material-service";

export const maxApplicationHandoffBytes = 256 * 1024;

export function readApplicationHandoffFile(filePath: string): ApplicationHandoff {
  let stat;
  try {
    stat = lstatSync(filePath);
  } catch {
    throw new Error("The selected AAAAT application handoff could not be read.");
  }
  if (!stat.isFile() || stat.size > maxApplicationHandoffBytes) {
    throw new Error("The selected AAAAT application handoff is invalid or too large.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new Error("The selected AAAAT application handoff is not valid JSON.");
  }

  try {
    return applicationHandoffSchema.parse(raw);
  } catch {
    throw new Error("The selected AAAAT application handoff is invalid.");
  }
}

export async function importApplicationHandoffFile(
  rootPath: string,
  filePath: string,
): Promise<ApplicationDocumentsResult> {
  const handoff = readApplicationHandoffFile(filePath);
  return applicationDocumentsResultSchema.parse(
    await createApplicationDocuments(rootPath, handoff.intention),
  );
}
