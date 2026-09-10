import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import {
  candidatureOpportunityResearchAccessSchema,
  candidatureOpportunityResearchAccessUpdateSchema,
  type CandidatureOpportunityResearchAccess,
  type CandidatureOpportunityResearchAccessUpdate,
} from "../shared/candidature-opportunity-research-access-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
} from "../shared/contracts";
import {
  externalCandidatureSourceAddInputSchema,
  externalOpportunityResearchContextSchema,
  type ExternalCandidatureSourceAddInput,
  type ExternalOpportunityResearchContext,
} from "../shared/external-assistant-contracts";
import { listCandidatureFields } from "./candidature-field-service";
import { addCandidatureSource, getCandidature } from "./candidature-service";
import { withWorkspaceDatabase } from "./workspace";

interface AccessRow {
  readonly id: string;
  readonly archived: number;
  readonly selected: number;
}

type ResearchAccessActivity =
  | "candidature.opportunity-research-access.allow"
  | "candidature.opportunity-research-access.revoke";

const researchFields = Object.freeze([
  ["candidature.organization", "organisation"],
  ["candidature.role", "role"],
  ["candidature.location", "location"],
] as const);

export class CandidatureOpportunityResearchAccessServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidatureOpportunityResearchAccessServiceError";
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
      `SELECT id, archived, opportunity_research_selected AS selected
         FROM candidatures
        WHERE id = ?`,
    )
    .get(candidatureId) as unknown as AccessRow | undefined;
  if (!row) {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "The candidature no longer exists.",
    );
  }
  return row;
}

function selectedId(database: DatabaseSync): string | null {
  const row = database
    .prepare(
      `SELECT id
         FROM candidatures
        WHERE opportunity_research_selected = 1 AND archived = 0`,
    )
    .get() as unknown as { readonly id: string } | undefined;
  return row?.id ?? null;
}

function recordActivity(
  database: DatabaseSync,
  candidatureId: string,
  action: ResearchAccessActivity,
  occurredAt: string,
): void {
  database
    .prepare(
      "INSERT INTO candidature_activity(occurred_at, candidature_id, action) VALUES (?, ?, ?)",
    )
    .run(occurredAt, candidatureId, action);
}

function accessFor(row: AccessRow): CandidatureOpportunityResearchAccess {
  return candidatureOpportunityResearchAccessSchema.parse({
    candidatureId: row.id,
    allowed: row.selected === 1 && row.archived === 0,
  });
}

export function getCandidatureOpportunityResearchAccess(
  rootPath: string,
  candidatureId: string,
): CandidatureOpportunityResearchAccess {
  const parsedId = candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(
    candidatureId,
  );
  return withWorkspaceDatabase(rootPath, (database) => accessFor(requireRow(database, parsedId)));
}

export function updateCandidatureOpportunityResearchAccess(
  rootPath: string,
  rawUpdate: CandidatureOpportunityResearchAccessUpdate,
): CandidatureOpportunityResearchAccess {
  const update = candidatureOpportunityResearchAccessUpdateSchema.parse(rawUpdate);
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const current = requireRow(database, update.candidatureId);
      if (update.allowed && current.archived === 1) {
        throw new CandidatureOpportunityResearchAccessServiceError(
          "Archived candidatures cannot be selected for external opportunity research.",
        );
      }
      if ((current.selected === 1) === update.allowed) return accessFor(current);

      const now = new Date().toISOString();
      if (update.allowed) {
        const previousId = selectedId(database);
        if (previousId && previousId !== update.candidatureId) {
          database
            .prepare("UPDATE candidatures SET opportunity_research_selected = 0 WHERE id = ?")
            .run(previousId);
          recordActivity(
            database,
            previousId,
            "candidature.opportunity-research-access.revoke",
            now,
          );
        }
        database
          .prepare("UPDATE candidatures SET opportunity_research_selected = 1 WHERE id = ?")
          .run(update.candidatureId);
        recordActivity(
          database,
          update.candidatureId,
          "candidature.opportunity-research-access.allow",
          now,
        );
      } else {
        database
          .prepare("UPDATE candidatures SET opportunity_research_selected = 0 WHERE id = ?")
          .run(update.candidatureId);
        recordActivity(
          database,
          update.candidatureId,
          "candidature.opportunity-research-access.revoke",
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

function exposedValue(
  field: CandidatureFieldConfiguration,
  value: CandidatureRuntimeValue,
): string | undefined {
  if (field.preferences.aiContextMode === "omit") return undefined;
  if (field.preferences.aiContextMode === "token") return privateReference();

  const stringify = (candidate: string | number | boolean): string => {
    if (field.definition.valueType !== "choice" || typeof candidate !== "string") {
      return String(candidate);
    }
    const choice = field.definition.choices.find((item) => item.id === candidate);
    if (!choice) {
      throw new CandidatureOpportunityResearchAccessServiceError(
        "Stored opportunity-research information is invalid.",
      );
    }
    return choice.label;
  };

  const projected = Array.isArray(value)
    ? value.map(stringify).join(", ")
    : stringify(value);
  return projected.trim() ? projected : undefined;
}

export function selectedOpportunityResearchContext(
  rootPath: string,
): ExternalOpportunityResearchContext {
  const candidatureId = withWorkspaceDatabase(rootPath, selectedId);
  if (candidatureId === null) return null;

  const candidature = getCandidature(rootPath, candidatureId);
  const fields = listCandidatureFields(rootPath);
  const context: Record<string, string> = {};

  for (const [systemKey, outputKey] of researchFields) {
    const field = fields.find((candidate) => candidate.definition.systemKey === systemKey);
    if (!field) continue;
    const retained = candidature.values.find((value) => value.fieldId === field.definition.id);
    if (!retained) continue;
    const value = exposedValue(field, retained.value);
    if (value !== undefined) context[outputKey] = value;
  }

  return externalOpportunityResearchContextSchema.parse(context);
}

export function addSourceToSelectedOpportunityResearchCandidature(
  rootPath: string,
  rawInput: ExternalCandidatureSourceAddInput,
): boolean {
  const input = externalCandidatureSourceAddInputSchema.parse(rawInput);
  const candidatureId = withWorkspaceDatabase(rootPath, selectedId);
  if (candidatureId === null) return false;
  addCandidatureSource(rootPath, { candidatureId, ...input.source });
  return true;
}
