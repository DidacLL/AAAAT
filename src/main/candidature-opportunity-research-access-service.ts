import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";

import {
  candidatureOpportunityResearchAccessSchema,
  candidatureOpportunityResearchAccessUpdateSchema,
  type CandidatureOpportunityResearchAccess,
  type CandidatureOpportunityResearchAccessUpdate,
} from "../shared/candidature-opportunity-research-access-contracts";
import {
  operationReferenceSchema,
  providerJobExtractionRequestSchema,
} from "../shared/ai-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
} from "../shared/contracts";
import {
  applicationInformationTaskInstruction,
  interviewPreparationTaskInstruction,
} from "../shared/external-ai-task-templates";
import {
  externalApplicationInformationPendingResultSchema,
  externalApplicationInformationProposalInputSchema,
  externalApplicationInformationTaskSchema,
  externalInterviewPreparationContextSchema,
  type ExternalApplicationInformationPendingResult,
  type ExternalApplicationInformationTask,
  type ExternalInterviewPreparationContext,
} from "../shared/external-assistant-contracts";
import {
  listCandidatureFieldsInDatabase,
  readCandidatureFieldValuesInDatabase,
} from "./candidature-field-service";
import {
  addCandidatureSourceInDatabase,
  listCandidatureSourcesInDatabase,
} from "./candidature-service";
import {
  buildCandidatureFieldProposalWire,
  validateCandidatureFieldProposalsInDatabase,
  type CandidatureFieldProposalWire,
} from "./robust-job-extraction";
import { compactSourceText } from "../shared/source-text";
import { withWorkspaceDatabase } from "./workspace";

interface AccessRow {
  readonly id: string;
  readonly archived: number;
  readonly selected: number;
}

type ResearchAccessActivity =
  | "candidature.opportunity-research-access.allow"
  | "candidature.opportunity-research-access.revoke";

const applicationInformationTaskKey = (id: string) => `external_ai.application_task.${id}`;
const applicationInformationResultKey = (id: string) => `external_ai.application_result.${id}`;
const interviewPreparationTaskKey = (id: string) => `external_ai.interview_task.${id}`;
const connectedTaskKey = "external_ai.connected_task";

const storedPrivateReplacementSchema = z.object({
  placeholder: z.string().trim().min(1).max(240),
  value: z.string().nullable(),
}).strict();

const storedFieldBindingSchema = z.object({
  fieldRef: operationReferenceSchema,
  fieldId: z.string().uuid(),
  label: z.string().trim().min(1).max(120),
  choices: z.array(z.object({
    choiceRef: operationReferenceSchema,
    choiceId: z.string().uuid(),
  }).strict()).max(64),
}).strict();

const storedApplicationInformationTaskSchema = z.object({
  candidatureId: z.string().uuid(),
  taskRef: operationReferenceSchema,
  text: z.string().min(1).max(128 * 1024),
  request: providerJobExtractionRequestSchema,
  fields: z.array(storedFieldBindingSchema).min(1).max(64),
  privateReplacements: z.array(storedPrivateReplacementSchema).max(64),
}).strict();
type StoredApplicationInformationTask = z.infer<
  typeof storedApplicationInformationTaskSchema
>;

const storedApplicationInformationResultSchema = z.object({
  candidatureId: z.string().uuid(),
  pending: externalApplicationInformationPendingResultSchema,
}).strict();

const storedInterviewPreparationTaskSchema = z.object({
  candidatureId: z.string().uuid(),
  taskRef: operationReferenceSchema,
  text: z.string().min(1).max(128 * 1024),
  privateReplacements: z.array(storedPrivateReplacementSchema).max(64),
}).strict();
type StoredInterviewPreparationTask = z.infer<
  typeof storedInterviewPreparationTaskSchema
>;

const connectedTaskSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("application-information"), task: storedApplicationInformationTaskSchema }).strict(),
  z.object({ kind: z.literal("interview"), task: storedInterviewPreparationTaskSchema }).strict(),
]);
function connectedTask(database: DatabaseSync) {
  const raw = readMetadataJson(database, connectedTaskKey);
  return raw === null ? null : connectedTaskSchema.parse(raw);
}

