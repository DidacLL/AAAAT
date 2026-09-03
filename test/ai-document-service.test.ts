// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { ModelProvider } from "../src/main/ai-provider";
import { draftCoverLetter, saveAiConnection, tailorCv } from "../src/main/ai-service";
import { createCandidature } from "../src/main/candidature-service";
import { createDocument } from "../src/main/document-service";
import { addProfileItem, createProfileVariant } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function provider(overrides: Partial<ModelProvider>): ModelProvider {
  return {
    assessFit: vi.fn<ModelProvider["assessFit"]>(),
    extractJob: vi.fn<ModelProvider["extractJob"]>(),
    recommendVariant: vi.fn<ModelProvider["recommendVariant"]>(),
    tailorCv: vi.fn<ModelProvider["tailorCv"]>(),
    draftCoverLetter: vi.fn<ModelProvider["draftCoverLetter"]>(),
    ...overrides,
  };
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-ai-docs-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  saveAiConnection(root, {
    name: "Local model",
    endpoint: "http://localhost:11434/v1",
    model: "local-model",
  });
  addProfileItem(root, { kind: "identity", title: "Private Person" });
  addProfileItem(root, { kind: "contact", title: "private@example.test" });
  addProfileItem(root, {
    kind: "experience",
    title: "Platform Engineer",
    description: "Built reliable TypeScript services.",
  });
  const snapshot = addProfileItem(root, { kind: "skill", title: "TypeScript" });
  const skill = snapshot.items.find((item) => item.kind === "skill");
  if (!skill) throw new Error("skill fixture missing");
  const variant = createProfileVariant(root, {
    name: "Platform",
    focus: "Platform engineering",
    targetTags: ["platform"],
    preferredLanguage: "en",
  }).variants[0];
  if (!variant) throw new Error("variant fixture missing");
  const candidature = createCandidature(root, {
    company: "Example Corp",
    role: "Platform Engineer",
    location: "Madrid",
    workMode: "hybrid",
    salaryText: "",
    source: "Careers",
    sourceUrl: "https://example.test/job",
    sourceText: "Build reliable TypeScript platform services.",
    status: "saved",
    applicationDate: "",
    nextAction: "",
    nextActionDate: "",
    notes: "Private local note not for inference.",
  });
  const cv = createDocument(root, {
    kind: "cv",
    title: "Platform CV",
    variantId: variant.id,
    engine: "pdflatex",
    bodyParagraphs: [],
  });
  const cover = createDocument(root, {
    kind: "cover_letter",
    title: "Platform cover letter",
    variantId: variant.id,
    engine: "pdflatex",
    bodyParagraphs: [],
  });
  return { root, candidature, cv, cover, skill };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("M3 document AI services", () => {
  it("tailors a CV from existing non-sensitive career items only", async () => {
    const { root, candidature, cv, skill } = fixture();
    const tailor = vi.fn<ModelProvider["tailorCv"]>(async (_connection, context) => {
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain("Private Person");
      expect(serialized).not.toContain("private@example.test");
      expect(serialized).not.toContain("Private local note");
      expect(serialized).toContain("TypeScript");
      return {
        recommendations: [{ itemId: skill.id, rationale: "Directly matches the role." }],
      };
    });

    await expect(
      tailorCv(
        root,
        { candidatureId: candidature.id, documentId: cv.id },
        provider({ tailorCv: tailor }),
      ),
    ).resolves.toEqual({
      recommendations: [{ itemId: skill.id, rationale: "Directly matches the role." }],
    });
  });

  it("rejects invented CV item IDs", async () => {
    const { root, candidature, cv } = fixture();
    const tailor = vi.fn<ModelProvider["tailorCv"]>(async () => ({
      recommendations: [
        {
          itemId: "00000000-0000-4000-8000-000000000099",
          rationale: "Invented.",
        },
      ],
    }));

    await expect(
      tailorCv(
        root,
        { candidatureId: candidature.id, documentId: cv.id },
        provider({ tailorCv: tailor }),
      ),
    ).rejects.toThrow("profile item that no longer exists");
  });

  it("drafts a cover letter from non-sensitive resolved evidence without mutating", async () => {
    const { root, candidature, cover } = fixture();
    const draft = vi.fn<ModelProvider["draftCoverLetter"]>(async (_connection, context) => {
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain("Private Person");
      expect(serialized).not.toContain("private@example.test");
      expect(serialized).toContain("Platform Engineer");
      return {
        recipient: "Hiring team",
        subject: "Platform Engineer application",
        bodyParagraphs: ["I am interested in the role.", "My TypeScript experience is relevant."],
        closing: "Regards",
      };
    });

    await expect(
      draftCoverLetter(
        root,
        { candidatureId: candidature.id, documentId: cover.id },
        provider({ draftCoverLetter: draft }),
      ),
    ).resolves.toMatchObject({ subject: "Platform Engineer application" });
  });
});
