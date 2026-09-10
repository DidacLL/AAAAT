import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import {
  candidatureExternalAccessSchema,
  candidatureExternalAccessUpdateSchema,
  type CandidatureExternalAccess,
  type CandidatureExternalAccessUpdate,
} from "../shared/candidature-external-access-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
} from "../shared/contracts";
import {
  externalCandidatureContextSchema,
  externalCandidatureSourceAddInputSchema,
  type ExternalCandidatureContext,
  type ExternalCandidatureSourceAddInput,
} from "../shared/external-assistant-contracts";
import { listCandidatureFields } from "./candidature-field-service";
import {
  addCandidatureSource,
  getCandidature,
} from "./candidature-service";
import { withWorkspaceDatabase } from "./workspace";

interface AccessRow {
  readonly id: string;
  readonly archived: number;
  readonly selected: number;
}

export class CandidatureExternalAccessServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidatureExternalAccessServiceError";
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

function requireRow(database: DatabaseSync, candidatureId: string): AccessRow {
  const row = database
    .prepare(
      `SELECT id, archived, external_assistant_selected AS selected
         FROM candidatures
        WHERE id = ?`,
    )
    .get(candidatureId) as unknown as AccessRow | undefined;
  if (!row) {
    throw new CandidatureExternalAccessServiceError("The candidature no longer exists.");
  }
  return row;
}

function selectedId(database: DatabaseSync): string | null {
  const row = database
    .prepare(
      `SELECT id
         FROM candidatures
        WHERE external_assistant_selected = 1 AND archived = 0`,
    )
    .get() as unknown as { readonly id: string } | undefined;
  return row?.id ?? null;
}

function recordActivity(
  database: DatabaseSync,
  candidatureId: string,
  action: "candidature.external-assistant-access.allow" | "candidature.external-assistant-access.revoke",
  occurredAt: string,
): void {
  database
    .prepare(
      "INSERT INTO candidature_activity(occurred_at, candidature_id, action) VALUES (?, ?, ?)",
    )
    .run(occurredAt, candidatureId, action);
}

function accessFor(row: AccessRow): CandidatureExternalAccess {
  return candidatureExternalAccessSchema.parse({
    candidatureId: row.id,
    allowed: row.selected === 1 && row.archived === 0,
  });
}

export function getCandidatureExternalAccess(
  rootPath: string,
  candidatureId: string,
): CandidatureExternalAccess {
  const parsedId = candidatureExternalAccessSchema.shape.candidatureId.parse(candidatureId);
  return withWorkspaceDatabase(rootPath, (database) => accessFor(requireRow(database, parsedId)));
}

export function updateCandidatureExternalAccess(
  rootPath: string,
  rawUpdate: CandidatureExternalAccessUpdate,
): CandidatureExternalAccess {
  const update = candidatureExternalAccessUpdateSchema.parse(rawUpdate);
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const current = requireRow(database, update.candidatureId);
      if (update.allowed && current.archived === 1) {
        throw new CandidatureExternalAccessServiceError(
          "Archived candidatures cannot be shared with an external assistant.",
        );
      }
      if ((current.selected === 1) === update.allowed) return accessFor(current);

      const now = new Date().toISOString();
      if (update.allowed) {
        const previousId = selectedId(database);
        if (previousId && previousId !== update.candidatureId) {
          database
            .prepare("UPDATE candidatures SET external_assistant_selected = 0 WHERE id = ?")
            .run(previousId);
          recordActivity(
            database,
            previousId,
            "candidature.external-assistant-access.revoke",
            now,
          );
        }
        database
          .prepare("UPDATE candidatures SET external_assistant_selected = 1 WHERE id = ?")
          .run(update.candidatureId);
        recordActivity(
          database,
          update.candidatureId,
          "candidature.external-assistant-access.allow",
          now,
        );
      } else {
        database
          .prepare("UPDATE candidatures SET external_assistant_selected = 0 WHERE id = ?")
          .run(update.candidatureId);
        recordActivity(
          database,
          update.candidatureId,
          "candidature.external-assistant-access.revoke",
          now,
        );
      }

      return accessFor(requireRow(database, update.candidatureId));
    }),
  );
}

function privateReference(): string {
  return `[AAAT_PRIVATE_${randomUUID()}]`;
}

function tokenValue(value: CandidatureRuntimeValue): CandidatureRuntimeValue {
  return Array.isArray(value) ? value.map(() => privateReference()) : privateReference();
}

function choiceLabels(
  field: CandidatureFieldConfiguration,
  value: CandidatureRuntimeValue,
): CandidatureRuntimeValue {
  if (field.definition.valueType !== "choice") return value;
  const labels = new Map(field.definition.choices.map((choice) => [choice.id, choice.label]));
  const label = (candidate: string | number | boolean) =>
    typeof candidate === "string" ? (labels.get(candidate) ?? candidate) : candidate;
  return Array.isArray(value) ? value.map(label) : label(value);
}

export function selectedExternalCandidatureContext(
  rootPath: string,
): ExternalCandidatureContext {
  const candidatureId = withWorkspaceDatabase(rootPath, selectedId);
  if (candidatureId === null) return null;

  const candidature = getCandidature(rootPath, candidatureId);
  const fields = new Map(
    listCandidatureFields(rootPath).map((field) => [field.definition.id, field]),
  );
  const information = candidature.values.flatMap((retained) => {
    const field = fields.get(retained.fieldId);
    if (!field || field.preferences.aiContextMode === "omit") return [];
    return [
      {
        label: field.definition.label,
        value:
          field.preferences.aiContextMode === "token"
            ? tokenValue(retained.value)
            : choiceLabels(field, retained.value),
      },
    ];
  });
  return externalCandidatureContextSchema.parse({ information });
}

export function addSourceToSelectedExternalCandidature(
  rootPath: string,
  rawInput: ExternalCandidatureSourceAddInput,
): boolean {
  const input = externalCandidatureSourceAddInputSchema.parse(rawInput);
  const candidatureId = withWorkspaceDatabase(rootPath, selectedId);
  if (candidatureId === null) return false;
  addCandidatureSource(rootPath, { candidatureId, ...input.source });
  return true;
}