type PrivateReplacements = Map<string, string | null>;

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
      "The application no longer exists.",
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

function requireSelectedId(database: DatabaseSync): string {
  const candidatureId = selectedId(database);
  if (candidatureId === null) {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "Choose an application AI action in AAAAT first.",
    );
  }
  return candidatureId;
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

function accessFor(database: DatabaseSync, row: AccessRow): CandidatureOpportunityResearchAccess {
  const shared = connectedTask(database);
  const allowed = row.selected === 1 && row.archived === 0 && shared?.task.candidatureId === row.id;
  return candidatureOpportunityResearchAccessSchema.parse({
    candidatureId: row.id,
    allowed,
    kind: allowed ? shared.kind : null,
  });
}

export function getCandidatureOpportunityResearchAccess(
  rootPath: string,
  candidatureId: string,
): CandidatureOpportunityResearchAccess {
  const parsedId = candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(
    candidatureId,
  );
  return withWorkspaceDatabase(rootPath, (database) => accessFor(database, requireRow(database, parsedId)));
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
          "Archived applications cannot be used with external AI.",
        );
      }
      if (!update.allowed && current.selected === 0) return accessFor(database, current);
      if (update.allowed) {
        const task = update.kind === "application-information"
          ? requireStoredApplicationInformationTask(database, update.candidatureId)
          : requireStoredInterviewPreparationTask(database, update.candidatureId);
        writeMetadataJson(database, connectedTaskKey, { kind: update.kind, task: { ...task, text: update.text } });
      }

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
        if (connectedTask(database)?.task.candidatureId === update.candidatureId) {
          deleteMetadata(database, connectedTaskKey);
        }
        recordActivity(
          database,
          update.candidatureId,
          "candidature.opportunity-research-access.revoke",
          now,
        );
      }

      return accessFor(database, requireRow(database, update.candidatureId));
    }),
  );
}

function displayValue(
  field: CandidatureFieldConfiguration,
  value: CandidatureRuntimeValue,
): string {
  const displayOne = (item: string | number | boolean): string => {
    if (field.definition.valueType === "choice" && typeof item === "string") {
      return field.definition.choices.find((choice) => choice.id === item)?.label ?? item;
    }
    if (typeof item === "boolean") return item ? "Yes" : "No";
    return String(item);
  };
  return Array.isArray(value) ? value.map(displayOne).join(", ") : displayOne(value);
}

function privatePlaceholder(
  field: CandidatureFieldConfiguration,
  value: string,
  replacements: PrivateReplacements,
): string {
  const placeholder = `[USERPRIVATE:${field.definition.label}]`;
  if (!replacements.has(placeholder)) {
    replacements.set(placeholder, value);
  } else if (replacements.get(placeholder) !== value) {
    replacements.set(placeholder, null);
  }
  return placeholder;
}

function storedPrivateReplacements(
  replacements: PrivateReplacements,
): Array<{ readonly placeholder: string; readonly value: string | null }> {
  return Array.from(replacements, ([placeholder, value]) => ({ placeholder, value }));
}

function replacementMap(
  replacements: readonly { readonly placeholder: string; readonly value: string | null }[],
): PrivateReplacements {
  return new Map(replacements.map(({ placeholder, value }) => [placeholder, value]));
}

function restorePrivateText(text: string, replacements: PrivateReplacements): string {
  const exact = Array.from(replacements.entries()).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  if (exact.length === 0) return text;
  const escaped = exact
    .map(([placeholder]) => placeholder)
    .sort((left, right) => right.length - left.length)
    .map((placeholder) => placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(escaped.join("|"), "g");
  const values = new Map(exact);
  return text.replace(pattern, (placeholder) => values.get(placeholder) ?? placeholder);
}

function restorePrivateProposalValue(
  value: unknown,
  replacements: PrivateReplacements,
): unknown {
  if (typeof value === "string") return restorePrivateText(value, replacements);
  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "string" ? restorePrivateText(item, replacements) : item
    );
  }
  return value;
}

