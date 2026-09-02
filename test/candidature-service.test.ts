// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createCandidature,
  listCandidatures,
  setCandidatureDocuments,
  updateCandidature,
} from "../src/main/candidature-service";
import { createDocument, removeDocument } from "../src/main/document-service";
import { createProfileVariant } from "../src/main/profile-service";
import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";

function temporaryWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-candidature-"));
  createOrOpenWorkspace(root);
  return root;
}

const partialInput = {
  company: "",
  role: "Backend engineer",
  location: "",
  workMode: "Hybrid",
  salaryText: "",
  source: "Recruiter message",
  sourceUrl: "",
  sourceText: "Raw opportunity text retained locally",
  status: "saved" as const,
  applicationDate: "",
  nextAction: "Reply to recruiter",
  nextActionDate: "2026-09-04",
  notes: "Need location details",
};

describe("manual candidature service", () => {
  it("persists partial records and keeps archive independent from lifecycle status", () => {
    const root = temporaryWorkspace();
    try {
      const created = createCandidature(root, partialInput);
      expect(created).toMatchObject({
        company: "",
        role: "Backend engineer",
        sourceText: "Raw opportunity text retained locally",
        status: "saved",
        archived: false,
        documentIds: [],
      });

      const archived = updateCandidature(root, {
        ...created,
        status: "applied",
        applicationDate: "2026-09-02",
        archived: true,
      });
      expect(archived.status).toBe("applied");
      expect(archived.archived).toBe(true);

      openWorkspace(root);
      expect(listCandidatures(root)).toEqual([archived]);

      const restored = updateCandidature(root, { ...archived, archived: false });
      expect(restored.status).toBe("applied");
      expect(restored.archived).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("associates only existing M1 documents and follows document deletion safely", () => {
    const root = temporaryWorkspace();
    try {
      const candidature = createCandidature(root, partialInput);
      const profile = createProfileVariant(root, {
        name: "General",
        focus: "",
        targetTags: [],
      });
      const variant = profile.variants[0];
      expect(variant).toBeDefined();
      if (!variant) return;

      const document = createDocument(root, {
        kind: "cv",
        title: "General CV",
        variantId: variant.id,
        engine: "pdflatex",
        bodyParagraphs: [],
      });
      const associated = setCandidatureDocuments(root, {
        candidatureId: candidature.id,
        documentIds: [document.id],
      });
      expect(associated.documentIds).toEqual([document.id]);

      expect(() =>
        setCandidatureDocuments(root, {
          candidatureId: candidature.id,
          documentIds: ["00000000-0000-4000-8000-000000009999"],
        }),
      ).toThrow("An associated document no longer exists.");
      expect(listCandidatures(root)[0]?.documentIds).toEqual([document.id]);

      removeDocument(root, document.id);
      expect(listCandidatures(root)[0]?.documentIds).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
