// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  saveNamedAiConnection,
  validateAiConnectionOperation,
} from "../src/main/ai-connection-service";
import type { ModelProvider } from "../src/main/ai-provider";
import {
  draftCoverLetter,
  previewOpportunityReview,
  reviewOpportunity,
  tailorCv,
} from "../src/main/ai-service";
import { createCandidature } from "../src/main/candidature-service";
import { createDocument } from "../src/main/document-service";
import { updateProfileItemAiContextPreference } from "../src/main/profile-ai-context-service";
import { addProfileItem } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";
import type { AiOperation } from "../src/shared/ai-connection-contracts";

const roots: string[] = [];

function provider(overrides: Partial<ModelProvider>): ModelProvider {
  return {
    reviewOpportunity: vi.fn<ModelProvider["reviewOpportunity"]>(),
    extractJob: vi.fn<ModelProvider["extractJob"]>(),
    recommendVariant: vi.fn<ModelProvider["recommendVariant"]>(),
    tailorCv: vi.fn<ModelProvider["tailorCv"]>(),
    draftCoverLetter: vi.fn<ModelProvider["draftCoverLetter"]>(),
    ...overrides,
  };
}

function validationProvider(): ModelProvider {
  return provider({
    reviewOpportunity: vi.fn<ModelProvider["reviewOpportunity"]>(async () => ({
      summary: "Synthetic validation result",
      relevantEvidence: [],
      uncertainties: [],
      questions: [],
    })),
    tailorCv: vi.fn<ModelProvider["tailorCv"]>(async () => ({
      recommendations: [
        { itemRef: "aaaat_validation_item", rationale: "Synthetic validation result" },
      ],
    })),
    draftCoverLetter: vi.fn<ModelProvider["draftCoverLetter"]>(async () => ({
      recipient: "",
      subject: "Validation",
      bodyParagraphs: ["Synthetic validation result."],
      closing: "",
    })),
  });
}

async function configuredWorkspace(...operations: readonly AiOperation[]): Promise<string> {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-profile-ai-context-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  const connection = saveNamedAiConnection(root, {
    name: "Local model",
    endpoint: "http://localhost:11434/v1",
    model: "local-model",
  })[0];
  if (!connection) throw new Error("connection fixture missing");
  for (const operation of operations) {
    await validateAiConnectionOperation(
      root,
      { connectionId: connection.id, operation },
      validationProvider(),
    );
  }
  return root;
}

