// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDocument, removeDocument } from "../src/main/document-service";
import { createProfileVariant } from "../src/main/profile-service";
import { createTag, listTags, updateTag } from "../src/main/tag-service";
import { createOrOpenWorkspace, withWorkspaceDatabase } from "../src/main/workspace";

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-activity-"));
  createOrOpenWorkspace(root);
  return root;
}

function variantId(root: string): string {
  const profile = createProfileVariant(root, {
    name: "Activity test",
    focus: "",
    targetTags: [],
    preferredLanguage: "en",
  });
  const variant = profile.variants[0];
  if (!variant) throw new Error("Expected profile variant");
  return variant.id;
}

describe("meaningful durable activity", () => {
  it("keeps document removal activity after the document is deleted", () => {
    const root = workspace();
    try {
      const document = createDocument(root, {
        kind: "cv",
        title: "Removal activity CV",
        variantId: variantId(root),
        engine: "pdflatex",
        bodyParagraphs: [],
      });

      removeDocument(root, document.id);

      const evidence = withWorkspaceDatabase(root, (database) => ({
        document: database.prepare("SELECT id FROM documents WHERE id = ?").get(document.id),
        actions: database
          .prepare(
            "SELECT action FROM document_activity WHERE document_id = ? ORDER BY id",
          )
          .all(document.id),
      }));
      expect(evidence.document).toBeUndefined();
      expect(evidence.actions).toContainEqual({ action: "document.remove" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("records Tag creation and update activity", () => {
    const root = workspace();
    try {
      const created = createTag(root, {
        name: "TypeScript",
        definition: "Typed JavaScript",
        aliases: ["TS"],
      });
      updateTag(root, {
        id: created.id,
        name: "TypeScript",
        definition: "Typed superset of JavaScript",
        aliases: ["TS", "Type Script"],
      });

      const actions = withWorkspaceDatabase(root, (database) =>
        database
          .prepare(
            "SELECT action FROM tag_activity WHERE tag_id = ? ORDER BY id",
          )
          .all(created.id),
      );
      expect(actions).toEqual([
        { action: "tag.created" },
        { action: "tag.updated" },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rolls back a Tag mutation when its activity cannot be recorded", () => {
    const root = workspace();
    try {
      withWorkspaceDatabase(root, (database) => {
        database.exec(`
          CREATE TRIGGER reject_tag_activity
          BEFORE INSERT ON tag_activity
          BEGIN
            SELECT RAISE(ABORT, 'blocked tag activity');
          END;
        `);
      });

      expect(() =>
        createTag(root, {
          name: "PostgreSQL",
          definition: "Relational database",
          aliases: ["Postgres"],
        }),
      ).toThrow("blocked tag activity");
      expect(listTags(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
