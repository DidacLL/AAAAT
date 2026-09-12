import type { DatabaseSync } from "node:sqlite";

import {
  careerContextAiDisclosureSchema,
  careerContextAiDisclosureUpdateSchema,
  type CareerContextAiDisclosure,
  type CareerContextAiDisclosureUpdate,
} from "../shared/career-context-ai-disclosure-contracts";
import { withWorkspaceDatabase } from "./workspace";

interface DisclosureRow {
  readonly careerDirection: number;
  readonly objectives: number;
  readonly constraints: number;
  readonly targetRoles: number;
  readonly targetMarketsLocations: number;
  readonly workPreferences: number;
  readonly applicationWritingPreferences: number;
}

function readDisclosure(database: DatabaseSync): CareerContextAiDisclosure {
  const row = database
    .prepare(
      `SELECT career_direction_external_ai_visible AS careerDirection,
              objectives_external_ai_visible AS objectives,
              constraints_external_ai_visible AS constraints,
              target_roles_external_ai_visible AS targetRoles,
              target_markets_locations_external_ai_visible AS targetMarketsLocations,
              work_preferences_external_ai_visible AS workPreferences,
              application_writing_preferences_external_ai_visible AS applicationWritingPreferences
       FROM career_context
       WHERE id = 1`,
    )
    .get() as unknown as DisclosureRow | undefined;
  if (!row) throw new Error("The workspace Career preferences are unavailable.");
  return careerContextAiDisclosureSchema.parse({
    careerDirection: row.careerDirection === 1,
    objectives: row.objectives === 1,
    constraints: row.constraints === 1,
    targetRoles: row.targetRoles === 1,
    targetMarketsLocations: row.targetMarketsLocations === 1,
    workPreferences: row.workPreferences === 1,
    applicationWritingPreferences: row.applicationWritingPreferences === 1,
  });
}

export function getCareerContextAiDisclosure(rootPath: string): CareerContextAiDisclosure {
  return withWorkspaceDatabase(rootPath, readDisclosure);
}

export function updateCareerContextAiDisclosure(
  rootPath: string,
  rawUpdate: CareerContextAiDisclosureUpdate,
): CareerContextAiDisclosure {
  const update = careerContextAiDisclosureUpdateSchema.parse(rawUpdate);
  return withWorkspaceDatabase(rootPath, (database) => {
    const current = readDisclosure(database);
    if (JSON.stringify(current) === JSON.stringify(update)) return current;

    const occurredAt = new Date().toISOString();
    database.exec("BEGIN IMMEDIATE");
    try {
      database
        .prepare(
          `UPDATE career_context
           SET career_direction_external_ai_visible = ?,
               objectives_external_ai_visible = ?,
               constraints_external_ai_visible = ?,
               target_roles_external_ai_visible = ?,
               target_markets_locations_external_ai_visible = ?,
               work_preferences_external_ai_visible = ?,
               application_writing_preferences_external_ai_visible = ?,
               updated_at = ?
           WHERE id = 1`,
        )
        .run(
          update.careerDirection ? 1 : 0,
          update.objectives ? 1 : 0,
          update.constraints ? 1 : 0,
          update.targetRoles ? 1 : 0,
          update.targetMarketsLocations ? 1 : 0,
          update.workPreferences ? 1 : 0,
          update.applicationWritingPreferences ? 1 : 0,
          occurredAt,
        );
      database
        .prepare(
          `INSERT INTO career_context_activity(occurred_at, action)
           VALUES (?, ?)`,
        )
        .run(occurredAt, "career-context.ai-disclosure-updated");
      const result = readDisclosure(database);
      database.exec("COMMIT");
      return result;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  });
}
