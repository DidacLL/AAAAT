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
  readonly aiContextMode: string;
}

export class ProfileAiContextServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileAiContextServiceError";
  }
}

function preference(row: PreferenceRow): ProfileAiContextPreference {
  return profileAiContextPreferenceSchema.parse(row);
}

function readPreference(
  database: DatabaseSync,
  itemId: string,
): ProfileAiContextPreference {
  const row = database
    .prepare("SELECT id AS itemId, ai_context_mode AS aiContextMode FROM profile_items WHERE id = ?")
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
        "SELECT id AS itemId, ai_context_mode AS aiContextMode FROM profile_items ORDER BY sort_order, id",
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
    readPreference(database, update.itemId);
    database
      .prepare("UPDATE profile_items SET ai_context_mode = ? WHERE id = ?")
      .run(update.aiContextMode, update.itemId);
    return readPreference(database, update.itemId);
  });
}
