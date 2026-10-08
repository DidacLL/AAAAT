import type { DatabaseSync } from "node:sqlite";

import {
  applicationDocumentExternalAccessSchema,
  applicationDocumentExternalAccessUpdateSchema,
  type ApplicationDocumentExternalAccess,
  type ApplicationDocumentExternalAccessUpdate,
} from "../shared/document-domain-contracts";
import { withWorkspaceDatabase } from "./workspace";

const selectedApplicationKey = "external_ai.application_documents.selected_candidature.v1";

interface CandidatureAccessRow {
  readonly id: string;
  readonly archived: number;
}

export class ApplicationDocumentExternalAccessServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationDocumentExternalAccessServiceError";
  }
}

function candidatureRow(
  database: DatabaseSync,
  candidatureId: string,
): CandidatureAccessRow {
  const row = database
    .prepare("SELECT id, archived FROM candidatures WHERE id = ?")
    .get(candidatureId) as unknown as CandidatureAccessRow | undefined;
  if (!row) {
    throw new ApplicationDocumentExternalAccessServiceError(
      "The application no longer exists.",
    );
  }
  return row;
}

function selectedId(database: DatabaseSync): string | null {
  const stored = database
    .prepare("SELECT value FROM workspace_metadata WHERE key = ?")
    .get(selectedApplicationKey) as { readonly value: string } | undefined;
  if (!stored) return null;

  const row = database
    .prepare("SELECT id, archived FROM candidatures WHERE id = ?")
    .get(stored.value) as unknown as CandidatureAccessRow | undefined;
  if (!row || row.archived === 1) return null;
  return row.id;
}

function accessFor(
  database: DatabaseSync,
  candidatureId: string,
): ApplicationDocumentExternalAccess {
  const row = candidatureRow(database, candidatureId);
  return applicationDocumentExternalAccessSchema.parse({
    candidatureId: row.id,
    allowed: row.archived === 0 && selectedId(database) === row.id,
  });
}

export function getApplicationDocumentExternalAccess(
  rootPath: string,
  candidatureId: string,
): ApplicationDocumentExternalAccess {
  const id = applicationDocumentExternalAccessSchema.shape.candidatureId.parse(
    candidatureId,
  );
  return withWorkspaceDatabase(rootPath, (database) => accessFor(database, id));
}

export function updateApplicationDocumentExternalAccess(
  rootPath: string,
  rawUpdate: ApplicationDocumentExternalAccessUpdate,
): ApplicationDocumentExternalAccess {
  const update = applicationDocumentExternalAccessUpdateSchema.parse(rawUpdate);
  return withWorkspaceDatabase(rootPath, (database) => {
    const row = candidatureRow(database, update.candidatureId);
    if (update.allowed && row.archived === 1) {
      throw new ApplicationDocumentExternalAccessServiceError(
        "Archived applications cannot be used for external document work.",
      );
    }

    if (update.allowed) {
      database
        .prepare(
          `INSERT INTO workspace_metadata(key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        )
        .run(selectedApplicationKey, update.candidatureId);
    } else {
      database
        .prepare("DELETE FROM workspace_metadata WHERE key = ? AND value = ?")
        .run(selectedApplicationKey, update.candidatureId);
    }
    return accessFor(database, update.candidatureId);
  });
}

export function selectedApplicationDocumentExternalAccessId(
  rootPath: string,
): string | null {
  return withWorkspaceDatabase(rootPath, selectedId);
}

export function revokeApplicationDocumentExternalAccessInDatabase(
  database: DatabaseSync,
  candidatureId: string,
): void {
  database
    .prepare("DELETE FROM workspace_metadata WHERE key = ? AND value = ?")
    .run(selectedApplicationKey, candidatureId);
}
