import type { DatabaseSync } from "node:sqlite";

import {
  candidatureAiTaskTemplateSaveSchema,
  candidatureAiTaskTemplatesSchema,
  candidatureOpportunityResearchAccessSchema,
  candidatureOpportunityResearchAccessUpdateSchema,
  candidatureOpportunityResearchTaskInstructionSchema,
  type CandidatureAiTaskTemplate,
  type CandidatureAiTaskTemplateSave,
  type CandidatureOpportunityResearchAccess,
  type CandidatureOpportunityResearchAccessUpdate,
  type CandidatureOpportunityResearchTaskContext,
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
import { addCandidatureSourceInDatabase } from "./candidature-service";
import { withWorkspaceDatabase } from "./workspace";

interface AccessRow {
  readonly id: string;
  readonly archived: number;
  readonly selected: number;
}

type ResearchAccessActivity =
  | "candidature.opportunity-research-access.allow"
  | "candidature.opportunity-research-access.revoke";

const candidatureTaskTemplatesKey = "external_ai.candidature_task_templates.v1";

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
          "Archived candidatures cannot be used with external AI.",
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

function readTaskTemplates(database: DatabaseSync): CandidatureAiTaskTemplate[] {
  const row = database
    .prepare("SELECT value FROM workspace_metadata WHERE key = ?")
    .get(candidatureTaskTemplatesKey) as { readonly value: string } | undefined;
  if (!row) return [];
  try {
    return candidatureAiTaskTemplatesSchema.parse(JSON.parse(row.value) as unknown);
  } catch {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "Saved AI task templates are invalid.",
    );
  }
}

function writeTaskTemplates(database: DatabaseSync, templates: readonly CandidatureAiTaskTemplate[]): void {
  const parsed = candidatureAiTaskTemplatesSchema.parse(templates);
  database
    .prepare(
      `INSERT INTO workspace_metadata(key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(candidatureTaskTemplatesKey, JSON.stringify(parsed));
}

export function listCandidatureAiTaskTemplates(rootPath: string): CandidatureAiTaskTemplate[] {
  return withWorkspaceDatabase(rootPath, (database) => readTaskTemplates(database));
}

export function saveCandidatureAiTaskTemplate(
  rootPath: string,
  rawInput: CandidatureAiTaskTemplateSave,
): CandidatureAiTaskTemplate {
  const input = candidatureAiTaskTemplateSaveSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const templates = readTaskTemplates(database);
      const duplicate = templates.find(
        (candidate) => candidate.name.toLocaleLowerCase() === input.name.toLocaleLowerCase()
          && candidate.id !== input.id,
      );
      if (duplicate) {
        throw new CandidatureOpportunityResearchAccessServiceError(
          "A saved AI task already uses that name.",
        );
      }
      const id = input.id ?? crypto.randomUUID();
      if (input.id && !templates.some((candidate) => candidate.id === input.id)) {
        throw new CandidatureOpportunityResearchAccessServiceError(
          "The saved AI task no longer exists.",
        );
      }
      const saved = {
        id,
        name: input.name,
        instruction: input.instruction,
      } satisfies CandidatureAiTaskTemplate;
      const next = templates.filter((candidate) => candidate.id !== id);
      next.push(saved);
      writeTaskTemplates(database, next);
      return saved;
    }),
  );
}

export function deleteCandidatureAiTaskTemplate(rootPath: string, id: string): void {
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const templates = readTaskTemplates(database);
      if (!templates.some((candidate) => candidate.id === id)) return;
      writeTaskTemplates(database, templates.filter((candidate) => candidate.id !== id));
    }),
  );
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
        "Stored external-AI task information is invalid.",
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

      const information = values.flatMap((retained) => {
        const field = fields.get(retained.fieldId);
        if (!field?.preferences.aiUseAllowed) return [];
        return [
          {
            label: field.definition.label,
            value: exposedChoiceLabels(field, retained.value),
          },
        ];
      });

      return externalOpportunityResearchContextSchema.parse({ information });
    }),
  );
}

export function requireSelectedOpportunityResearchContext(
  rootPath: string,
): CandidatureOpportunityResearchTaskContext {
  const context = selectedOpportunityResearchContext(rootPath);
  if (context === null) {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "Choose Send to my AI on an application before using an external AI task.",
    );
  }
  return context;
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

export const maxOpportunityResearchPortableResultBytes = 64 * 1024;

export const defaultOpportunityResearchTaskInstruction =
  "Research this opportunity and produce a concise application brief with relevant verified facts and source links, positioning ideas supported by the supplied context, important unknowns or questions, and concrete preparation points. If key details are missing, state them instead of guessing.";

function portableValue(value: CandidatureRuntimeValue): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function buildOpportunityResearchPortableTask(
  rootPath: string,
  rawInstruction: string = defaultOpportunityResearchTaskInstruction,
): string {
  const context = requireSelectedOpportunityResearchContext(rootPath);
  const instruction = candidatureOpportunityResearchTaskInstructionSchema.parse(rawInstruction);
  const information = context.information.length > 0
    ? context.information.map(
        ({ label, value }) =>
          `- **${label.replaceAll(/\s+/g, " ").trim()}:** ${portableValue(value)}`,
      )
    : ["- No application context provided."];

  return [
    "# Application task",
    "",
    "## Context",
    "",
    ...information,
    "",
    "## Task",
    "",
    instruction,
    "",
  ].join("\n");
}

export function importOpportunityResearchPortableResult(
  rootPath: string,
  sourceText: string,
): boolean {
  if (Buffer.byteLength(sourceText, "utf8") > maxOpportunityResearchPortableResultBytes) {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "The external AI result is too large to retain.",
    );
  }
  const content = sourceText.trim();
  if (!content) {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "The external AI result is empty.",
    );
  }
  return addSourceToSelectedOpportunityResearchCandidature(rootPath, {
    source: {
      kind: "conversation",
      title: "External AI result",
      url: "",
      sourceText: content,
    },
  });
}
