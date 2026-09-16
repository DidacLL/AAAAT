import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import {
  profileVariantInputSchema,
  profileVariantListSchema,
  profileVariantRecordSchema,
  profileVariantUpdateSchema,
  type ProfileVariantInput,
  type ProfileVariantRecord,
  type ProfileVariantUpdate,
} from "../shared/profile-variant-contracts";
import { getProfileItem } from "./profile-service";
import { withWorkspaceDatabase } from "./workspace";

interface VariantRow {
  readonly id: string;
  readonly itemId: string;
  readonly name: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly description: string | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly url: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

class ProfileVariantServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileVariantServiceError";
  }
}

function optional(value: string | null): string | undefined {
  return value === null ? undefined : value;
}
function nullable(value: string | undefined): string | null {
  return value === undefined ? null : value;
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

function toRecord(row: VariantRow): ProfileVariantRecord {
  return profileVariantRecordSchema.parse({
    id: row.id,
    itemId: row.itemId,
    name: row.name,
    content: {
      title: row.title,
      subtitle: optional(row.subtitle),
      description: optional(row.description),
      startDate: optional(row.startDate),
      endDate: optional(row.endDate),
      url: optional(row.url),
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function readRows(database: DatabaseSync): VariantRow[] {
  return database
    .prepare(`SELECT id, item_id AS itemId, name, title, subtitle, description,
                    start_date AS startDate, end_date AS endDate, url,
                    created_at AS createdAt, updated_at AS updatedAt
               FROM profile_variants
              ORDER BY item_id, name COLLATE NOCASE, id`)
    .all() as unknown as VariantRow[];
}

function readAll(database: DatabaseSync): ProfileVariantRecord[] {
  return profileVariantListSchema.parse(readRows(database).map(toRecord));
}

function requireVariant(database: DatabaseSync, id: string): VariantRow {
  const row = database
    .prepare(`SELECT id, item_id AS itemId, name, title, subtitle, description,
                    start_date AS startDate, end_date AS endDate, url,
                    created_at AS createdAt, updated_at AS updatedAt
               FROM profile_variants WHERE id = ?`)
    .get(id) as unknown as VariantRow | undefined;
  if (!row) throw new ProfileVariantServiceError("The saved profile variant no longer exists.");
  return row;
}

function assertNameAvailable(database: DatabaseSync, itemId: string, name: string, excludingId?: string): void {
  const row = excludingId
    ? database.prepare("SELECT id FROM profile_variants WHERE item_id = ? AND name = ? COLLATE NOCASE AND id <> ?").get(itemId, name, excludingId)
    : database.prepare("SELECT id FROM profile_variants WHERE item_id = ? AND name = ? COLLATE NOCASE").get(itemId, name);
  if (row) throw new ProfileVariantServiceError("That My information item already has a variant with this name.");
}

function recordActivity(database: DatabaseSync, action: string, id: string, now: string): void {
  database.prepare(`INSERT INTO profile_activity(occurred_at, action, entity_type, entity_id)
                    VALUES (?, ?, 'variant', ?)`)
    .run(now, action, id);
}

export function listProfileVariants(rootPath: string): ProfileVariantRecord[] {
  return withWorkspaceDatabase(rootPath, readAll);
}

export function getProfileVariant(rootPath: string, variantId: string): ProfileVariantRecord {
  return withWorkspaceDatabase(rootPath, (database) => toRecord(requireVariant(database, profileVariantRecordSchema.shape.id.parse(variantId))));
}

export function createProfileVariant(rootPath: string, rawInput: ProfileVariantInput): ProfileVariantRecord[] {
  const input = profileVariantInputSchema.parse(rawInput);
  getProfileItem(rootPath, input.itemId);
  return withWorkspaceDatabase(rootPath, (database) => {
    const id = randomUUID();
    const now = new Date().toISOString();
    transact(database, () => {
      assertNameAvailable(database, input.itemId, input.name);
      database.prepare(`INSERT INTO profile_variants(
        id, item_id, name, title, subtitle, description, start_date, end_date, url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          id, input.itemId, input.name, input.content.title,
          nullable(input.content.subtitle), nullable(input.content.description),
          nullable(input.content.startDate), nullable(input.content.endDate), nullable(input.content.url),
          now, now,
        );
      recordActivity(database, "variant.created", id, now);
    });
    return readAll(database);
  });
}

export function updateProfileVariant(rootPath: string, rawInput: ProfileVariantUpdate): ProfileVariantRecord[] {
  const input = profileVariantUpdateSchema.parse(rawInput);
  getProfileItem(rootPath, input.itemId);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      const existing = requireVariant(database, input.id);
      if (existing.itemId !== input.itemId) {
        throw new ProfileVariantServiceError("A profile variant cannot be moved to another My information item.");
      }
      assertNameAvailable(database, input.itemId, input.name, input.id);
      database.prepare(`UPDATE profile_variants
                           SET name = ?, title = ?, subtitle = ?, description = ?,
                               start_date = ?, end_date = ?, url = ?, updated_at = ?
                         WHERE id = ?`)
        .run(
          input.name, input.content.title, nullable(input.content.subtitle), nullable(input.content.description),
          nullable(input.content.startDate), nullable(input.content.endDate), nullable(input.content.url),
          now, input.id,
        );
      recordActivity(database, "variant.updated", input.id, now);
    });
    return readAll(database);
  });
}

export function removeProfileVariant(rootPath: string, variantId: string): ProfileVariantRecord[] {
  const id = profileVariantRecordSchema.shape.id.parse(variantId);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      requireVariant(database, id);
      database.prepare("DELETE FROM profile_variants WHERE id = ?").run(id);
      recordActivity(database, "variant.removed", id, now);
    });
    return readAll(database);
  });
}
