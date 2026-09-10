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
import {
  listCandidatureFieldsInDatabase,
  readCandidatureFieldValuesInDatabase,
} from "./candidature-field-service";
import {
  addCandidatureSourceInDatabase,
  listCandidatureSourcesInDatabase,
} from "./candidature-service";
import { withWorkspaceDatabase } from "./workspace";

interface AccessRow {
  readonly id: string;
  readonly archived: number;
  readonly selected: number;
}

type ResearchAccessActivity =
  | "candidature.opportunity-research-access.allow"
  | "candidature.opportunity-research-access.revoke";

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

function snapshot<T>(database: DatabaseSync, action: () => T): T {
  database.exec("BEGIN");
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

function runtimeStrings(value: CandidatureRuntimeValue): string[] {
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function tokenFactory(forbidden: readonly string[]) {
  const blocked = [...forbidden];
  return (value: string): string => {
    let placeholder: string;
    do {
      placeholder = `[AAAT_PRIVATE_${randomUUID()}]`;
    } while (blocked.some((text) => text.includes(placeholder)));
    blocked.push(value, placeholder);
    return placeholder;
  };
}

function tokenRuntimeValue(
  value: CandidatureRuntimeValue,
  token: (value: string) => string,
): CandidatureRuntimeValue {
  return Array.isArray(value)
    ? value.map((item) => token(String(item)))
    : token(String(value));
}

function exposedChoiceLabels(
  field: CandidatureFieldConfiguration,
  value: CandidatureRuntimeValue,
): CandidatureRuntimeValue {
  if (field.definition.valueType !== "choice") return value;
  const choices = new Map(field.definition.choices.map((choice) => [choice.id, choice.label]));
  const label = (candidate: string | number | boolean): string | number | boolean => {
    if (typeof candidate !== "string") return candidate;
    const resolved = choices.get(candidate);
    if (resolved === undefined) {
      throw new CandidatureOpportunityResearchAccessServiceError(
        "Stored opportunity-research information is invalid.",
      );
    }
    return resolved;
  };
  return Array.isArray(value) ? value.map(label) : label(value);
}

export function selectedOpportunityResearchContext(
  rootPath: string,
): ExternalOpportunityResearchContext {
  return withWorkspaceDatabase(rootPath, (database) =>
    snapshot(database, () => {
      const candidatureId = selectedId(database);
      if (candidatureId === null) return null;

      const fieldConfigurations = listCandidatureFieldsInDatabase(database);
      const fields = new Map(
        fieldConfigurations.map((field) => [field.definition.id, field]),
      );
      const values = readCandidatureFieldValuesInDatabase(database, candidatureId);
      const retainedSources = listCandidatureSourcesInDatabase(database, candidatureId);
      const privacyCorpus = [
        ...values.flatMap((retained) => runtimeStrings(retained.value)),
        ...fieldConfigurations.map((field) => field.definition.label),
        ...retainedSources.flatMap((source) => [source.title, source.url, source.sourceText]),
      ];
      const token = tokenFactory(privacyCorpus);

      const information = values.flatMap((retained) => {
        const field = fields.get(retained.fieldId);
        if (!field || field.preferences.aiContextMode === "omit") return [];
        return [
          {
            label: field.definition.label,
            value:
              field.preferences.aiContextMode === "token"
                ? tokenRuntimeValue(retained.value, token)
                : exposedChoiceLabels(field, retained.value),
          },
        ];
      });

      return externalOpportunityResearchContextSchema.parse({ information });
    }),
  );
}

export function addSourceToSelectedOpportunityResearchCandidature(
  rootPath: string,
  rawInput: ExternalCandidatureSourceAddInput,
): boolean {
  const input = externalCandidatureSourceAddInputSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const candidatureId = selectedId(database);
      if (candidatureId === null) return false;
      addCandidatureSourceInDatabase(
        database,
        { candidatureId, ...input.source },
        new Date().toISOString(),
      );
      return true;
    }),
  );
}
