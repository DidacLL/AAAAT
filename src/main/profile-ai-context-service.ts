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
  readonly aiContextMode: string;
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

function readPreference(
  database: DatabaseSync,
  itemId: string,
): ProfileAiContextPreference {
  const row = database
    .prepare("SELECT ai_context_mode AS aiContextMode FROM profile_items WHERE id = ?")
    .get(itemId) as unknown as PreferenceRow | undefined;
  if (!row) {
    throw new ProfileAiContextServiceError("The professional-information item no longer exists.");
  }
  return profileAiContextPreferenceSchema.parse({ itemId, aiContextMode: row.aiContextMode });
}

export function getProfileItemAiContextPreference(
  rootPath: string,
  itemId: string,
): ProfileAiContextPreference {
  const id = profileAiContextItemIdSchema.parse(itemId);
  return withWorkspaceDatabase(rootPath, (database) => readPreference(database, id));
}

export function getProfileItemAiContextMode(
  rootPath: string,
  itemId: string,
): ProfileAiContextPreference["aiContextMode"] {
  return getProfileItemAiContextPreference(rootPath, itemId).aiContextMode;
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
        .prepare("UPDATE profile_items SET ai_context_mode = ? WHERE id = ?")
        .run(update.aiContextMode, update.itemId);
      database
        .prepare(
          `INSERT INTO profile_activity(occurred_at, action, entity_type, entity_id)
           VALUES (?, ?, 'item', ?)`,
        )
        .run(now, "item.ai-context-updated", update.itemId);
    });
    return readPreference(database, update.itemId);
  });
}
