import { statSync } from "node:fs";

import {
  documentOutputOpenResultSchema,
  type DocumentOutputOpenResult,
} from "../shared/document-output-contracts";
import { getDocument } from "./document-service";

type OpenPath = (outputPath: string) => Promise<string>;

export class DocumentOutputServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentOutputServiceError";
  }
}

export async function openDocumentOutput(
  rootPath: string,
  documentId: string,
  openPath: OpenPath,
): Promise<DocumentOutputOpenResult> {
  const outputPath = getDocument(rootPath, documentId).artifactPath;
  try {
    if (!statSync(outputPath).isFile()) throw new Error("not a file");
  } catch {
    throw new DocumentOutputServiceError("Render this document before opening its PDF.");
  }

  const error = await openPath(outputPath);
  if (error) {
    throw new DocumentOutputServiceError("AAAAT could not open the rendered PDF.");
  }
  return documentOutputOpenResultSchema.parse({ opened: true });
}

export async function openDocumentProject(
  rootPath: string,
  documentId: string,
  openPath: OpenPath,
): Promise<DocumentOutputOpenResult> {
  const projectPath = getDocument(rootPath, documentId).projectPath;
  try {
    if (!statSync(projectPath).isDirectory()) throw new Error("not a directory");
  } catch {
    throw new DocumentOutputServiceError("The live document source project is unavailable.");
  }

  const error = await openPath(projectPath);
  if (error) {
    throw new DocumentOutputServiceError("AAAAT could not open the document source project.");
  }
  return documentOutputOpenResultSchema.parse({ opened: true });
}
