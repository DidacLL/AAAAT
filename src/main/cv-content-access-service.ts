import type { DatabaseSync } from "node:sqlite";

import {
  cvContentAccessSchema,
  cvContentAccessUpdateSchema,
  type CvContentAccess,
  type CvContentAccessUpdate,
} from "../shared/cv-content-access-contracts";
import type { ProfileItem } from "../shared/contracts";
import { resolveDocument } from "./document-service";
import { withWorkspaceDatabase } from "./workspace";

interface AccessRow {
  readonly id: string;
  readonly kind: string;
  readonly contentVisible: number;
}

class CvContentAccessServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CvContentAccessServiceError";
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

function requireRow(database: DatabaseSync, documentId: string): AccessRow {
  const row = database
    .prepare(
      `SELECT id, kind, ai_content_visible AS contentVisible
         FROM documents
        WHERE id = ?`,
    )
    .get(documentId) as unknown as AccessRow | undefined;
  if (!row) throw new CvContentAccessServiceError("The document no longer exists.");
  if (row.kind !== "cv") {
    throw new CvContentAccessServiceError(
      "External CV content access applies only to CV documents.",
    );
  }
  return row;
}

function toAccess(row: AccessRow): CvContentAccess {
  return cvContentAccessSchema.parse({
    documentId: row.id,
    allowed: row.contentVisible === 1,
  });
}

function recordActivity(
  database: DatabaseSync,
  documentId: string,
  action: "document.ai-content-access.allow" | "document.ai-content-access.revoke",
  occurredAt: string,
): void {
  database
    .prepare(
      "INSERT INTO document_activity(occurred_at, document_id, action) VALUES (?, ?, ?)",
    )
    .run(occurredAt, documentId, action);
}

export function getCvContentAccess(rootPath: string, documentId: string): CvContentAccess {
  const parsedId = cvContentAccessSchema.shape.documentId.parse(documentId);
  return withWorkspaceDatabase(rootPath, (database) => toAccess(requireRow(database, parsedId)));
}

export function updateCvContentAccess(
  rootPath: string,
  rawUpdate: CvContentAccessUpdate,
): CvContentAccess {
  const update = cvContentAccessUpdateSchema.parse(rawUpdate);
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const current = requireRow(database, update.documentId);
      const currentlyAllowed = current.contentVisible === 1;
      if (currentlyAllowed === update.allowed) return toAccess(current);

      const now = new Date().toISOString();
      if (update.allowed) {
        const previous = database
          .prepare("SELECT id FROM documents WHERE ai_content_visible = 1")
          .get() as unknown as { readonly id: string } | undefined;
        if (previous && previous.id !== update.documentId) {
          database
            .prepare(
              "UPDATE documents SET ai_content_visible = 0, updated_at = ? WHERE id = ?",
            )
            .run(now, previous.id);
          recordActivity(database, previous.id, "document.ai-content-access.revoke", now);
        }
        database
          .prepare(
            "UPDATE documents SET ai_content_visible = 1, updated_at = ? WHERE id = ?",
          )
          .run(now, update.documentId);
        recordActivity(database, update.documentId, "document.ai-content-access.allow", now);
      } else {
        database
          .prepare(
            "UPDATE documents SET ai_content_visible = 0, updated_at = ? WHERE id = ?",
          )
          .run(now, update.documentId);
        recordActivity(database, update.documentId, "document.ai-content-access.revoke", now);
      }

      return toAccess(requireRow(database, update.documentId));
    }),
  );
}

export function selectedCvContentItems(rootPath: string): ProfileItem[] | null {
  const documentId = withWorkspaceDatabase(rootPath, (database) => {
    const selected = database
      .prepare("SELECT id FROM documents WHERE ai_content_visible = 1")
      .get() as unknown as { readonly id: string } | undefined;
    return selected?.id ?? null;
  });
  return documentId === null ? null : resolveDocument(rootPath, documentId).items;
}
