// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import {
  addCandidatureSource,
  createCandidature,
  getCandidatureWorkingBrief,
  listCandidatureSources,
  listCandidatures,
  removeCandidatureSource,
  setCandidatureDocuments,
  updateCandidature,
  updateCandidatureSource,
  updateCandidatureWorkingBrief,
} from "../src/main/candidature-service";
import { createDocument, removeDocument } from "../src/main/document-service";
import { createProfileVariant } from "../src/main/profile-service";
import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";
import type { CandidatureRecord, CandidatureUpdate } from "../src/shared/contracts";

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

function editable(
  record: CandidatureRecord,
  changes: Partial<CandidatureUpdate> = {},
): CandidatureUpdate {
  return {
    id: record.id,
    company: record.company,
    role: record.role,
    location: record.location,
    workMode: record.workMode,
    salaryText: record.salaryText,
    status: record.status,
    priority: record.priority,
    applicationDate: record.applicationDate,
    nextAction: record.nextAction,
    nextActionDate: record.nextActionDate,
    notes: record.notes,
    archived: record.archived,
    ...changes,
  };
}

describe("manual candidature service", () => {
  it("persists partial records, projects the create source, and keeps archive independent", () => {
    const root = temporaryWorkspace();
    try {
      const created = createCandidature(root, partialInput);
      expect(created).toMatchObject({
        company: "",
        role: "Backend engineer",
        source: "Recruiter message",
        sourceText: "Raw opportunity text retained locally",
        status: "saved",
        priority: "",
        archived: false,
        documentIds: [],
      });
      expect(listCandidatureSources(root, created.id)).toEqual([
        expect.objectContaining({
          candidatureId: created.id,
          kind: "other",
          title: "Recruiter message",
          sourceText: "Raw opportunity text retained locally",
        }),
      ]);

      const archived = updateCandidature(
        root,
        editable(created, {
          status: "applied",
          priority: "high",
          applicationDate: "2026-09-02",
          archived: true,
        }),
      );
      expect(archived.status).toBe("applied");
      expect(archived.priority).toBe("high");
      expect(archived.archived).toBe(true);

      openWorkspace(root);
      expect(listCandidatures(root)).toEqual([archived]);

      const restored = updateCandidature(
        root,
        editable(archived, { archived: false }),
      );
      expect(restored.status).toBe("applied");
      expect(restored.archived).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("mutates sources only through explicit source services and allows zero sources", () => {
    const root = temporaryWorkspace();
    try {
      const candidature = createCandidature(root, partialInput);
      const first = listCandidatureSources(root, candidature.id)[0];
      expect(first).toBeDefined();
      if (!first) return;

      expect(() =>
        updateCandidature(
          root,
          {
            ...editable(candidature),
            source: "This must not be accepted by ordinary update",
          } as unknown as CandidatureUpdate,
        ),
      ).toThrow();
      expect(listCandidatureSources(root, candidature.id)[0]?.title).toBe("Recruiter message");

      const withJobDescription = addCandidatureSource(root, {
        candidatureId: candidature.id,
        kind: "job_posting",
        title: "Job description",
        url: "https://example.invalid/job",
        sourceText: "Platform ownership and reliability responsibilities",
      });
      expect(withJobDescription).toHaveLength(2);
      const jobDescription = withJobDescription.find((source) => source.kind === "job_posting");
      expect(jobDescription).toBeDefined();
      if (!jobDescription) return;

      updateCandidatureSource(root, {
        id: jobDescription.id,
        candidatureId: candidature.id,
        kind: "job_posting",
        title: "Senior platform job description",
        url: jobDescription.url,
        sourceText: jobDescription.sourceText,
      });

      removeCandidatureSource(root, {
        candidatureId: candidature.id,
        sourceId: first.id,
      });
      expect(listCandidatures(root)[0]).toMatchObject({
        source: "Senior platform job description",
        sourceUrl: "https://example.invalid/job",
      });

      removeCandidatureSource(root, {
        candidatureId: candidature.id,
        sourceId: jobDescription.id,
      });
      expect(listCandidatureSources(root, candidature.id)).toEqual([]);
      expect(listCandidatures(root)[0]).toMatchObject({
        id: candidature.id,
        source: "",
        sourceUrl: "",
        sourceText: "",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps one current working brief, permits empty values, and records durable activity", () => {
    const root = temporaryWorkspace();
    try {
      const candidature = createCandidature(root, partialInput);
      expect(getCandidatureWorkingBrief(root, candidature.id)).toEqual({
        candidatureId: candidature.id,
        fitSuitability: "",
        strengthsEvidence: "",
        gapsRisksConstraints: "",
        currentStrategy: "",
        companyRoleContext: "",
        pitch: "",
        questions: "",
        recruiterPreparation: "",
      });

      const saved = updateCandidatureWorkingBrief(root, {
        candidatureId: candidature.id,
        fitSuitability: "Strong fit for platform ownership.",
        strengthsEvidence: "Backend systems and reliability work.",
        gapsRisksConstraints: "No relocation; clarify on-call expectations.",
        currentStrategy: "Validate scope before tailoring materials.",
        companyRoleContext: "Example Systems is building an internal platform.",
        pitch: "I build reliable backend platforms and improve developer workflows.",
        questions: "What does staff-level impact look like in the first six months?",
        recruiterPreparation: "Confirm Spain/EU remote or hybrid arrangement.",
      });

      openWorkspace(root);
      expect(getCandidatureWorkingBrief(root, candidature.id)).toEqual(saved);

      const database = new DatabaseSync(path.join(root, "workspace.sqlite"), { readOnly: true });
      try {
        expect(
          database
            .prepare(
              "SELECT action FROM candidature_activity WHERE candidature_id = ? ORDER BY id",
            )
            .all(candidature.id),
        ).toEqual([
          { action: "candidature.created" },
          { action: "candidature.working-brief-updated" },
        ]);
      } finally {
        database.close();
      }
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
