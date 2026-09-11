import { randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

import {
  applicationArtifactCaptureSchema,
  applicationArtifactListSchema,
  applicationArtifactOpenResultSchema,
  applicationArtifactRecordSchema,
  type ApplicationArtifactCapture,
  type ApplicationArtifactOpenResult,
  type ApplicationArtifactRecord,
} from "../shared/artifact-contracts";
import { getDocument, renderDocument } from "./document-service";
import { withWorkspaceDatabase } from "./workspace";

interface ArtifactRow {
  readonly id: string;
  readonly candidatureId: string;
  readonly documentId: string;
  readonly kind: "cv" | "cover_letter";
  readonly title: string;
  readonly capturedAt: string;
}

type OpenPath = (artifactPath: string) => Promise<string>;

class ArtifactServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArtifactServiceError";
  }
}

function transact(database: DatabaseSync, action: () => void): void {
  database.exec("BEGIN IMMEDIATE");
  try {
    action();
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function pathsForArtifact(rootPath: string, artifactId: string) {
  const projectPath = path.join(rootPath, "artifacts", artifactId);
  return {
    projectPath,
    sourcePath: path.join(projectPath, "main.tex"),
    artifactPath: path.join(projectPath, "build", "main.pdf"),
  };
}

function toRecord(rootPath: string, row: ArtifactRow): ApplicationArtifactRecord {
  return applicationArtifactRecordSchema.parse({
    ...row,
    ...pathsForArtifact(rootPath, row.id),
  });
}

function artifactRowById(database: DatabaseSync, artifactId: string): ArtifactRow | undefined {
  return database
    .prepare(
      `SELECT id, candidature_id AS candidatureId, document_id AS documentId,
              kind, title, captured_at AS capturedAt
         FROM application_artifacts
        WHERE id = ?`,
    )
    .get(artifactId) as ArtifactRow | undefined;
}

function assertCaptureRelation(
  database: DatabaseSync,
  candidatureId: string,
  documentId: string,
): void {
  const candidature = database
    .prepare("SELECT id FROM candidatures WHERE id = ?")
    .get(candidatureId) as { id: string } | undefined;
  if (!candidature) throw new ArtifactServiceError("The candidature no longer exists.");

  const relation = database
    .prepare(
      "SELECT candidature_id FROM candidature_documents WHERE candidature_id = ? AND document_id = ?",
    )
    .get(candidatureId, documentId) as { candidature_id: string } | undefined;
  if (!relation) {
    throw new ArtifactServiceError("Associate the working document with this candidature before retaining it.");
  }
}

function listFromDatabase(
  database: DatabaseSync,
  rootPath: string,
  candidatureId: string,
): ApplicationArtifactRecord[] {
  const rows = database
    .prepare(
      `SELECT id, candidature_id AS candidatureId, document_id AS documentId,
              kind, title, captured_at AS capturedAt
         FROM application_artifacts
        WHERE candidature_id = ?
        ORDER BY captured_at DESC, id DESC`,
    )
    .all(candidatureId) as unknown as ArtifactRow[];
  return applicationArtifactListSchema.parse(rows.map((row) => toRecord(rootPath, row)));
}

export function listApplicationArtifacts(
  rootPath: string,
  candidatureId: string,
): ApplicationArtifactRecord[] {
  const id = applicationArtifactCaptureSchema.shape.candidatureId.parse(candidatureId);
  return withWorkspaceDatabase(rootPath, (database) => listFromDatabase(database, rootPath, id));
}

export async function openApplicationArtifact(
  rootPath: string,
  rawArtifactId: string,
  openPath: OpenPath,
): Promise<ApplicationArtifactOpenResult> {
  const artifactId = applicationArtifactRecordSchema.shape.id.parse(rawArtifactId);
  const artifact = withWorkspaceDatabase(rootPath, (database) => {
    const row = artifactRowById(database, artifactId);
    if (!row) throw new ArtifactServiceError("The retained application artifact no longer exists.");
    return toRecord(rootPath, row);
  });

  try {
    if (!statSync(artifact.artifactPath).isFile()) throw new Error("not a file");
  } catch {
    throw new ArtifactServiceError("The retained application PDF is missing.");
  }

  const error = await openPath(artifact.artifactPath);
  if (error) throw new ArtifactServiceError("AAAAT could not open the retained application PDF.");
  return applicationArtifactOpenResultSchema.parse({ opened: true });
}

export async function captureApplicationArtifact(
  rootPath: string,
  rawInput: ApplicationArtifactCapture,
): Promise<ApplicationArtifactRecord> {
  const input = applicationArtifactCaptureSchema.parse(rawInput);
  withWorkspaceDatabase(rootPath, (database) =>
    assertCaptureRelation(database, input.candidatureId, input.documentId),
  );

  await renderDocument(rootPath, input.documentId);
  const document = getDocument(rootPath, input.documentId);
  if (!existsSync(document.sourcePath) || !existsSync(document.artifactPath)) {
    throw new ArtifactServiceError("The rendered document source or PDF is missing.");
  }

  const id = randomUUID();
  const capturedAt = new Date().toISOString();
  const destination = pathsForArtifact(rootPath, id);
  mkdirSync(path.dirname(destination.projectPath), { recursive: true });

  try {
    cpSync(document.projectPath, destination.projectPath, {
      recursive: true,
      errorOnExist: true,
    });
    if (!existsSync(destination.sourcePath) || !existsSync(destination.artifactPath)) {
      throw new ArtifactServiceError("AAAAT could not retain a complete application artifact.");
    }

    withWorkspaceDatabase(rootPath, (database) => {
      transact(database, () => {
        assertCaptureRelation(database, input.candidatureId, input.documentId);
        database
          .prepare(
            `INSERT INTO application_artifacts(
               id, candidature_id, document_id, kind, title, captured_at
             ) VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(id, input.candidatureId, input.documentId, document.kind, document.title, capturedAt);
        database
          .prepare(
            `INSERT INTO candidature_activity(occurred_at, candidature_id, action)
             VALUES (?, ?, 'candidature.artifact.capture')`,
          )
          .run(capturedAt, input.candidatureId);
      });
    });
  } catch (error) {
    rmSync(destination.projectPath, { recursive: true, force: true });
    throw error;
  }

  return applicationArtifactRecordSchema.parse({
    id,
    candidatureId: input.candidatureId,
    documentId: input.documentId,
    kind: document.kind,
    title: document.title,
    capturedAt,
    ...destination,
  });
}
