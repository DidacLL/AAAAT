import type { DatabaseSync } from "node:sqlite";

import {
  careerContextSchema,
  careerContextUpdateSchema,
  type CareerContext,
  type CareerContextUpdate,
} from "../shared/contracts";
import { withWorkspaceDatabase } from "./workspace";

interface CareerContextRow {
  readonly careerDirection: string;
  readonly objectives: string;
  readonly constraints: string;
  readonly targetRoles: string;
  readonly targetMarketsLocations: string;
  readonly workPreferences: string;
  readonly applicationWritingPreferences: string;
}

function readCareerContext(database: DatabaseSync): CareerContext {
  const row = database
    .prepare(
      `SELECT career_direction AS careerDirection,
              objectives,
              constraints_text AS constraints,
              target_roles AS targetRoles,
              target_markets_locations AS targetMarketsLocations,
              work_preferences AS workPreferences,
              application_writing_preferences AS applicationWritingPreferences
       FROM career_context
       WHERE id = 1`,
    )
    .get() as unknown as CareerContextRow | undefined;

  if (!row) {
    throw new Error("The workspace career context is unavailable.");
  }

  return careerContextSchema.parse(row);
}

export function getCareerContext(rootPath: string): CareerContext {
  return withWorkspaceDatabase(rootPath, readCareerContext);
}

export function updateCareerContext(
  rootPath: string,
  rawUpdate: CareerContextUpdate,
): CareerContext {
  const update = careerContextUpdateSchema.parse(rawUpdate);
  return withWorkspaceDatabase(rootPath, (database) => {
    const occurredAt = new Date().toISOString();
    database.exec("BEGIN IMMEDIATE");
    try {
      database
        .prepare(
          `UPDATE career_context
           SET career_direction = ?,
               objectives = ?,
               constraints_text = ?,
               target_roles = ?,
               target_markets_locations = ?,
               work_preferences = ?,
               application_writing_preferences = ?,
               updated_at = ?
           WHERE id = 1`,
        )
        .run(
          update.careerDirection,
          update.objectives,
          update.constraints,
          update.targetRoles,
          update.targetMarketsLocations,
          update.workPreferences,
          update.applicationWritingPreferences,
          occurredAt,
        );
      database
        .prepare(
          `INSERT INTO career_context_activity(occurred_at, action)
           VALUES (?, ?)`,
        )
        .run(occurredAt, "career-context.updated");
      const result = readCareerContext(database);
      database.exec("COMMIT");
      return result;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  });
}
