// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { ModelProvider } from "../src/main/ai-provider";
import { draftCoverLetter, saveAiConnection, tailorCv } from "../src/main/ai-service";
import { createCandidature } from "../src/main/candidature-service";
import { createDocument } from "../src/main/document-service";
import {
  addProfileItem,
  createProfileVariant,
  removeProfileItem,
} from "../src/main/profile-service";
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
    source: {
      kind: "job_posting",
      title: "Vacancy",
      url: "https://example.invalid/job",
      sourceText: "Build reliable TypeScript platform services.",
    },
    values: [],
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
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("document AI services", () => {
  it("tailors a CV from resolved non-sensitive career evidence", async () => {
    const { root, candidature, cv, skill } = fixture();
    const tailor = vi.fn<ModelProvider["tailorCv"]>(async (_connection, context) => {
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain("Private Person");
      expect(serialized).not.toContain("private@example.test");
      expect(serialized).toContain("TypeScript");
      return {
        recommendations: [{ itemId: skill.id, rationale: "Direct evidence match." }],
      };
    });

    await expect(
      tailorCv(
        root,
        { candidatureId: candidature.id, documentId: cv.id },
        provider({ tailorCv: tailor }),
      ),
    ).resolves.toEqual({
      recommendations: [{ itemId: skill.id, rationale: "Direct evidence match." }],
    });
  });

  it("rejects a CV recommendation whose evidence item no longer exists", async () => {
    const { root, candidature, cv, skill } = fixture();
    let resolveTailoring:
      | ((value: { recommendations: Array<{ itemId: string; rationale: string }> }) => void)
      | undefined;
    const tailor = vi.fn<ModelProvider["tailorCv"]>(
      () =>
        new Promise((resolve) => {
          resolveTailoring = resolve;
        }),
    );
    const pending = tailorCv(
      root,
      { candidatureId: candidature.id, documentId: cv.id },
      provider({ tailorCv: tailor }),
    );
    removeProfileItem(root, skill.id);
    if (!resolveTailoring) throw new Error("provider fixture did not start");
    resolveTailoring({
      recommendations: [{ itemId: skill.id, rationale: "Previously valid." }],
    });
    await expect(pending).rejects.toThrow("profile item that no longer exists");
  });

  it("drafts a cover letter without mutating candidature or document state", async () => {
    const { root, candidature, cover } = fixture();
    const draft = vi.fn<ModelProvider["draftCoverLetter"]>(async (_connection, context) => {
      expect(JSON.stringify(context)).toContain("Platform Engineer");
      return {
        recipient: "Hiring team",
        subject: "Application",
        bodyParagraphs: ["My TypeScript experience is relevant."],
        closing: "Regards",
      };
    });

    await expect(
      draftCoverLetter(
        root,
        { candidatureId: candidature.id, documentId: cover.id },
        provider({ draftCoverLetter: draft }),
      ),
    ).resolves.toMatchObject({ subject: "Application" });
  });
});