function addItem(
  root: string,
  input: Parameters<typeof addProfileItem>[1],
) {
  const snapshot = addProfileItem(root, input);
  const item = snapshot.items.find(
    (candidate) => candidate.kind === input.kind && candidate.title === input.title,
  );
  if (!item) throw new Error("profile item fixture missing");
  return item;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("professional information AI disclosure projection", () => {
  it("lets persisted privacy strengthen but never weaken opportunity-review disclosure", async () => {
    const root = await configuredWorkspace("opportunity_review");
    const identity = addItem(root, { kind: "identity", title: "PRIVATE IDENTITY" });
    const experience = addItem(root, {
      kind: "experience",
      title: "PRIVATE EXPERIENCE",
      description: "PRIVATE EXPERIENCE DETAIL",
    });
    addItem(root, { kind: "skill", title: "Public TypeScript" });
    const candidature = createCandidature(root, { values: [] });

    updateProfileItemAiContextPreference(root, {
      itemId: identity.id,
      aiContextMode: "omit",
    });
    updateProfileItemAiContextPreference(root, {
      itemId: experience.id,
      aiContextMode: "token",
    });

    const preview = previewOpportunityReview(root, {
      candidatureId: candidature.id,
      identityPrivacy: "expose",
      contactPrivacy: "expose",
    });
    const previewJson = JSON.stringify(preview.projectedContext);
    expect(previewJson).not.toContain("PRIVATE IDENTITY");
    expect(previewJson).not.toContain("PRIVATE EXPERIENCE");
    expect(previewJson).not.toContain("PRIVATE EXPERIENCE DETAIL");
    expect(previewJson).toContain("Public TypeScript");
    const projectedExperience = preview.projectedContext.profileItems.find(
      (item) => item.kind === "experience",
    );
    expect(projectedExperience).toBeDefined();
    expect(projectedExperience?.title).not.toBe("PRIVATE EXPERIENCE");

    const review = vi.fn<ModelProvider["reviewOpportunity"]>(async (_connection, context) => {
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain("PRIVATE IDENTITY");
      expect(serialized).not.toContain("PRIVATE EXPERIENCE");
      expect(serialized).not.toContain("PRIVATE EXPERIENCE DETAIL");
      expect(serialized).toContain("Public TypeScript");
      const tokenized = context.profileItems.find((item) => item.kind === "experience");
      return {
        summary: "Relevant evidence found.",
        relevantEvidence: [tokenized?.title ?? ""],
        uncertainties: [],
        questions: [],
      };
    });

    await expect(
      reviewOpportunity(
        root,
        {
          candidatureId: candidature.id,
          identityPrivacy: "expose",
          contactPrivacy: "expose",
        },
        provider({ reviewOpportunity: review }),
      ),
    ).resolves.toMatchObject({
      relevantEvidence: ["PRIVATE EXPERIENCE"],
    });
  });

  it("omits and tokenizes professional evidence before CV-tailoring provider context", async () => {
    const root = await configuredWorkspace("cv_tailoring");
    const experience = addItem(root, {
      kind: "experience",
      title: "OMITTED EXPERIENCE",
      description: "OMITTED DETAIL",
    });
    const skill = addItem(root, { kind: "skill", title: "TOKENIZED TYPESCRIPT" });
    const candidature = createCandidature(root, { values: [] });
    const cv = createDocument(root, {
      kind: "cv",
      title: "Private CV",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });

    updateProfileItemAiContextPreference(root, {
      itemId: experience.id,
      aiContextMode: "omit",
    });
    updateProfileItemAiContextPreference(root, {
      itemId: skill.id,
      aiContextMode: "token",
    });

    const tailor = vi.fn<ModelProvider["tailorCv"]>(async (_connection, context) => {
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain("OMITTED EXPERIENCE");
      expect(serialized).not.toContain("OMITTED DETAIL");
      expect(serialized).not.toContain("TOKENIZED TYPESCRIPT");
      expect(context.items).toHaveLength(1);
      const item = context.items[0];
      if (!item) throw new Error("projected CV item missing");
      return {
        recommendations: [{ itemRef: item.itemRef, rationale: item.title }],
      };
    });

    await expect(
      tailorCv(
        root,
        { candidatureId: candidature.id, documentId: cv.id },
        provider({ tailorCv: tailor }),
      ),
    ).resolves.toEqual({
      recommendations: [{ itemId: skill.id, rationale: "TOKENIZED TYPESCRIPT" }],
    });
  });

  it("omits and tokenizes professional evidence before cover-letter provider context", async () => {
    const root = await configuredWorkspace("cover_letter_draft");
    const experience = addItem(root, {
      kind: "experience",
      title: "TOKENIZED PLATFORM EXPERIENCE",
      description: "TOKENIZED PLATFORM DETAIL",
    });
    const skill = addItem(root, { kind: "skill", title: "OMITTED PRIVATE SKILL" });
    const candidature = createCandidature(root, { values: [] });
    const cover = createDocument(root, {
      kind: "cover_letter",
      title: "Private cover letter",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });

    updateProfileItemAiContextPreference(root, {
      itemId: experience.id,
      aiContextMode: "token",
    });
    updateProfileItemAiContextPreference(root, {
      itemId: skill.id,
      aiContextMode: "omit",
    });

    const draft = vi.fn<ModelProvider["draftCoverLetter"]>(async (_connection, context) => {
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain("TOKENIZED PLATFORM EXPERIENCE");
      expect(serialized).not.toContain("TOKENIZED PLATFORM DETAIL");
      expect(serialized).not.toContain("OMITTED PRIVATE SKILL");
      expect(context.items).toHaveLength(1);
      const item = context.items[0];
      if (!item) throw new Error("projected cover-letter item missing");
      return {
        recipient: "Hiring team",
        subject: "Application",
        bodyParagraphs: [item.title],
        closing: "Regards",
      };
    });

    await expect(
      draftCoverLetter(
        root,
        { candidatureId: candidature.id, documentId: cover.id },
        provider({ draftCoverLetter: draft }),
      ),
    ).resolves.toMatchObject({
      bodyParagraphs: ["TOKENIZED PLATFORM EXPERIENCE"],
    });
  });
});
