import {
  focusMaterialPreferencesSchema,
  type FocusMaterialPreferences,
} from "../shared/focus-contracts";
import { withWorkspaceDatabase } from "./workspace";

const preferenceKey = "focus.structural-material";

export const defaultFocusMaterialPreferences: FocusMaterialPreferences = Object.freeze({
  sources: true,
  concepts: true,
  todos: true,
  documents: true,
});

export function getFocusMaterialPreferences(rootPath: string): FocusMaterialPreferences {
  return withWorkspaceDatabase(rootPath, (database) => {
    const row = database
      .prepare("SELECT value FROM workspace_metadata WHERE key = ?")
      .get(preferenceKey) as { value: string } | undefined;
    if (!row) return defaultFocusMaterialPreferences;
    try {
      return focusMaterialPreferencesSchema.parse(JSON.parse(row.value));
    } catch {
      throw new Error("Stored Focus material preferences are invalid.");
    }
  });
}

export function updateFocusMaterialPreferences(
  rootPath: string,
  preferences: FocusMaterialPreferences,
): FocusMaterialPreferences {
  const next = focusMaterialPreferencesSchema.parse(preferences);
  return withWorkspaceDatabase(rootPath, (database) => {
    database
      .prepare(
        `INSERT INTO workspace_metadata(key, value)
         VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(preferenceKey, JSON.stringify(next));
    return next;
  });
}
