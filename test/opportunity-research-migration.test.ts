// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";

const candidatureMigration004Sha256 =
  "cd99bdafdfb0bf4f4203221715be57ec9015fd4a8d1184e18bf20e71a1c7f87d";

describe("opportunity research migration", () => {
  it("keeps migration 010 immutable while a reconstructed v9 workspace upgrades through later migrations", () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-opportunity-research-migration-"));
    const databasePath = path.join(root, "workspace.sqlite");
    try {
      createOrOpenWorkspace(root);
      const database = new DatabaseSync(databasePath);
      try {
        expect(
          database.prepare("SELECT sha256 FROM schema_migrations WHERE version = 4").get(),
        ).toEqual({ sha256: candidatureMigration004Sha256 });
        expect(
          database.prepare("SELECT version, name FROM schema_migrations WHERE version = 10").get(),
        ).toEqual({ version: 10, name: "opportunity-research-access" });

        for (const column of [
          "career_direction_external_ai_visible",
          "objectives_external_ai_visible",
          "constraints_external_ai_visible",
          "target_roles_external_ai_visible",
          "target_markets_locations_external_ai_visible",
          "work_preferences_external_ai_visible",
          "application_writing_preferences_external_ai_visible",
        ]) {
          database.exec(`ALTER TABLE career_context DROP COLUMN ${column};`);
        }
        database.prepare("DELETE FROM schema_migrations WHERE version = 13").run();
        database.exec("ALTER TABLE profile_items DROP COLUMN ai_context_mode;");
        database.prepare("DELETE FROM schema_migrations WHERE version = 12").run();

        database.exec("DROP TABLE application_artifacts;");
        database.exec(`
          CREATE TABLE application_artifacts (
            id TEXT PRIMARY KEY,
            candidature_id TEXT NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
            document_id TEXT NOT NULL,
            kind TEXT NOT NULL CHECK (kind IN ('cv', 'cover_letter')),
            title TEXT NOT NULL CHECK (length(trim(title)) > 0),
            captured_at TEXT NOT NULL
          ) STRICT;
          CREATE INDEX application_artifacts_candidature_idx
            ON application_artifacts(candidature_id, captured_at);
        `);
        database.prepare("DELETE FROM schema_migrations WHERE version = 11").run();

        database.exec("DROP TRIGGER candidatures_opportunity_research_active_insert;");
        database.exec("DROP TRIGGER candidatures_opportunity_research_active_update;");
        database.exec("DROP INDEX candidatures_one_opportunity_research_selected;");
        database.exec("ALTER TABLE candidatures DROP COLUMN opportunity_research_selected;");
        database.prepare("DELETE FROM schema_migrations WHERE version = 10").run();
      } finally {
        database.close();
      }

      expect(openWorkspace(root)).toEqual({ rootPath: root });
      const upgraded = new DatabaseSync(databasePath, { readOnly: true });
      try {
        expect(
          upgraded.prepare("SELECT version, name FROM schema_migrations WHERE version = 10").get(),
        ).toEqual({ version: 10, name: "opportunity-research-access" });
        expect(
          upgraded.prepare("SELECT version, name FROM schema_migrations WHERE version = 11").get(),
        ).toEqual({ version: 11, name: "combined-application-artifacts" });
        expect(
          upgraded.prepare("SELECT version, name FROM schema_migrations WHERE version = 12").get(),
        ).toEqual({ version: 12, name: "profile-ai-context" });
        expect(
          upgraded.prepare("SELECT version, name FROM schema_migrations WHERE version = 13").get(),
        ).toEqual({ version: 13, name: "career-context-ai-disclosure" });
        expect(
          upgraded
            .prepare("SELECT opportunity_research_selected AS selected FROM candidatures LIMIT 1")
            .all(),
        ).toEqual([]);
        expect(
          upgraded.prepare("SELECT sha256 FROM schema_migrations WHERE version = 4").get(),
        ).toEqual({ sha256: candidatureMigration004Sha256 });
        expect(
          upgraded
            .prepare(
              `SELECT career_direction_external_ai_visible AS careerDirection,
                      application_writing_preferences_external_ai_visible AS writing
                 FROM career_context WHERE id = 1`,
            )
            .get(),
        ).toEqual({ careerDirection: 1, writing: 1 });
      } finally {
        upgraded.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
