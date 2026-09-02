// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createConcept, listConcepts, updateConcept } from "../src/main/concept-service";
import { createDocument, removeDocument } from "../src/main/document-service";
import { createProfileVariant } from "../src/main/profile-service";
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

  it("records concept creation and update activity", () => {
    const root = workspace();
    try {
      const created = createConcept(root, {
        name: "TypeScript",
        definition: "Typed JavaScript",
        aliases: ["TS"],
      });
      updateConcept(root, {
        id: created.id,
        name: "TypeScript",
        definition: "Typed superset of JavaScript",
        aliases: ["TS", "Type Script"],
      });

      const actions = withWorkspaceDatabase(root, (database) =>
        database
          .prepare(
            "SELECT action FROM concept_activity WHERE concept_id = ? ORDER BY id",
          )
          .all(created.id),
      );
      expect(actions).toEqual([
        { action: "concept.created" },
        { action: "concept.updated" },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rolls back a concept mutation when its activity cannot be recorded", () => {
    const root = workspace();
    try {
      withWorkspaceDatabase(root, (database) => {
        database.exec(`
          CREATE TRIGGER reject_concept_activity
          BEFORE INSERT ON concept_activity
          BEGIN
            SELECT RAISE(ABORT, 'blocked concept activity');
          END;
        `);
      });

      expect(() =>
        createConcept(root, {
          name: "PostgreSQL",
          definition: "Relational database",
          aliases: ["Postgres"],
        }),
      ).toThrow("blocked concept activity");
      expect(listConcepts(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
