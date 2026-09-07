// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import {
  getCvDescriptor,
  listAiVisibleCvDescriptors,
  updateCvDescriptor,
} from "../src/main/cv-descriptor-service";
import { createDocument, updateDocument } from "../src/main/document-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-cv-description-"));
  createOrOpenWorkspace(root);
  roots.push(root);
  return root;
}

function createCv(root: string, title = "Private CV title") {
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

describe("AI-visible CV descriptors", () => {
  it("persists bounded CV-only descriptors through the ordinary activity path and preserves them across document edits", () => {
    const root = workspace();
    const cv = createCv(root);

    expect(getCvDescriptor(root, cv.id)).toEqual({ documentId: cv.id, tags: [], notes: null });

    expect(
      updateCvDescriptor(root, {
        documentId: cv.id,
        tags: ["platform", "leadership"],
        notes: "Strongest for staff-level platform roles.",
      }),
    ).toEqual({
      documentId: cv.id,
      tags: ["platform", "leadership"],
      notes: "Strongest for staff-level platform roles.",
    });

    updateDocument(root, {
      id: cv.id,
      title: "Later private title",
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    expect(getCvDescriptor(root, cv.id)).toEqual({
      documentId: cv.id,
      tags: ["platform", "leadership"],
      notes: "Strongest for staff-level platform roles.",
    });
    expect(listAiVisibleCvDescriptors(root)).toEqual([
      { tags: ["platform", "leadership"], notes: "Strongest for staff-level platform roles." },
    ]);

    const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
    try {
      expect(
        database
          .prepare("SELECT action FROM document_activity WHERE document_id = ? ORDER BY id")
          .all(cv.id),
      ).toContainEqual({ action: "document.ai-description.update" });
    } finally {
      database.close();
    }

    expect(updateCvDescriptor(root, { documentId: cv.id, tags: [], notes: null })).toEqual({
      documentId: cv.id,
      tags: [],
      notes: null,
    });
    expect(listAiVisibleCvDescriptors(root)).toEqual([]);
  });

  it("rejects cover letters and invalid descriptors", () => {
    const root = workspace();
    const coverLetter = createDocument(root, {
      kind: "cover_letter",
      title: "Private letter",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: ["Private letter content"],
    });

    expect(() => getCvDescriptor(root, coverLetter.id)).toThrow(
      "AI-visible CV descriptions apply only to CV documents.",
    );
    expect(() =>
      updateCvDescriptor(root, {
        documentId: coverLetter.id,
        tags: ["letter"],
        notes: "Should not persist.",
      }),
    ).toThrow("AI-visible CV descriptions apply only to CV documents.");

    const cv = createCv(root);
    expect(() =>
      updateCvDescriptor(root, {
        documentId: cv.id,
        tags: ["Platform", "platform"],
        notes: null,
      }),
    ).toThrow();
    expect(getCvDescriptor(root, cv.id)).toEqual({ documentId: cv.id, tags: [], notes: null });
  });

  it("fails closed when stored descriptor data is malformed", () => {
    const root = workspace();
    const cv = createCv(root);
    const database = new DatabaseSync(path.join(root, "workspace.sqlite"));
    try {
      database.prepare("UPDATE documents SET ai_tags_json = ? WHERE id = ?").run("not-json", cv.id);
    } finally {
      database.close();
    }

    expect(() => getCvDescriptor(root, cv.id)).toThrow("Stored AI-visible CV tags are invalid.");
    expect(() => listAiVisibleCvDescriptors(root)).toThrow("Stored AI-visible CV tags are invalid.");
  });
});
