import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import {
  candidatureConceptSelectionSchema,
  candidatureDocumentSelectionSchema,
  candidatureInputSchema,
  candidatureListSchema,
  candidatureRecordSchema,
  candidatureUpdateSchema,
  type CandidatureConceptSelection,
  type CandidatureDocumentSelection,
  type CandidatureInput,
  type CandidatureRecord,
  type CandidatureUpdate,
} from "../shared/contracts";
import { withWorkspaceDatabase } from "./workspace";

interface CandidatureRow {
  readonly id: string;
  readonly company: string;
  readonly role: string;
  readonly location: string;
  readonly workMode: string;
  readonly salaryText: string;
  readonly source: string;
  readonly sourceUrl: string;
  readonly sourceText: string;
  readonly status: string;
  readonly applicationDate: string;
  readonly nextAction: string;
  readonly nextActionDate: string;
  readonly notes: string;
  readonly archived: number;
}

interface IdRow {
  readonly id: string;
}

class CandidatureServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidatureServiceError";
  }
}

function transact(database: DatabaseSync, action: () => void): void {
  database.exec("BEGIN IMMEDIATE");
  try {
    action();
    database.exec("COMMIT");
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

function toRecord(database: DatabaseSync, row: CandidatureRow): CandidatureRecord {
  return candidatureRecordSchema.parse({
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location,
    workMode: row.workMode,
    salaryText: row.salaryText,
    source: row.source,
    sourceUrl: row.sourceUrl,
    sourceText: row.sourceText,
    status: row.status,
    applicationDate: row.applicationDate,
    nextAction: row.nextAction,
    nextActionDate: row.nextActionDate,
    notes: row.notes,
    archived: row.archived === 1,
    documentIds: readDocumentIds(database, row.id),
    conceptIds: readConceptIds(database, row.id),
  });
}

const candidatureColumns = `id, company, role, location, work_mode AS workMode,
  salary_text AS salaryText, source, source_url AS sourceUrl,
  source_text AS sourceText, status, application_date AS applicationDate,
  next_action AS nextAction, next_action_date AS nextActionDate,
  notes, archived`;

function readCandidature(database: DatabaseSync, candidatureId: string): CandidatureRecord {
  const row = database
    .prepare(`SELECT ${candidatureColumns} FROM candidatures WHERE id = ?`)
    .get(candidatureId) as unknown as CandidatureRow | undefined;
  if (!row) {
    throw new CandidatureServiceError("The candidature no longer exists.");
  }
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

function requireDocument(database: DatabaseSync, documentId: string): void {
  const present = database.prepare("SELECT 1 FROM documents WHERE id = ?").get(documentId);
  if (!present) {
    throw new CandidatureServiceError("An associated document no longer exists.");
  }
}

function requireConcept(database: DatabaseSync, conceptId: string): void {
  const present = database.prepare("SELECT 1 FROM concepts WHERE id = ?").get(conceptId);
  if (!present) {
    throw new CandidatureServiceError("An associated concept no longer exists.");
  }
}

export function listCandidatures(rootPath: string): CandidatureRecord[] {
  return withWorkspaceDatabase(rootPath, readCandidatures);
}

export function createCandidature(
  rootPath: string,
  input: CandidatureInput,
): CandidatureRecord {
  const candidature = candidatureInputSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const id = randomUUID();
    const now = new Date().toISOString();
    transact(database, () => {
      database
        .prepare(
          `INSERT INTO candidatures(
             id, company, role, location, work_mode, salary_text,
             source, source_url, source_text, status, application_date,
             next_action, next_action_date, notes, archived, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        )
        .run(
          id,
          candidature.company,
          candidature.role,
          candidature.location,
          candidature.workMode,
          candidature.salaryText,
          candidature.source,
          candidature.sourceUrl,
          candidature.sourceText,
          candidature.status,
          candidature.applicationDate,
          candidature.nextAction,
          candidature.nextActionDate,
          candidature.notes,
          now,
          now,
        );
      recordActivity(database, id, "candidature.created", now);
    });
    return readCandidature(database, id);
  });
}

export function updateCandidature(
  rootPath: string,
  input: CandidatureUpdate,
): CandidatureRecord {
  const update = candidatureUpdateSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readCandidature(database, update.id);
      database
        .prepare(
          `UPDATE candidatures
              SET company = ?, role = ?, location = ?, work_mode = ?,
                  salary_text = ?, source = ?, source_url = ?, source_text = ?,
                  status = ?, application_date = ?, next_action = ?,
                  next_action_date = ?, notes = ?, archived = ?, updated_at = ?
            WHERE id = ?`,
        )
        .run(
          update.company,
          update.role,
          update.location,
          update.workMode,
          update.salaryText,
          update.source,
          update.sourceUrl,
          update.sourceText,
          update.status,
          update.applicationDate,
          update.nextAction,
          update.nextActionDate,
          update.notes,
          update.archived ? 1 : 0,
          now,
          update.id,
        );
      recordActivity(database, update.id, "candidature.updated", now);
    });
    return readCandidature(database, update.id);
  });
}

export function setCandidatureDocuments(
  rootPath: string,
  input: CandidatureDocumentSelection,
): CandidatureRecord {
  const selection = candidatureDocumentSelectionSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readCandidature(database, selection.candidatureId);
      for (const documentId of selection.documentIds) {
        requireDocument(database, documentId);
      }
      database
        .prepare("DELETE FROM candidature_documents WHERE candidature_id = ?")
        .run(selection.candidatureId);
      const insert = database.prepare(
        `INSERT INTO candidature_documents(candidature_id, document_id)
         VALUES (?, ?)`,
      );
      for (const documentId of selection.documentIds) {
        insert.run(selection.candidatureId, documentId);
      }
      recordActivity(
        database,
        selection.candidatureId,
        "candidature.documents-updated",
        now,
      );
    });
    return readCandidature(database, selection.candidatureId);
  });
}

export function setCandidatureConcepts(
  rootPath: string,
  input: CandidatureConceptSelection,
): CandidatureRecord {
  const selection = candidatureConceptSelectionSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readCandidature(database, selection.candidatureId);
      for (const conceptId of selection.conceptIds) {
        requireConcept(database, conceptId);
      }
      database
        .prepare("DELETE FROM candidature_concepts WHERE candidature_id = ?")
        .run(selection.candidatureId);
      const insert = database.prepare(
        `INSERT INTO candidature_concepts(candidature_id, concept_id)
         VALUES (?, ?)`,
      );
      for (const conceptId of selection.conceptIds) {
        insert.run(selection.candidatureId, conceptId);
      }
      recordActivity(
        database,
        selection.candidatureId,
        "candidature.concepts-updated",
        now,
      );
    });
    return readCandidature(database, selection.candidatureId);
  });
}
