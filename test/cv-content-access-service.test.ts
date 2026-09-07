// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import {
  getCvContentAccess,
  selectedCvContentItems,
  updateCvContentAccess,
} from "../src/main/cv-content-access-service";
import { createDocument, removeDocument, updateDocument } from "../src/main/document-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-cv-content-access-"));
  createOrOpenWorkspace(root);
  roots.push(root);
  return root;
}

function createCv(root: string, title: string) {
  return createDocument(root, {
    kind: "cv",
    title,
    variantId: null,
    engine: "pdflatex",
    bodyParagraphs: [],
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("external CV content selection", () => {
  it("atomically keeps at most one selected CV and records activity for every changed document", () => {
    const root = workspace();
    const first = createCv(root, "First private title");
    const second = createCv(root, "Second private title");

    expect(getCvContentAccess(root, first.id)).toEqual({ documentId: first.id, allowed: false });
    expect(updateCvContentAccess(root, { documentId: first.id, allowed: true })).toEqual({
      documentId: first.id,
      allowed: true,
    });
    expect(updateCvContentAccess(root, { documentId: second.id, allowed: true })).toEqual({
      documentId: second.id,
      allowed: true,
    });
    expect(getCvContentAccess(root, first.id)).toEqual({ documentId: first.id, allowed: false });
    expect(getCvContentAccess(root, second.id)).toEqual({ documentId: second.id, allowed: true });

    const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
    try {
      expect(
        database
          .prepare(
            "SELECT action FROM document_activity WHERE document_id = ? AND action LIKE 'document.ai-content-access.%' ORDER BY id",
          )
          .all(first.id),
      ).toEqual([
        { action: "document.ai-content-access.allow" },
        { action: "document.ai-content-access.revoke" },
      ]);
      expect(
        database
          .prepare(
            "SELECT action FROM document_activity WHERE document_id = ? AND action LIKE 'document.ai-content-access.%' ORDER BY id",
          )
          .all(second.id),
      ).toEqual([{ action: "document.ai-content-access.allow" }]);
    } finally {
      database.close();
    }

    updateDocument(root, {
      id: second.id,
      title: "Edited private title",
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    expect(getCvContentAccess(root, second.id).allowed).toBe(true);

    expect(updateCvContentAccess(root, { documentId: second.id, allowed: false })).toEqual({
      documentId: second.id,
      allowed: false,
    });
    expect(selectedCvContentItems(root)).toBeNull();
  });

  it("rejects cover letters and deletion naturally clears the selected CV", () => {
    const root = workspace();
    const cover = createDocument(root, {
      kind: "cover_letter",
      title: "Private letter",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: ["Private letter content"],
    });
    expect(() => getCvContentAccess(root, cover.id)).toThrow(
      "External CV content access applies only to CV documents.",
    );
    expect(() => updateCvContentAccess(root, { documentId: cover.id, allowed: true })).toThrow(
      "External CV content access applies only to CV documents.",
    );

    const cv = createCv(root, "Selected CV");
    updateCvContentAccess(root, { documentId: cv.id, allowed: true });
    removeDocument(root, cv.id);
    expect(selectedCvContentItems(root)).toBeNull();
  });

  it("enforces CV-only and single-selection invariants in SQLite", () => {
    const root = workspace();
    const first = createCv(root, "First CV");
    const second = createCv(root, "Second CV");
    const cover = createDocument(root, {
      kind: "cover_letter",
      title: "Cover letter",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    const database = new DatabaseSync(path.join(root, "workspace.sqlite"));
    try {
      expect(() =>
        database.prepare("UPDATE documents SET ai_content_visible = 1 WHERE id = ?").run(cover.id),
      ).toThrow();
      database.prepare("UPDATE documents SET ai_content_visible = 1 WHERE id = ?").run(first.id);
      expect(() =>
        database.prepare("UPDATE documents SET ai_content_visible = 1 WHERE id = ?").run(second.id),
      ).toThrow();
    } finally {
      database.close();
    }
  });
});