function restorePrivateProposals(
  proposals: readonly unknown[],
  replacements: PrivateReplacements,
): unknown[] {
  return proposals.map((proposal) => {
    if (!proposal || typeof proposal !== "object" || !("value" in proposal)) return proposal;
    const candidate = proposal as { readonly value?: unknown };
    return { ...proposal, value: restorePrivateProposalValue(candidate.value, replacements) };
  });
}

function applicationContext(
  database: DatabaseSync,
  candidatureId: string,
  fields: readonly CandidatureFieldConfiguration[],
): { readonly text: string; readonly replacements: PrivateReplacements } {
  const byId = new Map(fields.map((field) => [field.definition.id, field]));
  const replacements: PrivateReplacements = new Map();
  const sources = listCandidatureSourcesInDatabase(database, candidatureId)
    .slice(0, 20)
    .map((source, index) =>
      [
        `Retained Source ${index + 1}`,
        source.title ? `Title: ${source.title}` : "",
        source.url ? `URL: ${source.url}` : "",
        compactSourceText(source.sourceText),
      ].filter(Boolean).join("\n"),
    );

  const retained = readCandidatureFieldValuesInDatabase(database, candidatureId).flatMap((item) => {
    const field = byId.get(item.fieldId);
    if (!field?.definition.enabled) return [];
    return [
      `${field.definition.label}: ${
        field.preferences.aiUseAllowed
          ? displayValue(field, item.value)
          : privatePlaceholder(field, displayValue(field, item.value), replacements)
      }`,
    ];
  });

  const parts = [...sources];
  if (retained.length > 0) {
    parts.push(`Existing application information:\n${retained.join("\n")}`);
  }
  return {
    text: parts.join("\n\n---\n\n").slice(0, 50_000).trim(),
    replacements,
  };
}

function storedWire(task: StoredApplicationInformationTask): CandidatureFieldProposalWire {
  return {
    request: task.request,
    fieldIds: new Map(task.fields.map((field) => [field.fieldRef, field.fieldId])),
    fieldLabels: new Map(task.fields.map((field) => [field.fieldRef, field.label])),
    choiceIds: new Map(task.fields.map((field) => [
      field.fieldRef,
      new Map(field.choices.map((choice) => [choice.choiceRef, choice.choiceId])),
    ])),
  };
}

function storedTaskFromWire(
  candidatureId: string,
  taskRef: string,
  instruction: string,
  wire: CandidatureFieldProposalWire,
  replacements: PrivateReplacements,
): StoredApplicationInformationTask {
  return storedApplicationInformationTaskSchema.parse({
    candidatureId,
    taskRef,
    text: [
      instruction, "", "## Application context", "", wire.request.sourceText, "",
      "## Fields", "", ...wire.request.fields.map(fieldDescription), "",
      "## Return to AAAAT", "",
      "Return JSON only. Use only the fieldRef and choiceRef values listed above.",
      JSON.stringify({ taskRef, proposals: [{ fieldRef: wire.request.fields[0]?.fieldRef, value: "..." }] }),
    ].join("\n"),
    request: wire.request,
    privateReplacements: storedPrivateReplacements(replacements),
    fields: wire.request.fields.map((field) => ({
      fieldRef: field.fieldRef,
      fieldId: wire.fieldIds.get(field.fieldRef),
      label: wire.fieldLabels.get(field.fieldRef),
      choices: field.choices.map((choice) => ({
        choiceRef: choice.choiceRef,
        choiceId: wire.choiceIds.get(field.fieldRef)?.get(choice.choiceRef),
      })),
    })),
  });
}

function readMetadataJson(database: DatabaseSync, key: string): unknown | null {
  const row = database
    .prepare("SELECT value FROM workspace_metadata WHERE key = ?")
    .get(key) as { readonly value: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value) as unknown;
  } catch {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "Stored external AI task state is invalid.",
    );
  }
}

