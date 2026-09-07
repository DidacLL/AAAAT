import type { DatabaseSync } from "node:sqlite";

import {
  cvAssistantTagsSchema,
  cvDescriptorSchema,
  cvDescriptorUpdateSchema,
  type CvDescriptor,
  type CvDescriptorUpdate,
} from "../shared/cv-descriptor-contracts";
import { withWorkspaceDatabase } from "./workspace";

interface CvDescriptorRow {
  readonly id: string;
  readonly kind: string;
  readonly tagsJson: string;
  readonly notes: string | null;
}

export interface AiVisibleCvDescriptor {
  readonly tags: string[];
  readonly notes: string | null;
}

class CvDescriptorServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CvDescriptorServiceError";
  }
}

function transact<T>(database: DatabaseSync, action: () => T): T {
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = action();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function requireRow(database: DatabaseSync, documentId: string): CvDescriptorRow {
  const row = database
    .prepare(
      `SELECT id, kind, ai_tags_json AS tagsJson, ai_notes AS notes
         FROM documents
        WHERE id = ?`,
    )
    .get(documentId) as unknown as CvDescriptorRow | undefined;
  if (!row) throw new CvDescriptorServiceError("The document no longer exists.");
  return row;
}

function parseTags(tagsJson: string): string[] {
  try {
    return cvAssistantTagsSchema.parse(JSON.parse(tagsJson));
  } catch {
    throw new CvDescriptorServiceError("Stored AI-visible CV tags are invalid.");
  }
}

function toDescriptor(row: CvDescriptorRow): CvDescriptor {
  return cvDescriptorSchema.parse({
    documentId: row.id,
    tags: parseTags(row.tagsJson),
    notes: row.notes,
  });
}

function requireCv(row: CvDescriptorRow): void {
  if (row.kind !== "cv") {
    throw new CvDescriptorServiceError("AI-visible CV descriptions apply only to CV documents.");
  }
}

export function getCvDescriptor(rootPath: string, documentId: string): CvDescriptor {
  return withWorkspaceDatabase(rootPath, (database) => {
    const row = requireRow(database, cvDescriptorSchema.shape.documentId.parse(documentId));
    requireCv(row);
    return toDescriptor(row);
  });
}

export function updateCvDescriptor(
  rootPath: string,
  rawUpdate: CvDescriptorUpdate,
): CvDescriptor {
  const update = cvDescriptorUpdateSchema.parse(rawUpdate);
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const current = requireRow(database, update.documentId);
      requireCv(current);
      const occurredAt = new Date().toISOString();
      database
        .prepare(
          `UPDATE documents
              SET ai_tags_json = ?, ai_notes = ?, updated_at = ?
            WHERE id = ?`,
        )
        .run(JSON.stringify(update.tags), update.notes, occurredAt, update.documentId);
      database
        .prepare(
          "INSERT INTO document_activity(occurred_at, document_id, action) VALUES (?, ?, ?)",
        )
        .run(occurredAt, update.documentId, "document.ai-description.update");
      return toDescriptor(requireRow(database, update.documentId));
    }),
  );
}

export function listAiVisibleCvDescriptors(rootPath: string): AiVisibleCvDescriptor[] {
  return withWorkspaceDatabase(rootPath, (database) =>
    (database
      .prepare(
        `SELECT id, kind, ai_tags_json AS tagsJson, ai_notes AS notes
           FROM documents
          WHERE kind = 'cv'
          ORDER BY created_at, id`,
      )
      .all() as unknown as CvDescriptorRow[])
      .map(toDescriptor)
      .filter((descriptor) => descriptor.tags.length > 0 || descriptor.notes !== null)
      .slice(0, 100)
      .map((descriptor) => ({ tags: descriptor.tags, notes: descriptor.notes })),
  );
}
