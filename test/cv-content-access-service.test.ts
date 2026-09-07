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
  updateCvRenderAccess,
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

describe("external CV content and render authority", () => {
  it("keeps render authority separate and revokes it when content selection changes", () => {
    const root = workspace();
    const first = createCv(root, "First private title");
    const second = createCv(root, "Second private title");

    expect(getCvContentAccess(root, first.id)).toEqual({
      documentId: first.id,
      allowed: false,
      renderAllowed: false,
    });
    expect(() => updateCvRenderAccess(root, { documentId: first.id, allowed: true })).toThrow(
      "Allow external CV content access before allowing external rendering.",
    );

    expect(updateCvContentAccess(root, { documentId: first.id, allowed: true })).toEqual({
      documentId: first.id,
      allowed: true,
      renderAllowed: false,
    });
    expect(updateCvRenderAccess(root, { documentId: first.id, allowed: true })).toEqual({
      documentId: first.id,
      allowed: true,
      renderAllowed: true,
    });

    updateDocument(root, {
      id: first.id,
      title: "Edited private title",
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    expect(getCvContentAccess(root, first.id).renderAllowed).toBe(true);

    expect(updateCvContentAccess(root, { documentId: second.id, allowed: true })).toEqual({
      documentId: second.id,
      allowed: true,
      renderAllowed: false,
    });
    expect(getCvContentAccess(root, first.id)).toEqual({
      documentId: first.id,
      allowed: false,
      renderAllowed: false,
    });

    const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
    try {
      expect(
        database
          .prepare(
            "SELECT action FROM document_activity WHERE document_id = ? AND action LIKE 'document.ai-%access.%' ORDER BY id",
          )
          .all(first.id),
      ).toEqual([
        { action: "document.ai-content-access.allow" },
        { action: "document.ai-render-access.allow" },
        { action: "document.ai-render-access.revoke" },
        { action: "document.ai-content-access.revoke" },
      ]);
    } finally {
      database.close();
    }

    expect(updateCvContentAccess(root, { documentId: second.id, allowed: false })).toEqual({
      documentId: second.id,
      allowed: false,
      renderAllowed: false,
    });
    expect(selectedCvContentItems(root)).toBeNull();
  });

  it("does not invent activity for repeated permission writes and rejects cover letters", () => {
    const root = workspace();
    const cv = createCv(root, "Selected CV");
    updateCvContentAccess(root, { documentId: cv.id, allowed: true });
    updateCvRenderAccess(root, { documentId: cv.id, allowed: true });
    updateCvRenderAccess(root, { documentId: cv.id, allowed: true });

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
    expect(() => updateCvRenderAccess(root, { documentId: cover.id, allowed: true })).toThrow(
      "External CV content access applies only to CV documents.",
    );

    const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
    try {
      expect(
        database
          .prepare(
            "SELECT COUNT(*) AS count FROM document_activity WHERE document_id = ? AND action = 'document.ai-render-access.allow'",
          )
          .get(cv.id),
      ).toEqual({ count: 1 });
    } finally {
      database.close();
    }

    removeDocument(root, cv.id);
    expect(selectedCvContentItems(root)).toBeNull();
  });

  it("enforces CV-only, single-selection and render-depends-on-content invariants in SQLite", () => {
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
      expect(() =>
        database.prepare("UPDATE documents SET ai_render_allowed = 1 WHERE id = ?").run(first.id),
      ).toThrow();
      database.prepare("UPDATE documents SET ai_content_visible = 1 WHERE id = ?").run(first.id);
      database.prepare("UPDATE documents SET ai_render_allowed = 1 WHERE id = ?").run(first.id);
      expect(() =>
        database.prepare("UPDATE documents SET ai_content_visible = 1 WHERE id = ?").run(second.id),
      ).toThrow();
    } finally {
      database.close();
    }
  });
});