function writeMetadataJson(database: DatabaseSync, key: string, value: unknown): void {
  database
    .prepare(
      `INSERT INTO workspace_metadata(key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, JSON.stringify(value));
}

function deleteMetadata(database: DatabaseSync, key: string): void {
  database.prepare("DELETE FROM workspace_metadata WHERE key = ?").run(key);
}

function readStoredApplicationInformationTask(
  database: DatabaseSync,
  candidatureId: string,
): StoredApplicationInformationTask | null {
  const raw = readMetadataJson(database, applicationInformationTaskKey(candidatureId));
  if (raw === null) return null;
  const parsed = storedApplicationInformationTaskSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "Stored external application-information task is invalid.",
    );
  }
  return parsed.data;
}

function taskFor(
  stored: StoredApplicationInformationTask,
): ExternalApplicationInformationTask {
  return externalApplicationInformationTaskSchema.parse({
    taskRef: stored.taskRef,
    text: stored.text,
    fields: stored.request.fields,
  });
}

export const defaultApplicationInformationTaskInstruction =
  applicationInformationTaskInstruction;
export const defaultInterviewPreparationTaskInstruction =
  interviewPreparationTaskInstruction;

export function prepareApplicationInformationTask(
  rootPath: string,
  candidatureId: string,
): ExternalApplicationInformationTask {
  const instruction = defaultApplicationInformationTaskInstruction;
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      requireRow(database, candidatureId);
      const fields = listCandidatureFieldsInDatabase(database);
      const retainedFieldIds = new Set(
        readCandidatureFieldValuesInDatabase(database, candidatureId).map(
          (item) => item.fieldId,
        ),
      );
      const assignedFields = fields.filter(
        (field) =>
          field.definition.enabled
          && field.preferences.aiUseAllowed
          && !retainedFieldIds.has(field.definition.id),
      );
      if (assignedFields.length === 0) {
        throw new CandidatureOpportunityResearchAccessServiceError(
          "No missing application information is currently available for AI use.",
        );
      }
      const context = applicationContext(database, candidatureId, fields);
      if (!context.text) {
        throw new CandidatureOpportunityResearchAccessServiceError(
          "Keep some Source text or existing application information before asking external AI to fill application information.",
        );
      }
      const wire = buildCandidatureFieldProposalWire(
        {
          sourceTitle: "Retained AAAAT application context",
          sourceUrl: "",
          sourceText: context.text,
        },
        assignedFields,
      );
      const stored = storedTaskFromWire(
        candidatureId,
        `aaaat_task_${randomUUID()}`,
        instruction,
        wire,
        context.replacements,
      );
      writeMetadataJson(database, applicationInformationTaskKey(candidatureId), stored);
      return taskFor(stored);
    }),
  );
}

export function selectedApplicationInformationTask(rootPath: string): ExternalApplicationInformationTask | null {
  return withWorkspaceDatabase(rootPath, (database) => snapshot(database, () => {
    const selected = selectedId(database);
    const shared = connectedTask(database);
    return selected && shared?.kind === "application-information" && shared.task.candidatureId === selected
      ? taskFor(shared.task) : null;
  }));
}

function requireStoredApplicationInformationTask(database: DatabaseSync, candidatureId: string): StoredApplicationInformationTask {
  requireRow(database, candidatureId);
  const stored = readStoredApplicationInformationTask(database, candidatureId);
  if (!stored) throw new CandidatureOpportunityResearchAccessServiceError("Open an application-details request first.");
  return stored;
}

function recoverableJsonText(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    const firstLineEnd = text.indexOf("\n");
    const lastFence = text.lastIndexOf("```");
    if (firstLineEnd >= 0 && lastFence > firstLineEnd) {
      text = text.slice(firstLineEnd + 1, lastFence).trim();
    }
  }
  const firstObject = text.indexOf("{");
  const lastObject = text.lastIndexOf("}");
  return firstObject >= 0 && lastObject > firstObject
    ? text.slice(firstObject, lastObject + 1)
    : text;
}

function parseApplicationInformationResult(
  rawText: string,
  fallbackTaskRef: string,
): { readonly taskRef: string; readonly proposals: readonly unknown[] } {
  const content = rawText.trim();
  if (!content) {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "The external AI result is empty.",
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(recoverableJsonText(content)) as unknown;
  } catch {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "The external AI result must contain a JSON field-proposal result.",
    );
  }
  if (Array.isArray(raw)) {
    return externalApplicationInformationProposalInputSchema.parse({
      taskRef: fallbackTaskRef,
      proposals: raw,
    });
  }
  if (!raw || typeof raw !== "object") {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "The external AI result must contain field proposals.",
    );
  }
  const candidate = raw as { taskRef?: unknown; proposals?: unknown };
  return externalApplicationInformationProposalInputSchema.parse({
    taskRef: candidate.taskRef ?? fallbackTaskRef,
    proposals: candidate.proposals,
  });
}

