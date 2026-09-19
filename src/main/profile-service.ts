import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import {
  profileItemInputSchema,
  profileItemSchema,
  profileItemUpdateSchema,
  profileSnapshotSchema,
  type ProfileItem,
  type ProfileItemInput,
  type ProfileItemUpdate,
  type ProfileSnapshot,
} from "../shared/contracts";
import { cvTemplateReferencesProfileItem } from "./cv-template-references";
import { withWorkspaceDatabase } from "./workspace";

interface ProfileItemRow {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly description: string | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly url: string | null;
  readonly sortOrder: number;
}

class ProfileServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileServiceError";
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

function nullable(value: string | undefined): string | null {
  return value === undefined ? null : value;
}
function optional(value: string | null): string | undefined {
  return value === null ? undefined : value;
}

function toItem(row: ProfileItemRow): ProfileItem {
  return profileItemSchema.parse({
    id: row.id,
    kind: row.kind,
    title: row.title,
    subtitle: optional(row.subtitle),
    description: optional(row.description),
    startDate: optional(row.startDate),
    endDate: optional(row.endDate),
    url: optional(row.url),
    sortOrder: row.sortOrder,
  });
}

function readItems(database: DatabaseSync): ProfileItem[] {
  const rows = database
    .prepare(`SELECT id, kind, title, subtitle, description,
                    start_date AS startDate, end_date AS endDate,
                    url, sort_order AS sortOrder
               FROM profile_items
              ORDER BY sort_order, id`)
    .all() as unknown as ProfileItemRow[];
  return rows.map(toItem);
}

function readSnapshot(database: DatabaseSync): ProfileSnapshot {
  return profileSnapshotSchema.parse({ items: readItems(database) });
}

function requireItem(database: DatabaseSync, itemId: string): ProfileItem {
  const row = database
    .prepare(`SELECT id, kind, title, subtitle, description,
                    start_date AS startDate, end_date AS endDate,
                    url, sort_order AS sortOrder
               FROM profile_items WHERE id = ?`)
    .get(itemId) as unknown as ProfileItemRow | undefined;
  if (!row) throw new ProfileServiceError("The profile item no longer exists.");
  return toItem(row);
}

function recordActivity(database: DatabaseSync, action: string, entityId: string, occurredAt: string): void {
  database
    .prepare(`INSERT INTO profile_activity(occurred_at, action, entity_type, entity_id)
              VALUES (?, ?, 'item', ?)`)
    .run(occurredAt, action, entityId);
}

export function getProfile(rootPath: string): ProfileSnapshot {
  return withWorkspaceDatabase(rootPath, readSnapshot);
}

export function getProfileItem(rootPath: string, itemId: string): ProfileItem {
  return withWorkspaceDatabase(rootPath, (database) => requireItem(database, profileItemSchema.shape.id.parse(itemId)));
}

export function addProfileItem(rootPath: string, rawInput: ProfileItemInput): ProfileSnapshot {
  const input = profileItemInputSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) => {
    const id = randomUUID();
    const now = new Date().toISOString();
    const next = database
      .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS value FROM profile_items")
      .get() as unknown as { value: number };
    transact(database, () => {
      database
        .prepare(`INSERT INTO profile_items(
          id, kind, title, subtitle, description, start_date, end_date, url,
          sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          id,
          input.kind,
          input.title,
          nullable(input.subtitle),
          nullable(input.description),
          nullable(input.startDate),
          nullable(input.endDate),
          nullable(input.url),
          next.value,
          now,
          now,
        );
      recordActivity(database, "item.added", id, now);
    });
    return readSnapshot(database);
  });
}

export function updateProfileItem(rootPath: string, rawUpdate: ProfileItemUpdate): ProfileSnapshot {
  const update = profileItemUpdateSchema.parse(rawUpdate);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      requireItem(database, update.id);
      database
        .prepare(`UPDATE profile_items
                     SET kind = ?, title = ?, subtitle = ?, description = ?,
                         start_date = ?, end_date = ?, url = ?, updated_at = ?
                   WHERE id = ?`)
        .run(
          update.item.kind,
          update.item.title,
          nullable(update.item.subtitle),
          nullable(update.item.description),
          nullable(update.item.startDate),
          nullable(update.item.endDate),
          nullable(update.item.url),
          now,
          update.id,
        );
      recordActivity(database, "item.updated", update.id, now);
    });
    return readSnapshot(database);
  });
}

export function removeProfileItem(rootPath: string, itemId: string): ProfileSnapshot {
  const id = profileItemSchema.shape.id.parse(itemId);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      requireItem(database, id);
      if (cvTemplateReferencesProfileItem(database, id)) {
        throw new ProfileServiceError(
          "This My information item is used by a reusable CV template. Change the template before removing it.",
        );
      }
      database.prepare("DELETE FROM profile_items WHERE id = ?").run(id);
      recordActivity(database, "item.removed", id, now);
    });
    return readSnapshot(database);
  });
}
