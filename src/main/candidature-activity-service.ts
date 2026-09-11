import type { DatabaseSync } from "node:sqlite";

import {
  candidatureActivityCandidatureIdSchema,
  candidatureActivityListSchema,
  type CandidatureActivityKind,
  type CandidatureActivityRecord,
} from "../shared/candidature-activity-contracts";
import { withWorkspaceDatabase } from "./workspace";

interface ActivityRow {
  readonly occurredAt: string;
  readonly action: string;
}

export class CandidatureActivityServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidatureActivityServiceError";
  }
}

function activityKind(action: string): CandidatureActivityKind {
  switch (action) {
    case "candidature.created":
      return "created";
    case "candidature.updated":
      return "updated";
    case "candidature.source-added":
      return "source_added";
    case "candidature.source-updated":
      return "source_updated";
    case "candidature.source-removed":
      return "source_removed";
    case "candidature.field-value-set":
      return "information_set";
    case "candidature.field-value-cleared":
      return "information_cleared";
    case "candidature.documents-updated":
      return "documents_updated";
    case "candidature.concepts-updated":
      return "concepts_updated";
    case "candidature.artifact.capture":
      return "artifact_retained";
    case "candidature.opportunity-research-access.allow":
      return "external_research_allowed";
    case "candidature.opportunity-research-access.revoke":
      return "external_research_revoked";
    default:
      return "changed";
  }
}

function readActivity(
  database: DatabaseSync,
  candidatureId: string,
): CandidatureActivityRecord[] {
  const exists = database.prepare("SELECT 1 FROM candidatures WHERE id = ?").get(candidatureId);
  if (!exists) throw new CandidatureActivityServiceError("The candidature no longer exists.");

  const rows = database
    .prepare(
      `SELECT occurred_at AS occurredAt, action
         FROM candidature_activity
        WHERE candidature_id = ?
        ORDER BY occurred_at DESC, id DESC`,
    )
    .all(candidatureId) as unknown as ActivityRow[];

  return candidatureActivityListSchema.parse(
    rows.map((row) => ({ occurredAt: row.occurredAt, kind: activityKind(row.action) })),
  );
}

export function listCandidatureActivity(
  rootPath: string,
  candidatureId: string,
): CandidatureActivityRecord[] {
  const id = candidatureActivityCandidatureIdSchema.parse(candidatureId);
  return withWorkspaceDatabase(rootPath, (database) => readActivity(database, id));
}
