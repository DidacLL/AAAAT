import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import {
  conceptInputSchema,
  conceptListSchema,
  conceptRecordSchema,
  conceptUpdateSchema,
  type ConceptInput,
  type ConceptRecord,
  type ConceptUpdate,
} from "../shared/contracts";
import { withWorkspaceDatabase } from "./workspace";

interface ConceptRow {
  readonly id: string;
  readonly name: string;
  readonly definition: string;
  readonly aliasesJson: string;
}

class ConceptServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConceptServiceError";
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

function recordActivity(
  database: DatabaseSync,
  conceptId: string,
  action: string,
  occurredAt: string,
): void {
  database
    .prepare(
      `INSERT INTO concept_activity(occurred_at, concept_id, action)
       VALUES (?, ?, ?)`,
    )
    .run(occurredAt, conceptId, action);
}

function toRecord(row: ConceptRow): ConceptRecord {
  let aliases: unknown;
  try {
    aliases = JSON.parse(row.aliasesJson);
  } catch {
    throw new ConceptServiceError("Stored concept aliases are invalid.");
  }
  return conceptRecordSchema.parse({
    id: row.id,
    name: row.name,
    definition: row.definition,
    aliases,
  });
}

function readConcept(database: DatabaseSync, conceptId: string): ConceptRecord {
  const row = database
    .prepare(
      `SELECT id, name, definition, aliases_json AS aliasesJson
         FROM concepts
        WHERE id = ?`,
    )
    .get(conceptId) as unknown as ConceptRow | undefined;
  if (!row) {
    throw new ConceptServiceError("The concept no longer exists.");
  }
  return toRecord(row);
}

export function listConcepts(rootPath: string): ConceptRecord[] {
  return withWorkspaceDatabase(rootPath, (database) => {
    const rows = database
      .prepare(
        `SELECT id, name, definition, aliases_json AS aliasesJson
           FROM concepts
          ORDER BY name COLLATE NOCASE, id`,
      )
      .all() as unknown as ConceptRow[];
    return conceptListSchema.parse(rows.map(toRecord));
  });
}

export function createConcept(
  rootPath: string,
  input: ConceptInput,
): ConceptRecord {
  const concept = conceptInputSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const id = randomUUID();
    const now = new Date().toISOString();
    transact(database, () => {
      database
        .prepare(
          `INSERT INTO concepts(id, name, definition, aliases_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          concept.name,
          concept.definition,
          JSON.stringify(concept.aliases),
          now,
          now,
        );
      recordActivity(database, id, "concept.created", now);
    });
    return readConcept(database, id);
  });
}

export function updateConcept(
  rootPath: string,
  input: ConceptUpdate,
): ConceptRecord {
  const update = conceptUpdateSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readConcept(database, update.id);
      database
        .prepare(
          `UPDATE concepts
              SET name = ?, definition = ?, aliases_json = ?, updated_at = ?
            WHERE id = ?`,
        )
        .run(
          update.name,
          update.definition,
          JSON.stringify(update.aliases),
          now,
          update.id,
        );
      recordActivity(database, update.id, "concept.updated", now);
    });
    return readConcept(database, update.id);
  });
}