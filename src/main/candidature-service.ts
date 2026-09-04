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
  candidatureWorkingBriefSchema,
  candidatureWorkingBriefUpdateSchema,
  type CandidatureConceptSelection,
  type CandidatureDocumentSelection,
  type CandidatureInput,
  type CandidatureRecord,
  type CandidatureSource,
  type CandidatureSourceInput,
  type CandidatureSourceRemove,
  type CandidatureSourceUpdate,
  type CandidatureUpdate,
  type CandidatureWorkingBrief,
  type CandidatureWorkingBriefUpdate,
} from "../shared/contracts";
import { withWorkspaceDatabase } from "./workspace";

interface CandidatureRow {
  readonly id: string;
  readonly company: string;
  readonly role: string;
  readonly location: string;
  readonly workMode: string;
  readonly salaryText: string;
  readonly status: string;
  readonly priority: string;
  readonly applicationDate: string;
  readonly nextAction: string;
  readonly nextActionDate: string;
  readonly notes: string;
  readonly archived: number;
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

interface WorkingBriefRow {
  readonly candidatureId: string;
  readonly fitSuitability: string;
  readonly strengthsEvidence: string;
  readonly gapsRisksConstraints: string;
  readonly currentStrategy: string;
  readonly companyRoleContext: string;
  readonly pitch: string;
  readonly questions: string;
  readonly recruiterPreparation: string;
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

function readFirstSource(database: DatabaseSync, candidatureId: string): CandidatureSource | null {
  const row = database
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
        ORDER BY created_at, id
        LIMIT 1`,
    )
    .get(candidatureId) as unknown as SourceRow | undefined;
  return row ? candidatureSourceSchema.parse(row) : null;
}

function toRecord(database: DatabaseSync, row: CandidatureRow): CandidatureRecord {
  const source = readFirstSource(database, row.id);
  return candidatureRecordSchema.parse({
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location,
    workMode: row.workMode,
    salaryText: row.salaryText,
    source: source?.title ?? "",
    sourceUrl: source?.url ?? "",
    sourceText: source?.sourceText ?? "",
    status: row.status,
    priority: row.priority,
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
  salary_text AS salaryText, status, priority, application_date AS applicationDate,
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

function requireSourceOwner(
  database: DatabaseSync,
  candidatureId: string,
  sourceId: string,
): void {
  readCandidature(database, candidatureId);
  const present = database
    .prepare("SELECT 1 FROM candidature_sources WHERE id = ? AND candidature_id = ?")
    .get(sourceId, candidatureId);
  if (!present) {
    throw new CandidatureServiceError("The candidature source no longer exists.");
  }
}

function readWorkingBrief(database: DatabaseSync, candidatureId: string): CandidatureWorkingBrief {
  readCandidature(database, candidatureId);
  const row = database
    .prepare(
      `SELECT candidature_id AS candidatureId,
              fit_suitability AS fitSuitability,
              strengths_evidence AS strengthsEvidence,
              gaps_risks_constraints AS gapsRisksConstraints,
              current_strategy AS currentStrategy,
              company_role_context AS companyRoleContext,
              pitch,
              questions,
              recruiter_preparation AS recruiterPreparation
         FROM candidature_working_briefs
        WHERE candidature_id = ?`,
    )
    .get(candidatureId) as unknown as WorkingBriefRow | undefined;
  if (!row) {
    throw new CandidatureServiceError("The candidature working brief is unavailable.");
  }
  return candidatureWorkingBriefSchema.parse(row);
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
             source, source_url, source_text, status, priority, application_date,
             next_action, next_action_date, notes, archived, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, 0, ?, ?)`,
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
      if (
        candidature.source !== "" ||
        candidature.sourceUrl !== "" ||
        candidature.sourceText !== ""
      ) {
        database
          .prepare(
            `INSERT INTO candidature_sources(
               id, candidature_id, kind, title, url, source_text, created_at, updated_at
             ) VALUES (?, ?, 'other', ?, ?, ?, ?, ?)`,
          )
          .run(
            randomUUID(),
            id,
            candidature.source,
            candidature.sourceUrl,
            candidature.sourceText,
            now,
            now,
          );
      }
      database
        .prepare("INSERT INTO candidature_working_briefs(candidature_id) VALUES (?)")
        .run(id);
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
                  salary_text = ?, status = ?, priority = ?, application_date = ?,
                  next_action = ?, next_action_date = ?, notes = ?, archived = ?, updated_at = ?
            WHERE id = ?`,
        )
        .run(
          update.company,
          update.role,
          update.location,
          update.workMode,
          update.salaryText,
          update.status,
          update.priority,
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

export function listCandidatureSources(rootPath: string, candidatureId: string): CandidatureSource[] {
  return withWorkspaceDatabase(rootPath, (database) => {
    readCandidature(database, candidatureId);
    return readSources(database, candidatureId);
  });
}

export function addCandidatureSource(
  rootPath: string,
  input: CandidatureSourceInput,
): CandidatureSource[] {
  const source = candidatureSourceInputSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readCandidature(database, source.candidatureId);
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
      recordActivity(database, source.candidatureId, "candidature.source-added", now);
    });
    return readSources(database, source.candidatureId);
  });
}

export function updateCandidatureSource(
  rootPath: string,
  input: CandidatureSourceUpdate,
): CandidatureSource[] {
  const source = candidatureSourceUpdateSchema.parse(input);
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
      recordActivity(database, source.candidatureId, "candidature.source-updated", now);
    });
    return readSources(database, source.candidatureId);
  });
}

export function removeCandidatureSource(
  rootPath: string,
  input: CandidatureSourceRemove,
): CandidatureSource[] {
  const remove = candidatureSourceRemoveSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      requireSourceOwner(database, remove.candidatureId, remove.sourceId);
      database
        .prepare("DELETE FROM candidature_sources WHERE id = ? AND candidature_id = ?")
        .run(remove.sourceId, remove.candidatureId);
      recordActivity(database, remove.candidatureId, "candidature.source-removed", now);
    });
    return readSources(database, remove.candidatureId);
  });
}

export function getCandidatureWorkingBrief(
  rootPath: string,
  candidatureId: string,
): CandidatureWorkingBrief {
  return withWorkspaceDatabase(rootPath, (database) => readWorkingBrief(database, candidatureId));
}

export function updateCandidatureWorkingBrief(
  rootPath: string,
  input: CandidatureWorkingBriefUpdate,
): CandidatureWorkingBrief {
  const update = candidatureWorkingBriefUpdateSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readWorkingBrief(database, update.candidatureId);
      database
        .prepare(
          `UPDATE candidature_working_briefs
              SET fit_suitability = ?,
                  strengths_evidence = ?,
                  gaps_risks_constraints = ?,
                  current_strategy = ?,
                  company_role_context = ?,
                  pitch = ?,
                  questions = ?,
                  recruiter_preparation = ?,
                  updated_at = ?
            WHERE candidature_id = ?`,
        )
        .run(
          update.fitSuitability,
          update.strengthsEvidence,
          update.gapsRisksConstraints,
          update.currentStrategy,
          update.companyRoleContext,
          update.pitch,
          update.questions,
          update.recruiterPreparation,
          now,
          update.candidatureId,
        );
      recordActivity(database, update.candidatureId, "candidature.working-brief-updated", now);
    });
    return readWorkingBrief(database, update.candidatureId);
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
