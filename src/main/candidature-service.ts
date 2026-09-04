import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import {
  candidatureConceptSelectionSchema,
  candidatureDocumentSelectionSchema,
  candidatureInputSchema,
  candidatureListSchema,
  candidatureRecordSchema,
  candidatureSourceInputSchema,
  candidatureSourceListSchema,
  candidatureSourceRemoveSchema,
  candidatureSourceSchema,
  candidatureSourceUpdateSchema,
  candidatureUpdateSchema,
  type CandidatureConceptSelection,
  type CandidatureDocumentSelection,
  type CandidatureInput,
  type CandidatureRecord,
  type CandidatureSource,
  type CandidatureSourceInput,
  type CandidatureSourceRemove,
  type CandidatureSourceUpdate,
  type CandidatureUpdate,
} from "../shared/contracts";
import {
  candidatureLabelInDatabase,
  readCandidatureFieldValuesInDatabase,
  setCandidatureFieldValueInDatabase,
} from "./candidature-field-service";
import { withWorkspaceDatabase } from "./workspace";

interface CandidatureRow {
  readonly id: string;
  readonly archived: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface SourceRow {
  readonly id: string;
  readonly candidatureId: string;
  readonly kind: string;
  readonly title: string;
  readonly url: string;
  readonly sourceText: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface IdRow {
  readonly id: string;
}

export class CandidatureServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidatureServiceError";
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

function readDocumentIds(database: DatabaseSync, candidatureId: string): string[] {
  return (
    database
      .prepare(
        `SELECT document_id AS id
           FROM candidature_documents
          WHERE candidature_id = ?
          ORDER BY document_id`,
      )
      .all(candidatureId) as unknown as IdRow[]
  ).map((row) => row.id);
}

function readConceptIds(database: DatabaseSync, candidatureId: string): string[] {
  return (
    database
      .prepare(
        `SELECT concept_id AS id
           FROM candidature_concepts
          WHERE candidature_id = ?
          ORDER BY concept_id`,
      )
      .all(candidatureId) as unknown as IdRow[]
  ).map((row) => row.id);
}

function readSources(database: DatabaseSync, candidatureId: string): CandidatureSource[] {
  const rows = database
    .prepare(
      `SELECT id,
              candidature_id AS candidatureId,
              kind,
              title,
              url,
              source_text AS sourceText,
              created_at AS createdAt,
              updated_at AS updatedAt
         FROM candidature_sources
        WHERE candidature_id = ?
        ORDER BY created_at, id`,
    )
    .all(candidatureId) as unknown as SourceRow[];
  return candidatureSourceListSchema.parse(rows);
}

function toRecord(database: DatabaseSync, row: CandidatureRow): CandidatureRecord {
  return candidatureRecordSchema.parse({
    id: row.id,
    archived: row.archived === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    label: candidatureLabelInDatabase(database, row.id, row.createdAt),
    values: readCandidatureFieldValuesInDatabase(database, row.id),
    documentIds: readDocumentIds(database, row.id),
    conceptIds: readConceptIds(database, row.id),
  });
}

const candidatureColumns =
  "id, archived, created_at AS createdAt, updated_at AS updatedAt";

function readCandidatureInDatabase(
  database: DatabaseSync,
  candidatureId: string,
): CandidatureRecord {
  const row = database
    .prepare(`SELECT ${candidatureColumns} FROM candidatures WHERE id = ?`)
    .get(candidatureId) as unknown as CandidatureRow | undefined;
  if (!row) throw new CandidatureServiceError("The candidature no longer exists.");
  return toRecord(database, row);
}

function readCandidatures(database: DatabaseSync): CandidatureRecord[] {
  const rows = database
    .prepare(
      `SELECT ${candidatureColumns}
         FROM candidatures
        ORDER BY archived, updated_at DESC, id`,
    )
    .all() as unknown as CandidatureRow[];
  return candidatureListSchema.parse(rows.map((row) => toRecord(database, row)));
}

function recordActivity(
  database: DatabaseSync,
  candidatureId: string,
  action: string,
  occurredAt: string,
): void {
  database
    .prepare(
      `INSERT INTO candidature_activity(occurred_at, candidature_id, action)
       VALUES (?, ?, ?)`,
    )
    .run(occurredAt, candidatureId, action);
}

function touch(database: DatabaseSync, candidatureId: string, now: string): void {
  database
    .prepare("UPDATE candidatures SET updated_at = ? WHERE id = ?")
    .run(now, candidatureId);
}

function requireDocument(database: DatabaseSync, documentId: string): void {
  if (!database.prepare("SELECT 1 FROM documents WHERE id = ?").get(documentId)) {
    throw new CandidatureServiceError("An associated document no longer exists.");
  }
}

function requireConcept(database: DatabaseSync, conceptId: string): void {
  if (!database.prepare("SELECT 1 FROM concepts WHERE id = ?").get(conceptId)) {
    throw new CandidatureServiceError("An associated concept no longer exists.");
  }
}

function requireSourceOwner(
  database: DatabaseSync,
  candidatureId: string,
  sourceId: string,
): void {
  readCandidatureInDatabase(database, candidatureId);
  if (
    !database
      .prepare("SELECT 1 FROM candidature_sources WHERE id = ? AND candidature_id = ?")
      .get(sourceId, candidatureId)
  ) {
    throw new CandidatureServiceError("The candidature source no longer exists.");
  }
}

export function getCandidature(rootPath: string, candidatureId: string): CandidatureRecord {
  return withWorkspaceDatabase(rootPath, (database) =>
    readCandidatureInDatabase(database, candidatureId),
  );
}

export function listCandidatures(rootPath: string): CandidatureRecord[] {
  return withWorkspaceDatabase(rootPath, readCandidatures);
}

export function createCandidature(
  rootPath: string,
  rawInput: CandidatureInput,
): CandidatureRecord {
  const input = candidatureInputSchema.parse(rawInput);
  if (new Set(input.values.map((value) => value.fieldId)).size !== input.values.length) {
    throw new CandidatureServiceError("Each candidature field can be set only once during creation.");
  }
  return withWorkspaceDatabase(rootPath, (database) => {
    const id = randomUUID();
    const now = new Date().toISOString();
    transact(database, () => {
      database
        .prepare(
          `INSERT INTO candidatures(id, archived, created_at, updated_at)
           VALUES (?, 0, ?, ?)`,
        )
        .run(id, now, now);

      const source = input.source;
      if (source && (source.title.trim() || source.url.trim() || source.sourceText.trim())) {
        database
          .prepare(
            `INSERT INTO candidature_sources(
               id, candidature_id, kind, title, url, source_text, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            randomUUID(),
            id,
            source.kind,
            source.title,
            source.url,
            source.sourceText,
            now,
            now,
          );
      }

      for (const value of input.values) {
        setCandidatureFieldValueInDatabase(
          database,
          { candidatureId: id, fieldId: value.fieldId, value: value.value },
          now,
        );
      }
      recordActivity(database, id, "candidature.created", now);
    });
    return readCandidatureInDatabase(database, id);
  });
}

export function updateCandidature(
  rootPath: string,
  rawInput: CandidatureUpdate,
): CandidatureRecord {
  const update = candidatureUpdateSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readCandidatureInDatabase(database, update.id);
      database
        .prepare("UPDATE candidatures SET archived = ?, updated_at = ? WHERE id = ?")
        .run(update.archived ? 1 : 0, now, update.id);
      recordActivity(database, update.id, "candidature.updated", now);
    });
    return readCandidatureInDatabase(database, update.id);
  });
}

export function listCandidatureSources(
  rootPath: string,
  candidatureId: string,
): CandidatureSource[] {
  return withWorkspaceDatabase(rootPath, (database) => {
    readCandidatureInDatabase(database, candidatureId);
    return readSources(database, candidatureId);
  });
}

export function addCandidatureSource(
  rootPath: string,
  rawInput: CandidatureSourceInput,
): CandidatureSource[] {
  const source = candidatureSourceInputSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readCandidatureInDatabase(database, source.candidatureId);
      database
        .prepare(
          `INSERT INTO candidature_sources(
             id, candidature_id, kind, title, url, source_text, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          source.candidatureId,
          source.kind,
          source.title,
          source.url,
          source.sourceText,
          now,
          now,
        );
      touch(database, source.candidatureId, now);
      recordActivity(database, source.candidatureId, "candidature.source-added", now);
    });
    return readSources(database, source.candidatureId);
  });
}

export function updateCandidatureSource(
  rootPath: string,
  rawInput: CandidatureSourceUpdate,
): CandidatureSource[] {
  const source = candidatureSourceUpdateSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      requireSourceOwner(database, source.candidatureId, source.id);
      database
        .prepare(
          `UPDATE candidature_sources
              SET kind = ?, title = ?, url = ?, source_text = ?, updated_at = ?
            WHERE id = ? AND candidature_id = ?`,
        )
        .run(
          source.kind,
          source.title,
          source.url,
          source.sourceText,
          now,
          source.id,
          source.candidatureId,
        );
      touch(database, source.candidatureId, now);
      recordActivity(database, source.candidatureId, "candidature.source-updated", now);
    });
    return readSources(database, source.candidatureId);
  });
}