function storeApplicationInformationProposals(
  database: DatabaseSync,
  input: { readonly taskRef: string; readonly proposals: readonly unknown[] },
  stored: StoredApplicationInformationTask,
): ExternalApplicationInformationPendingResult {
  if (input.taskRef !== stored.taskRef) {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "These suggestions belong to an older application-information task.",
    );
  }
  const validated = validateCandidatureFieldProposalsInDatabase(
    database,
    storedWire(stored),
    restorePrivateProposals(
      input.proposals,
      replacementMap(stored.privateReplacements),
    ),
  );
  const pending = externalApplicationInformationPendingResultSchema.parse({
    resultRef: `aaaat_result_${randomUUID()}`,
    taskRef: stored.taskRef,
    scopeFieldIds: stored.fields.map((field) => field.fieldId),
    result: {
      proposals: validated.proposals,
      issues: validated.issues,
    },
  });
  writeMetadataJson(database, applicationInformationResultKey(stored.candidatureId), {
    candidatureId: stored.candidatureId,
    pending,
  });
  return pending;
}

export function submitApplicationInformationProposals(
  rootPath: string,
  rawInput: unknown,
): ExternalApplicationInformationPendingResult {
  const input = externalApplicationInformationProposalInputSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const selected = requireSelectedId(database);
      const shared = connectedTask(database);
      if (shared?.kind !== "application-information" || shared.task.candidatureId !== selected) {
        throw new CandidatureOpportunityResearchAccessServiceError("No application-details request allows connected AI access.");
      }
      return storeApplicationInformationProposals(database, input, shared.task);
    }),
  );
}

export function importApplicationInformationPortableResult(
  rootPath: string,
  candidatureId: string,
  rawText: string,
): ExternalApplicationInformationPendingResult {
  if (Buffer.byteLength(rawText, "utf8") > maxExternalAiPortableResultBytes) {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "The external AI result is too large.",
    );
  }
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const stored = requireStoredApplicationInformationTask(database, candidatureId);
      const parsed = parseApplicationInformationResult(rawText, stored.taskRef);
      return storeApplicationInformationProposals(database, parsed, stored);
    }),
  );
}

export function takeApplicationInformationResult(
  rootPath: string,
  candidatureId: string,
): ExternalApplicationInformationPendingResult | null {
  const parsedId = candidatureOpportunityResearchAccessSchema.shape.candidatureId.parse(
    candidatureId,
  );
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      requireRow(database, parsedId);
      const raw = readMetadataJson(database, applicationInformationResultKey(parsedId));
      if (raw === null) return null;
      const stored = storedApplicationInformationResultSchema.safeParse(raw);
      if (!stored.success || stored.data.candidatureId !== parsedId) return null;
      deleteMetadata(database, applicationInformationResultKey(parsedId));
      return stored.data.pending;
    }),
  );
}

function fieldDescription(field: ExternalApplicationInformationTask["fields"][number]): string {
  const choices = field.choices.length > 0
    ? ` Choices: ${field.choices.map((choice) => `${choice.choiceRef} = ${choice.label}`).join("; ")}.`
    : "";
  return `- ${field.fieldRef} — ${field.label} (${field.valueType}, ${field.cardinality}). ${field.description}${choices}`.trim();
}

export function saveApplicationInformationRequest(rootPath: string, candidatureId: string, text: string): string {
  return withWorkspaceDatabase(rootPath, (database) => transact(database, () => {
    const stored = requireStoredApplicationInformationTask(database, candidatureId);
    const saved = storedApplicationInformationTaskSchema.parse({ ...stored, text });
    writeMetadataJson(database, applicationInformationTaskKey(candidatureId), saved);
    return saved.text;
  }));
}

