import type { DatabaseSync } from "node:sqlite";

import {
  cvContentAccessSchema,
  cvContentAccessUpdateSchema,
  cvRenderAccessUpdateSchema,
  type CvContentAccess,
  type CvContentAccessUpdate,
  type CvRenderAccessUpdate,
} from "../shared/cv-content-access-contracts";
import type { ProfileItem } from "../shared/contracts";
import { renderDocument, resolveDocument } from "./document-service";
import { withWorkspaceDatabase } from "./workspace";

interface AccessRow {
  readonly id: string;
  readonly kind: string;
  readonly contentVisible: number;
  readonly renderAllowed: number;
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
      `SELECT id, kind, ai_content_visible AS contentVisible,
              ai_render_allowed AS renderAllowed
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
    renderAllowed: row.renderAllowed === 1,
  });
}

function revokeAccess(database: DatabaseSync, row: AccessRow, updatedAt: string): void {
  database
    .prepare(
      "UPDATE documents SET ai_content_visible = 0, ai_render_allowed = 0, updated_at = ? WHERE id = ?",
    )
    .run(updatedAt, row.id);
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
          .prepare(
            `SELECT id, kind, ai_content_visible AS contentVisible,
                    ai_render_allowed AS renderAllowed
               FROM documents
              WHERE ai_content_visible = 1`,
          )
          .get() as unknown as AccessRow | undefined;
        if (previous && previous.id !== update.documentId) {
          revokeAccess(database, previous, now);
        }
        database
          .prepare(
            "UPDATE documents SET ai_content_visible = 1, updated_at = ? WHERE id = ?",
          )
          .run(now, update.documentId);
      } else {
        revokeAccess(database, current, now);
      }

      return toAccess(requireRow(database, update.documentId));
    }),
  );
}

export function updateCvRenderAccess(
  rootPath: string,
  rawUpdate: CvRenderAccessUpdate,
): CvContentAccess {
  const update = cvRenderAccessUpdateSchema.parse(rawUpdate);
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const current = requireRow(database, update.documentId);
      if (update.allowed && current.contentVisible !== 1) {
        throw new CvContentAccessServiceError(
          "Allow external CV content access before allowing external rendering.",
        );
      }
      const currentlyAllowed = current.renderAllowed === 1;
      if (currentlyAllowed === update.allowed) return toAccess(current);

      database
        .prepare("UPDATE documents SET ai_render_allowed = ?, updated_at = ? WHERE id = ?")
        .run(update.allowed ? 1 : 0, new Date().toISOString(), update.documentId);
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

export async function renderExternallyAuthorizedCv(rootPath: string): Promise<boolean> {
  const documentId = withWorkspaceDatabase(rootPath, (database) => {
    const selected = database
      .prepare(
        "SELECT id FROM documents WHERE ai_content_visible = 1 AND ai_render_allowed = 1",
      )
      .get() as unknown as { readonly id: string } | undefined;
    return selected?.id ?? null;
  });
  if (documentId === null) return false;
  await renderDocument(rootPath, documentId);
  return true;
}
