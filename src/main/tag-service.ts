import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import {
  tagInputSchema,
  tagListSchema,
  tagRecordSchema,
  tagUpdateSchema,
  type TagInput,
  type TagRecord,
  type TagUpdate,
} from "../shared/contracts";
import { withWorkspaceDatabase } from "./workspace";

interface TagRow {
  readonly id: string;
  readonly name: string;
  readonly definition: string;
  readonly notes: string;
  readonly aliasesJson: string;
}

class TagServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TagServiceError";
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
  tagId: string,
  action: string,
  occurredAt: string,
): void {
  database
    .prepare(
      `INSERT INTO tag_activity(occurred_at, tag_id, action)
       VALUES (?, ?, ?)`,
    )
    .run(occurredAt, tagId, action);
}

function toRecord(row: TagRow): TagRecord {
  let aliases: unknown;
  try {
    aliases = JSON.parse(row.aliasesJson);
  } catch {
    throw new TagServiceError("Stored tag aliases are invalid.");
  }
  return tagRecordSchema.parse({
    id: row.id,
    name: row.name,
    definition: row.definition,
    notes: row.notes,
    aliases,
  });
}

function readTag(database: DatabaseSync, tagId: string): TagRecord {
  const row = database
    .prepare(
      `SELECT id, name, definition, notes, aliases_json AS aliasesJson
         FROM tags
        WHERE id = ?`,
    )
    .get(tagId) as unknown as TagRow | undefined;
  if (!row) throw new TagServiceError("The tag no longer exists.");
  return toRecord(row);
}

export function listTags(rootPath: string): TagRecord[] {
  return withWorkspaceDatabase(rootPath, (database) => {
    const rows = database
      .prepare(
        `SELECT id, name, definition, notes, aliases_json AS aliasesJson
           FROM tags
          ORDER BY name COLLATE NOCASE, id`,
      )
      .all() as unknown as TagRow[];
    return tagListSchema.parse(rows.map(toRecord));
  });
}

export function createTag(rootPath: string, input: TagInput): TagRecord {
  const tag = tagInputSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const id = randomUUID();
    const now = new Date().toISOString();
    transact(database, () => {
      database
        .prepare(
          `INSERT INTO tags(id, name, definition, notes, aliases_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(id, tag.name, tag.definition, tag.notes ?? "", JSON.stringify(tag.aliases), now, now);
      recordActivity(database, id, "tag.created", now);
    });
    return readTag(database, id);
  });
}

export function updateTag(rootPath: string, input: TagUpdate): TagRecord {
  const update = tagUpdateSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      const current = readTag(database, update.id);
      database
        .prepare(
          `UPDATE tags
              SET name = ?, definition = ?, notes = ?, aliases_json = ?, updated_at = ?
            WHERE id = ?`,
        )
        .run(
          update.name,
          update.definition,
          update.notes ?? current.notes ?? "",
          JSON.stringify(update.aliases),
          now,
          update.id,
        );
      recordActivity(database, update.id, "tag.updated", now);
    });
    return readTag(database, update.id);
  });
}