function buildInterviewPreparationContext(database: DatabaseSync, candidatureId: string): {
  readonly text: string; readonly replacements: PrivateReplacements;
} {
  const fields = listCandidatureFieldsInDatabase(database);
  const context = applicationContext(database, candidatureId, fields);
  return {
    text: [defaultInterviewPreparationTaskInstruction, "", "## Application context", "", context.text].join("\n"),
    replacements: context.replacements,
  };
}

function readStoredInterviewPreparationTask(
  database: DatabaseSync,
  candidatureId: string,
): StoredInterviewPreparationTask | null {
  const raw = readMetadataJson(database, interviewPreparationTaskKey(candidatureId));
  if (raw === null) return null;
  const parsed = storedInterviewPreparationTaskSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CandidatureOpportunityResearchAccessServiceError(
      "Stored external interview-preparation task is invalid.",
    );
  }
  return parsed.data;
}

function requireStoredInterviewPreparationTask(database: DatabaseSync, candidatureId: string): StoredInterviewPreparationTask {
  requireRow(database, candidatureId);
  const stored = readStoredInterviewPreparationTask(database, candidatureId);
  if (!stored) throw new CandidatureOpportunityResearchAccessServiceError("Open an interview request first.");
  return stored;
}

export function prepareInterviewPreparationContext(rootPath: string, candidatureId: string): ExternalInterviewPreparationContext {
  return withWorkspaceDatabase(rootPath, (database) => transact(database, () => {
    requireRow(database, candidatureId);
    const built = buildInterviewPreparationContext(database, candidatureId);
    const stored = storedInterviewPreparationTaskSchema.parse({
      candidatureId, taskRef: `aaaat_task_${randomUUID()}`, text: built.text, privateReplacements: storedPrivateReplacements(built.replacements),
    });
    writeMetadataJson(database, interviewPreparationTaskKey(candidatureId), stored);
    return externalInterviewPreparationContextSchema.parse({ taskRef: stored.taskRef, text: stored.text });
  }));
}

export function selectedInterviewPreparationContext(rootPath: string): ExternalInterviewPreparationContext | null {
  return withWorkspaceDatabase(rootPath, (database) => snapshot(database, () => {
    const selected = selectedId(database);
    const shared = connectedTask(database);
    return selected && shared?.kind === "interview" && shared.task.candidatureId === selected
      ? { taskRef: shared.task.taskRef, text: shared.task.text } : null;
  }));
}

export function saveInterviewPreparationRequest(rootPath: string, candidatureId: string, text: string): string {
  return withWorkspaceDatabase(rootPath, (database) => transact(database, () => {
    const stored = requireStoredInterviewPreparationTask(database, candidatureId);
    const saved = storedInterviewPreparationTaskSchema.parse({ ...stored, text });
    writeMetadataJson(database, interviewPreparationTaskKey(candidatureId), saved);
    return saved.text;
  }));
}

export function retainInterviewPreparationResult(rootPath: string, rawText: string, localCandidatureId?: string, externalTaskRef?: string): boolean {
  const text = z.string().trim().min(1).max(64 * 1024).parse(rawText);
  return withWorkspaceDatabase(rootPath, (database) => transact(database, () => {
    const shared = connectedTask(database);
    const stored = localCandidatureId
      ? requireStoredInterviewPreparationTask(database, localCandidatureId)
      : shared?.kind === "interview" && shared.task.candidatureId === requireSelectedId(database) ? shared.task : null;
    if (!stored) throw new CandidatureOpportunityResearchAccessServiceError("No interview request allows connected AI access.");
    if (!localCandidatureId && stored.taskRef !== externalTaskRef) {
      throw new CandidatureOpportunityResearchAccessServiceError("This result belongs to another interview request.");
    }
    addCandidatureSourceInDatabase(database, {
      candidatureId: stored.candidatureId, kind: "conversation", title: "Interview preparation",
      url: "", sourceText: restorePrivateText(text, replacementMap(stored.privateReplacements)),
    }, new Date().toISOString());
    return true;
  }));
}



export const maxExternalAiPortableResultBytes = 64 * 1024;
