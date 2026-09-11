// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { listCandidatureActivity } from "../src/main/candidature-activity-service";
import { createCandidature } from "../src/main/candidature-service";
import { createOrOpenWorkspace, withWorkspaceDatabase } from "../src/main/workspace";

function temporaryWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-candidature-activity-"));
  createOrOpenWorkspace(root);
  return root;
}

describe("candidature Activity", () => {
  it("reads only one candidature newest-first and does not expose raw action strings", () => {
    const root = temporaryWorkspace();
    try {
      const first = createCandidature(root, { values: [] });
      const second = createCandidature(root, { values: [] });

      withWorkspaceDatabase(root, (database) => {
        database.prepare("DELETE FROM candidature_activity").run();
        const insert = database.prepare(
          "INSERT INTO candidature_activity(occurred_at, candidature_id, action) VALUES (?, ?, ?)",
        );
        insert.run("2026-09-11T10:00:00.000Z", first.id, "candidature.created");
        insert.run("2026-09-11T11:00:00.000Z", first.id, "candidature.source-added");
        insert.run("2026-09-11T12:00:00.000Z", first.id, "internal.future-action.v99");
        insert.run("2026-09-11T13:00:00.000Z", second.id, "candidature.source-removed");
      });

      expect(listCandidatureActivity(root, first.id)).toEqual([
        { occurredAt: "2026-09-11T12:00:00.000Z", kind: "changed" },
        { occurredAt: "2026-09-11T11:00:00.000Z", kind: "source_added" },
        { occurredAt: "2026-09-11T10:00:00.000Z", kind: "created" },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid or missing candidature identities", () => {
    const root = temporaryWorkspace();
    try {
      expect(() => listCandidatureActivity(root, "not-a-uuid")).toThrow();
      expect(() =>
        listCandidatureActivity(root, "00000000-0000-4000-8000-000000000999"),
      ).toThrow("The candidature no longer exists.");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
