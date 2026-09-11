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
  it("appends migration 011 and upgrades a legacy single-document artifact without rewriting v10", () => {
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
      } finally {
        upgraded.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