export function removeCandidatureSource(
  rootPath: string,
  rawInput: CandidatureSourceRemove,
): CandidatureSource[] {
  const remove = candidatureSourceRemoveSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      requireSourceOwner(database, remove.candidatureId, remove.sourceId);
      database
        .prepare("DELETE FROM candidature_sources WHERE id = ? AND candidature_id = ?")
        .run(remove.sourceId, remove.candidatureId);
      touch(database, remove.candidatureId, now);
      recordActivity(database, remove.candidatureId, "candidature.source-removed", now);
    });
    return readSources(database, remove.candidatureId);
  });
}

export function setCandidatureDocuments(
  rootPath: string,
  rawInput: CandidatureDocumentSelection,
): CandidatureRecord {
  const selection = candidatureDocumentSelectionSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readCandidatureInDatabase(database, selection.candidatureId);
      for (const documentId of selection.documentIds) requireDocument(database, documentId);
      database
        .prepare("DELETE FROM candidature_documents WHERE candidature_id = ?")
        .run(selection.candidatureId);
      const insert = database.prepare(
        "INSERT INTO candidature_documents(candidature_id, document_id) VALUES (?, ?)",
      );
      for (const documentId of selection.documentIds) insert.run(selection.candidatureId, documentId);
      touch(database, selection.candidatureId, now);
      recordActivity(database, selection.candidatureId, "candidature.documents-updated", now);
    });
    return readCandidatureInDatabase(database, selection.candidatureId);
  });
}

export function setCandidatureConcepts(
  rootPath: string,
  rawInput: CandidatureConceptSelection,
): CandidatureRecord {
  const selection = candidatureConceptSelectionSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readCandidatureInDatabase(database, selection.candidatureId);
      for (const conceptId of selection.conceptIds) requireConcept(database, conceptId);
      database
        .prepare("DELETE FROM candidature_concepts WHERE candidature_id = ?")
        .run(selection.candidatureId);
      const insert = database.prepare(
        "INSERT INTO candidature_concepts(candidature_id, concept_id) VALUES (?, ?)",
      );
      for (const conceptId of selection.conceptIds) insert.run(selection.candidatureId, conceptId);
      touch(database, selection.candidatureId, now);
      recordActivity(database, selection.candidatureId, "candidature.concepts-updated", now);
    });
    return readCandidatureInDatabase(database, selection.candidatureId);
  });
}

export function listCandidatureSourcesInDatabase(
  database: DatabaseSync,
  candidatureId: string,
): CandidatureSource[] {
  return readSources(database, candidatureId).map((source) => candidatureSourceSchema.parse(source));
}
