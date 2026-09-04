import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import {
  candidatureFieldConfigurationSchema,
  candidatureFieldCreateSchema,
  candidatureFieldFilterSchema,
  candidatureFieldListSchema,
  candidatureFieldPreferencesSchema,
  candidatureFieldPreferencesUpdateSchema,
  candidatureFieldUpdateSchema,
  candidatureFieldValueListSchema,
  candidatureFieldValueSetSchema,
  candidatureRuntimeValueSchema,
  type CandidatureFieldConfiguration,
  type CandidatureFieldCreate,
  type CandidatureFieldDefinition,
  type CandidatureFieldFilter,
  type CandidatureFieldPreferences,
  type CandidatureFieldPreferencesUpdate,
  type CandidatureFieldUpdate,
  type CandidatureFieldValue,
  type CandidatureFieldValueSet,
  type CandidatureRuntimeValue,
} from "../shared/contracts";
import { withWorkspaceDatabase } from "./workspace";

export const MAX_ENABLED_CANDIDATURE_FIELDS = 64;
export const MAX_AI_DISCOVERY_FIELDS = 32;

interface FieldRow {
  readonly id: string;
  readonly systemKey: string | null;
  readonly label: string;
  readonly description: string;
  readonly valueType: string;
  readonly cardinality: string;
  readonly optionsJson: string;
  readonly enabled: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface PreferencesRow {
  readonly fieldId: string;
  readonly focusVisible: number;
  readonly focusOrder: number | null;
  readonly focusProminence: string;
  readonly identityOrder: number | null;
  readonly aiDiscovery: number;
  readonly aiContextMode: string;
}

interface ValueRow {
  readonly candidatureId: string;
  readonly fieldId: string;
  readonly valueJson: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface IdRow {
  readonly id: string;
}

export class CandidatureFieldServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidatureFieldServiceError";
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

function fieldRows(database: DatabaseSync): FieldRow[] {
  return database
    .prepare(
      `SELECT id,
              system_key AS systemKey,
              label,
              description,
              value_type AS valueType,
              cardinality,
              options_json AS optionsJson,
              enabled,
              created_at AS createdAt,
              updated_at AS updatedAt
         FROM candidature_fields
        ORDER BY enabled DESC, system_key IS NULL, label COLLATE NOCASE, id`,
    )
    .all() as unknown as FieldRow[];
}

function fieldRow(database: DatabaseSync, fieldId: string): FieldRow {
  const row = database
    .prepare(
      `SELECT id,
              system_key AS systemKey,
              label,
              description,
              value_type AS valueType,
              cardinality,
              options_json AS optionsJson,
              enabled,
              created_at AS createdAt,
              updated_at AS updatedAt
         FROM candidature_fields
        WHERE id = ?`,
    )
    .get(fieldId) as unknown as FieldRow | undefined;
  if (!row) throw new CandidatureFieldServiceError("The candidature field no longer exists.");
  return row;
}

function preferencesRow(database: DatabaseSync, fieldId: string): PreferencesRow {
  const row = database
    .prepare(
      `SELECT field_id AS fieldId,
              focus_visible AS focusVisible,
              focus_order AS focusOrder,
              focus_prominence AS focusProminence,
              identity_order AS identityOrder,
              ai_discovery AS aiDiscovery,
              ai_context_mode AS aiContextMode
         FROM candidature_field_preferences
        WHERE field_id = ?`,
    )
    .get(fieldId) as unknown as PreferencesRow | undefined;
  if (!row) {
    throw new CandidatureFieldServiceError("The candidature field preferences are unavailable.");
  }
  return row;
}

function toDefinition(row: FieldRow): CandidatureFieldDefinition {
  let choices: unknown;
  try {
    choices = JSON.parse(row.optionsJson) as unknown;
  } catch {
    throw new CandidatureFieldServiceError("The candidature field configuration is invalid.");
  }
  return candidatureFieldConfigurationSchema.shape.definition.parse({
    id: row.id,
    systemKey: row.systemKey,
    label: row.label,
    description: row.description,
    valueType: row.valueType,
    cardinality: row.cardinality,
    choices,
    enabled: row.enabled === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function toPreferences(row: PreferencesRow): CandidatureFieldPreferences {
  return candidatureFieldPreferencesSchema.parse({
    fieldId: row.fieldId,
    focusVisible: row.focusVisible === 1,
    focusOrder: row.focusOrder,
    focusProminence: row.focusProminence,
    identityOrder: row.identityOrder,
    aiDiscovery: row.aiDiscovery === 1,
    aiContextMode: row.aiContextMode,
  });
}

function configuration(database: DatabaseSync, fieldId: string): CandidatureFieldConfiguration {
  return candidatureFieldConfigurationSchema.parse({
    definition: toDefinition(fieldRow(database, fieldId)),
    preferences: toPreferences(preferencesRow(database, fieldId)),
  });
}

export function listCandidatureFieldsInDatabase(
  database: DatabaseSync,
): CandidatureFieldConfiguration[] {
  return candidatureFieldListSchema.parse(
    fieldRows(database).map((row) => ({
      definition: toDefinition(row),
      preferences: toPreferences(preferencesRow(database, row.id)),
    })),
  );
}

export function listCandidatureFields(rootPath: string): CandidatureFieldConfiguration[] {
  return withWorkspaceDatabase(rootPath, listCandidatureFieldsInDatabase);
}

function validateChoices(input: {
  readonly valueType: string;
  readonly choices: readonly { readonly id: string; readonly label: string }[];
}): void {
  if (input.valueType === "choice" && input.choices.length === 0) {
    throw new CandidatureFieldServiceError("A choice field needs at least one choice.");
  }
  if (input.valueType !== "choice" && input.choices.length > 0) {
    throw new CandidatureFieldServiceError("Only choice fields can define choices.");
  }
  if (new Set(input.choices.map((choice) => choice.id)).size !== input.choices.length) {
    throw new CandidatureFieldServiceError("Choice IDs must be unique.");
  }
}

function countEnabled(database: DatabaseSync): number {
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM candidature_fields WHERE enabled = 1")
    .get() as { count: number };
  return row.count;
}

function countDiscovery(database: DatabaseSync, exceptFieldId?: string): number {
  const row = exceptFieldId
    ? (database
        .prepare(
          `SELECT COUNT(*) AS count
             FROM candidature_field_preferences p
             JOIN candidature_fields f ON f.id = p.field_id
            WHERE f.enabled = 1 AND p.ai_discovery = 1 AND p.field_id <> ?`,
        )
        .get(exceptFieldId) as { count: number })
    : (database
        .prepare(
          `SELECT COUNT(*) AS count
             FROM candidature_field_preferences p
             JOIN candidature_fields f ON f.id = p.field_id
            WHERE f.enabled = 1 AND p.ai_discovery = 1`,
        )
        .get() as { count: number });
  return row.count;
}

export function createCandidatureField(
  rootPath: string,
  rawInput: CandidatureFieldCreate,
): CandidatureFieldConfiguration {
  const input = candidatureFieldCreateSchema.parse(rawInput);
  validateChoices(input);
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      if (input.enabled && countEnabled(database) >= MAX_ENABLED_CANDIDATURE_FIELDS) {
        throw new CandidatureFieldServiceError(
          `AAAAT supports at most ${MAX_ENABLED_CANDIDATURE_FIELDS} enabled candidature fields.`,
        );
      }
      const id = randomUUID();
      const now = new Date().toISOString();
      database
        .prepare(
          `INSERT INTO candidature_fields(
             id, system_key, label, description, value_type, cardinality,
             options_json, enabled, created_at, updated_at
           ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          input.label,
          input.description,
          input.valueType,
          input.cardinality,
          JSON.stringify(input.choices),
          input.enabled ? 1 : 0,
          now,
          now,
        );
      database
        .prepare("INSERT INTO candidature_field_preferences(field_id) VALUES (?)")
        .run(id);
      return configuration(database, id);
    }),
  );
}

function sameShape(
  current: CandidatureFieldDefinition,
  update: CandidatureFieldUpdate,
): boolean {
  if (current.valueType !== update.valueType || current.cardinality !== update.cardinality) {
    return false;
  }
  const currentIds = current.choices.map((choice) => choice.id).sort().join("\u0000");
  const nextIds = update.choices.map((choice) => choice.id).sort().join("\u0000");
  return currentIds === nextIds;
}

function fieldHasValues(database: DatabaseSync, fieldId: string): boolean {
  return Boolean(
    database
      .prepare("SELECT 1 FROM candidature_field_values WHERE field_id = ? LIMIT 1")
      .get(fieldId),
  );
}

export function updateCandidatureField(
  rootPath: string,
  rawInput: CandidatureFieldUpdate,
): CandidatureFieldConfiguration {
  const input = candidatureFieldUpdateSchema.parse(rawInput);
  validateChoices(input);
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const current = toDefinition(fieldRow(database, input.id));
      if (!sameShape(current, input) && fieldHasValues(database, input.id)) {
        throw new CandidatureFieldServiceError(
          "Clear or explicitly convert retained values before changing field type, cardinality, or choice IDs.",
        );
      }
      if (!current.enabled && input.enabled && countEnabled(database) >= MAX_ENABLED_CANDIDATURE_FIELDS) {
        throw new CandidatureFieldServiceError(
          `AAAAT supports at most ${MAX_ENABLED_CANDIDATURE_FIELDS} enabled candidature fields.`,
        );
      }
      const now = new Date().toISOString();
      database
        .prepare(
          `UPDATE candidature_fields
              SET label = ?, description = ?, value_type = ?, cardinality = ?,
                  options_json = ?, enabled = ?, updated_at = ?
            WHERE id = ?`,
        )
        .run(
          input.label,
          input.description,
          input.valueType,
          input.cardinality,
          JSON.stringify(input.choices),
          input.enabled ? 1 : 0,
          now,
          input.id,
        );
      if (!input.enabled) {
        database
          .prepare(
            `UPDATE candidature_field_preferences
                SET ai_discovery = 0
              WHERE field_id = ?`,
          )
          .run(input.id);
      }
      return configuration(database, input.id);
    }),
  );
}

export function deleteUnusedCandidatureField(
  rootPath: string,
  fieldId: string,
): CandidatureFieldConfiguration[] {
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const current = toDefinition(fieldRow(database, fieldId));
      if (current.systemKey !== null) {
        throw new CandidatureFieldServiceError("Built-in candidature fields can be retired but not deleted.");
      }
      if (fieldHasValues(database, fieldId)) {
        throw new CandidatureFieldServiceError("A field with retained values must be retired instead of deleted.");
      }
      database.prepare("DELETE FROM candidature_fields WHERE id = ?").run(fieldId);
      return listCandidatureFieldsInDatabase(database);
    }),
  );
}

export function updateCandidatureFieldPreferences(
  rootPath: string,
  rawInput: CandidatureFieldPreferencesUpdate,
): CandidatureFieldConfiguration {
  const input = candidatureFieldPreferencesUpdateSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const field = toDefinition(fieldRow(database, input.fieldId));
      if (input.aiDiscovery && !field.enabled) {
        throw new CandidatureFieldServiceError("Retired fields cannot participate in AI discovery.");
      }
      if (
        input.aiDiscovery &&
        !toPreferences(preferencesRow(database, input.fieldId)).aiDiscovery &&
        countDiscovery(database, input.fieldId) >= MAX_AI_DISCOVERY_FIELDS
      ) {
        throw new CandidatureFieldServiceError(
          `AAAAT supports at most ${MAX_AI_DISCOVERY_FIELDS} AI-discovery candidature fields.`,
        );
      }
      database
        .prepare(
          `UPDATE candidature_field_preferences
              SET focus_visible = ?, focus_order = ?, focus_prominence = ?,
                  identity_order = ?, ai_discovery = ?, ai_context_mode = ?
            WHERE field_id = ?`,
        )
        .run(
          input.focusVisible ? 1 : 0,
          input.focusOrder,
          input.focusProminence,
          input.identityOrder,
          input.aiDiscovery ? 1 : 0,
          input.aiContextMode,
          input.fieldId,
        );
      return configuration(database, input.fieldId);
    }),
  );
}

function requireCandidature(database: DatabaseSync, candidatureId: string): void {
  if (!database.prepare("SELECT 1 FROM candidatures WHERE id = ?").get(candidatureId)) {
    throw new CandidatureFieldServiceError("The candidature no longer exists.");
  }
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateScalar(
  field: CandidatureFieldDefinition,
  value: string | number | boolean,
): string | number | boolean | null {
  switch (field.valueType) {
    case "text":
      if (typeof value !== "string" || value.length > 5000) break;
      return value.trim().length === 0 ? null : value;
    case "long_text":
      if (typeof value !== "string" || value.length > 50000) break;
      return value.trim().length === 0 ? null : value;
    case "number":
      if (typeof value === "number" && Number.isFinite(value)) return value;
      break;
    case "boolean":
      if (typeof value === "boolean") return value;
      break;
    case "date":
      if (typeof value === "string" && validDate(value)) return value;
      break;
    case "url":
      if (typeof value === "string" && value.length <= 2048) {
        if (value.trim().length === 0) return null;
        try {
          const url = new URL(value);
          if (url.protocol === "http:" || url.protocol === "https:") return value;
        } catch {
          break;
        }
      }
      break;
    case "choice":
      if (
        typeof value === "string" &&
        field.choices.some((choice) => choice.id === value)
      ) {
        return value;
      }
      break;
  }
  throw new CandidatureFieldServiceError(`The value is invalid for ${field.label}.`);
}

export function validateCandidatureFieldValueInDatabase(
  database: DatabaseSync,
  fieldId: string,
  rawValue: CandidatureRuntimeValue,
): CandidatureRuntimeValue | null {
  const field = toDefinition(fieldRow(database, fieldId));
  const value = candidatureRuntimeValueSchema.parse(rawValue);
  if (field.cardinality === "one") {
    if (Array.isArray(value)) {
      throw new CandidatureFieldServiceError(`${field.label} accepts one value.`);
    }
    return validateScalar(field, value);
  }
  if (!Array.isArray(value)) {
    throw new CandidatureFieldServiceError(`${field.label} accepts multiple values.`);
  }
  if (value.length === 0) return null;
  const validated = value.map((item) => {
    const next = validateScalar(field, item);
    if (next === null) {
      throw new CandidatureFieldServiceError(`Empty items are not retained in ${field.label}.`);
    }
    return next;
  });
  if (new Set(validated.map((item) => JSON.stringify(item))).size !== validated.length) {
    throw new CandidatureFieldServiceError(`${field.label} cannot contain duplicate values.`);
  }
  return validated;
}

export function setCandidatureFieldValueInDatabase(
  database: DatabaseSync,
  input: CandidatureFieldValueSet,
  now: string,
): void {
  requireCandidature(database, input.candidatureId);
  const normalized = validateCandidatureFieldValueInDatabase(database, input.fieldId, input.value);
  if (normalized === null) {
    database
      .prepare(
        "DELETE FROM candidature_field_values WHERE candidature_id = ? AND field_id = ?",
      )
      .run(input.candidatureId, input.fieldId);
  } else {
    database
      .prepare(
        `INSERT INTO candidature_field_values(
           candidature_id, field_id, value_json, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(candidature_id, field_id) DO UPDATE SET
           value_json = excluded.value_json,
           updated_at = excluded.updated_at`,
      )
      .run(input.candidatureId, input.fieldId, JSON.stringify(normalized), now, now);
  }
  database
    .prepare("UPDATE candidatures SET updated_at = ? WHERE id = ?")
    .run(now, input.candidatureId);
}

export function clearCandidatureFieldValueInDatabase(
  database: DatabaseSync,
  candidatureId: string,
  fieldId: string,
  now: string,
): void {
  requireCandidature(database, candidatureId);
  fieldRow(database, fieldId);
  database
    .prepare("DELETE FROM candidature_field_values WHERE candidature_id = ? AND field_id = ?")
    .run(candidatureId, fieldId);
  database
    .prepare("UPDATE candidatures SET updated_at = ? WHERE id = ?")
    .run(now, candidatureId);
}

export function readCandidatureFieldValuesInDatabase(
  database: DatabaseSync,
  candidatureId: string,
): CandidatureFieldValue[] {
  const rows = database
    .prepare(
      `SELECT candidature_id AS candidatureId,
              field_id AS fieldId,
              value_json AS valueJson,
              created_at AS createdAt,
              updated_at AS updatedAt
         FROM candidature_field_values
        WHERE candidature_id = ?
        ORDER BY field_id`,
    )
    .all(candidatureId) as unknown as ValueRow[];
  return candidatureFieldValueListSchema.parse(
    rows.map((row) => {
      let value: unknown;
      try {
        value = JSON.parse(row.valueJson) as unknown;
      } catch {
        throw new CandidatureFieldServiceError("A retained candidature value is invalid.");
      }
      return {
        candidatureId: row.candidatureId,
        fieldId: row.fieldId,
        value,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }),
  );
}

function recordValueActivity(
  database: DatabaseSync,
  candidatureId: string,
  action: string,
  now: string,
): void {
  database
    .prepare(
      `INSERT INTO candidature_activity(occurred_at, candidature_id, action)
       VALUES (?, ?, ?)`,
    )
    .run(now, candidatureId, action);
}

export function setCandidatureFieldValue(
  rootPath: string,
  rawInput: CandidatureFieldValueSet,
): void {
  const input = candidatureFieldValueSetSchema.parse(rawInput);
  withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      setCandidatureFieldValueInDatabase(database, input, new Date().toISOString());
      recordValueActivity(database, input.candidatureId, "candidature.field-value-set", new Date().toISOString());
    }),
  );
}

export function clearCandidatureFieldValue(
  rootPath: string,
  candidatureId: string,
  fieldId: string,
): void {
  withWorkspaceDatabase(rootPath, (database) =>
    transact(database, () => {
      const now = new Date().toISOString();
      clearCandidatureFieldValueInDatabase(database, candidatureId, fieldId, now);
      recordValueActivity(database, candidatureId, "candidature.field-value-cleared", now);
    }),
  );
}

export function displayCandidatureFieldValue(
  field: CandidatureFieldDefinition,
  value: CandidatureRuntimeValue,
): string {
  const displayOne = (item: string | number | boolean): string => {
    if (field.valueType === "choice" && typeof item === "string") {
      return field.choices.find((choice) => choice.id === item)?.label ?? item;
    }
    if (typeof item === "boolean") return item ? "Yes" : "No";
    return String(item);
  };
  return Array.isArray(value) ? value.map(displayOne).join(", ") : displayOne(value);
}

export function candidatureLabelInDatabase(
  database: DatabaseSync,
  candidatureId: string,
  createdAt: string,
): string {
  const fields = listCandidatureFieldsInDatabase(database);
  const values = new Map(
    readCandidatureFieldValuesInDatabase(database, candidatureId).map((value) => [
      value.fieldId,
      value.value,
    ]),
  );
  const identity = fields
    .filter((field) => field.preferences.identityOrder !== null)
    .sort(
      (left, right) =>
        (left.preferences.identityOrder ?? 0) - (right.preferences.identityOrder ?? 0),
    )
    .flatMap((field) => {
      const value = values.get(field.definition.id);
      return value === undefined
        ? []
        : [displayCandidatureFieldValue(field.definition, value)];
    })
    .filter((value) => value.trim().length > 0);
  if (identity.length > 0) return identity.join(" — ");

  const source = database
    .prepare(
      `SELECT title, url, source_text AS sourceText
         FROM candidature_sources
        WHERE candidature_id = ?
        ORDER BY created_at, id
        LIMIT 1`,
    )
    .get(candidatureId) as
    | { readonly title: string; readonly url: string; readonly sourceText: string }
    | undefined;
  if (source) {
    if (source.title.trim()) return source.title.trim();
    if (source.url.trim()) return source.url.trim();
    const cue = source.sourceText.trim().replace(/\s+/g, " ").slice(0, 80);
    if (cue) return cue;
  }
  return `Candidature · ${createdAt.slice(0, 10)}`;
}

function requireFilterValue(filter: CandidatureFieldFilter): CandidatureRuntimeValue {
  if (filter.value === undefined) {
    throw new CandidatureFieldServiceError("This filter operator requires a value.");
  }
  return filter.value;
}

function allowedOperators(field: CandidatureFieldDefinition): ReadonlySet<string> {
  switch (field.valueType) {
    case "text":
    case "long_text":
    case "url":
      return new Set(["contains", "equals", "is_set", "is_not_set"]);
    case "number":
      return new Set([
        "equals",
        "less_than",
        "less_than_or_equal",
        "greater_than",
        "greater_than_or_equal",
        "is_set",
        "is_not_set",
      ]);
    case "date":
      return new Set(["equals", "before", "after", "is_set", "is_not_set"]);
    case "boolean":
      return new Set(["equals", "is_set", "is_not_set"]);
    case "choice":
      return new Set([
        "equals",
        ...(field.cardinality === "many" ? ["contains_any", "contains_all"] : []),
        "is_set",
        "is_not_set",
      ]);
  }
}

function filterScalar(
  field: CandidatureFieldDefinition,
  rawValue: CandidatureRuntimeValue,
): string | number | boolean {
  if (Array.isArray(rawValue)) {
    throw new CandidatureFieldServiceError("This filter expects one comparison value.");
  }
  const value = validateScalar(field, rawValue);
  if (value === null) throw new CandidatureFieldServiceError("Empty filter values are not supported.");
  return value;
}

function comparisonSql(
  field: CandidatureFieldDefinition,
  filter: CandidatureFieldFilter,
): { readonly sql: string; readonly params: readonly (string | number)[] } {
  const many = field.cardinality === "many";
  if (filter.operator === "is_set") {
    return {
      sql: "EXISTS (SELECT 1 FROM candidature_field_values v WHERE v.candidature_id = c.id AND v.field_id = ?)",
      params: [field.id],
    };
  }
  if (filter.operator === "is_not_set") {
    return {
      sql: "NOT EXISTS (SELECT 1 FROM candidature_field_values v WHERE v.candidature_id = c.id AND v.field_id = ?)",
      params: [field.id],
    };
  }

  if (filter.operator === "contains_any" || filter.operator === "contains_all") {
    if (field.valueType !== "choice" || !many) {
      throw new CandidatureFieldServiceError("This filter operator is not available for the selected field.");
    }
    const raw = requireFilterValue(filter);
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new CandidatureFieldServiceError("Choose at least one choice for this filter.");
    }
    const values = raw.map((item) => {
      if (typeof item !== "string") {
        throw new CandidatureFieldServiceError("Choice filters use choice IDs.");
      }
      const validated = validateScalar(field, item);
      if (typeof validated !== "string") {
        throw new CandidatureFieldServiceError("Choice filters use choice IDs.");
      }
      return validated;
    });
    const placeholders = values.map(() => "?").join(", ");
    if (filter.operator === "contains_any") {
      return {
        sql: `EXISTS (
          SELECT 1 FROM candidature_field_values v, json_each(v.value_json) item
           WHERE v.candidature_id = c.id AND v.field_id = ? AND item.value IN (${placeholders})
        )`,
        params: [field.id, ...values],
      };
    }
    return {
      sql: `EXISTS (
        SELECT 1 FROM candidature_field_values v
         WHERE v.candidature_id = c.id AND v.field_id = ? AND
               (SELECT COUNT(DISTINCT item.value) FROM json_each(v.value_json) item
                 WHERE item.value IN (${placeholders})) = ?
      )`,
      params: [field.id, ...values, values.length],
    };
  }

  const scalar = filterScalar(field, requireFilterValue(filter));
  const itemExpression = many ? "item.value" : "json_extract(v.value_json, '$')";
  let predicate: string;
  let parameter: string | number = typeof scalar === "boolean" ? (scalar ? 1 : 0) : scalar;
  switch (filter.operator) {
    case "contains":
      if (typeof scalar !== "string") {
        throw new CandidatureFieldServiceError("Contains filters require text.");
      }
      predicate = `instr(lower(CAST(${itemExpression} AS TEXT)), lower(?)) > 0`;
      break;
    case "equals":
      predicate = `${itemExpression} = ?`;
      break;
    case "less_than":
      predicate = `CAST(${itemExpression} AS REAL) < ?`;
      break;
    case "less_than_or_equal":
      predicate = `CAST(${itemExpression} AS REAL) <= ?`;
      break;
    case "greater_than":
      predicate = `CAST(${itemExpression} AS REAL) > ?`;
      break;
    case "greater_than_or_equal":
      predicate = `CAST(${itemExpression} AS REAL) >= ?`;
      break;
    case "before":
      predicate = `CAST(${itemExpression} AS TEXT) < ?`;
      break;
    case "after":
      predicate = `CAST(${itemExpression} AS TEXT) > ?`;
      break;
    default:
      throw new CandidatureFieldServiceError("Unsupported candidature filter operator.");
  }
  const from = many ? ", json_each(v.value_json) item" : "";
  return {
    sql: `EXISTS (
      SELECT 1 FROM candidature_field_values v${from}
       WHERE v.candidature_id = c.id AND v.field_id = ? AND ${predicate}
    )`,
    params: [field.id, parameter],
  };
}

export function filterCandidatures(
  rootPath: string,
  rawFilter: CandidatureFieldFilter,
): string[] {
  const filter = candidatureFieldFilterSchema.parse(rawFilter);
  return withWorkspaceDatabase(rootPath, (database) => {
    const field = toDefinition(fieldRow(database, filter.fieldId));
    if (!allowedOperators(field).has(filter.operator)) {
      throw new CandidatureFieldServiceError("This filter operator is not available for the selected field.");
    }
    const comparison = comparisonSql(field, filter);
    return (
      database
        .prepare(`SELECT c.id FROM candidatures c WHERE ${comparison.sql} ORDER BY c.updated_at DESC, c.id`)
        .all(...comparison.params) as unknown as IdRow[]
    ).map((row) => row.id);
  });
}
