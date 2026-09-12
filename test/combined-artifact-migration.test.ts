// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { createCandidature } from "../src/main/candidature-service";
import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";

const legacyArtifactId = "00000000-0000-4000-8000-000000000991";
const legacyDocumentId = "00000000-0000-4000-8000-000000000992";

describe("combined application artifact migration", () => {
  it("keeps migration 011 immutable while a reconstructed v10 workspace upgrades through later migrations", () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-combined-artifact-migration-"));
    const databasePath = path.join(root, "workspace.sqlite");
    try {
      createOrOpenWorkspace(root);
      const candidature = createCandidature(root, { values: [] });
      const database = new DatabaseSync(databasePath);
      try {
        expect(
          database.prepare("SELECT version, name FROM schema_migrations WHERE version = 10").get(),
        ).toEqual({ version: 10, name: "opportunity-research-access" });
        expect(
          database.prepare("SELECT version, name FROM schema_migrations WHERE version = 11").get(),
        ).toEqual({ version: 11, name: "combined-application-artifacts" });

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
        database
          .prepare(
            `INSERT INTO application_artifacts(
               id, candidature_id, document_id, kind, title, captured_at
             ) VALUES (?, ?, ?, 'cv', 'Legacy CV', '2026-09-10T12:00:00.000Z')`,
          )
          .run(legacyArtifactId, candidature.id, legacyDocumentId);
        database.prepare("DELETE FROM schema_migrations WHERE version = 11").run();
      } finally {
        database.close();
      }

      expect(openWorkspace(root)).toEqual({ rootPath: root });
      const upgraded = new DatabaseSync(databasePath, { readOnly: true });
      try {
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
            .prepare(
              `SELECT cv_document_id AS cvDocumentId,
                      cover_letter_document_id AS coverLetterDocumentId,
                      kind, title
                 FROM application_artifacts
                WHERE id = ?`,
            )
            .get(legacyArtifactId),
        ).toEqual({
          cvDocumentId: legacyDocumentId,
          coverLetterDocumentId: null,
          kind: "cv",
          title: "Legacy CV",
        });
        expect(
          upgraded.prepare("SELECT version, name FROM schema_migrations WHERE version = 10").get(),
        ).toEqual({ version: 10, name: "opportunity-research-access" });
        expect(
          upgraded.prepare("SELECT ai_context_mode AS aiContextMode FROM profile_items LIMIT 1").all(),
        ).toEqual([]);
        expect(
          upgraded
            .prepare(
              `SELECT career_direction_external_ai_visible AS careerDirection,
                      constraints_external_ai_visible AS constraints
                 FROM career_context WHERE id = 1`,
            )
            .get(),
        ).toEqual({ careerDirection: 1, constraints: 1 });
      } finally {
        upgraded.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
