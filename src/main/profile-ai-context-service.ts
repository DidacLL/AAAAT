import type { DatabaseSync } from "node:sqlite";

import {
  profileAiContextItemIdSchema,
  profileAiContextPreferenceSchema,
  profileAiContextUpdateSchema,
  type ProfileAiContextPreference,
  type ProfileAiContextUpdate,
} from "../shared/profile-ai-context-contracts";
import { withWorkspaceDatabase } from "./workspace";

interface PreferenceRow {
  readonly itemId: string;
  readonly aiUseAllowed: number;
}

export class ProfileAiContextServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileAiContextServiceError";
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

function preference(row: PreferenceRow): ProfileAiContextPreference {
  return profileAiContextPreferenceSchema.parse({
    itemId: row.itemId,
    aiUseAllowed: row.aiUseAllowed === 1,
  });
}

function readPreference(
  database: DatabaseSync,
  itemId: string,
): ProfileAiContextPreference {
  const row = database
    .prepare("SELECT id AS itemId, ai_use_allowed AS aiUseAllowed FROM profile_items WHERE id = ?")
    .get(itemId) as unknown as PreferenceRow | undefined;
  if (!row) {
    throw new ProfileAiContextServiceError("The professional-information item no longer exists.");
  }
  return preference(row);
}

export function getProfileItemAiContextPreference(
  rootPath: string,
  itemId: string,
): ProfileAiContextPreference {
  const id = profileAiContextItemIdSchema.parse(itemId);
  return withWorkspaceDatabase(rootPath, (database) => readPreference(database, id));
}

export function listProfileItemAiContextPreferences(
  rootPath: string,
): ProfileAiContextPreference[] {
  return withWorkspaceDatabase(rootPath, (database) => {
    const rows = database
      .prepare(
        "SELECT id AS itemId, ai_use_allowed AS aiUseAllowed FROM profile_items ORDER BY sort_order, id",
      )
      .all() as unknown as PreferenceRow[];
    return rows.map(preference);
  });
}

export function updateProfileItemAiContextPreference(
  rootPath: string,
  input: ProfileAiContextUpdate,
): ProfileAiContextPreference {
  const update = profileAiContextUpdateSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readPreference(database, update.itemId);
      database
        .prepare("UPDATE profile_items SET ai_use_allowed = ?, updated_at = ? WHERE id = ?")
        .run(update.aiUseAllowed ? 1 : 0, now, update.itemId);
      database
        .prepare(
          `INSERT INTO profile_activity(occurred_at, action, entity_type, entity_id)
           VALUES (?, ?, 'item', ?)`,
        )
        .run(now, "item.ai-use-updated", update.itemId);
    });
    return readPreference(database, update.itemId);
  });
}
