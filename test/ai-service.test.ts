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
  reviewOpportunity,
  tailorCv,
} from "../src/main/ai-service";
import { createCandidature } from "../src/main/candidature-service";
import {
  createCoverLetter,
  createWorkingCv,
} from "../src/main/document-domain-service";
import { updateProfileItemAiContextPreference } from "../src/main/profile-ai-context-service";
import { addProfileItem } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";
import type { AiOperation } from "../src/shared/ai-connection-contracts";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-ai-service-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function provider(overrides: Partial<ModelProvider> = {}): ModelProvider {
  return {
    reviewOpportunity: vi.fn<ModelProvider["reviewOpportunity"]>(async () => ({
      summary: "Synthetic validation result",
      relevantEvidence: [],
      uncertainties: [],
      questions: [],
    })),
    extractJob: vi.fn<ModelProvider["extractJob"]>(async () => ({ proposals: [] })),
    tailorCv: vi.fn<ModelProvider["tailorCv"]>(async () => ({ recommendations: [] })),
    draftCoverLetter: vi.fn<ModelProvider["draftCoverLetter"]>(async () => ({
      recipient: "",
      subject: "Validation",
      bodyParagraphs: ["Synthetic validation result."],
      closing: "",
    })),
    ...overrides,
  };
}

async function configure(root: string, operation: AiOperation): Promise<void> {
  const connection = saveNamedAiConnection(root, {
    name: "Local model",
    endpoint: "http://localhost:11434/v1",
    model: "fixture-model",
  })[0];
  if (!connection) throw new Error("connection fixture missing");
  await validateAiConnectionOperation(
    root,
    { connectionId: connection.id, operation },
    provider(),
  );
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("AI service", () => {
  it("projects only reusable information whose AI-visibility eye is enabled", async () => {
    const root = workspace();
    const candidature = createCandidature(root, { values: [] });
    const visible = addProfileItem(root, {
      kind: "experience",
      title: "Platform Engineer",
      description: "Operated production systems.",
    });
    const hidden = addProfileItem(root, {
      kind: "skill",
      title: "Private skill",
      description: "Must remain local.",
    });
    updateProfileItemAiContextPreference(root, { itemId: visible.id, aiUseAllowed: true });
    updateProfileItemAiContextPreference(root, { itemId: hidden.id, aiUseAllowed: false });
    await configure(root, "opportunity_review");

    const review = vi.fn<ModelProvider["reviewOpportunity"]>(async (_connection, context) => {
      expect(context.profileItems).toEqual([
        expect.objectContaining({ title: "Platform Engineer" }),
      ]);
      expect(JSON.stringify(context)).not.toContain("Private skill");
      return {
        summary: "Relevant experience supplied.",
        relevantEvidence: ["Platform Engineer"],
        uncertainties: [],
        questions: [],
      };
    });

    await expect(
      reviewOpportunity(root, { candidatureId: candidature.id }, provider({ reviewOpportunity: review })),
    ).resolves.toMatchObject({ summary: "Relevant experience supplied." });
  });

  it("tailors a Working CV using local composition item refs without mutating My information", async () => {
    const root = workspace();
    const candidature = createCandidature(root, { values: [] });
    const profileItem = addProfileItem(root, {
      kind: "experience",
      title: "Platform Engineer",
      description: "Operated production systems.",
    });
    updateProfileItemAiContextPreference(root, { itemId: profileItem.id, aiUseAllowed: true });
    const working = createWorkingCv(root, {
      title: "Application CV",
      candidatureId: candidature.id,
      source: { kind: "profile" },
    });
    const workingItem = working.sections.flatMap((section) => section.items)[0];
    if (!workingItem) throw new Error("working CV fixture missing");
    await configure(root, "cv_tailoring");

    const tailoring = vi.fn<ModelProvider["tailorCv"]>(async (_connection, context) => {
      expect(context.candidature.label).toBe(candidature.label);
      expect(context.items).toEqual([
        expect.objectContaining({ title: "Platform Engineer" }),
      ]);
      return {
        recommendations: [
          { itemRef: context.items[0]?.itemRef ?? "", rationale: "Directly relevant experience." },
        ],
      };
    });

    await expect(
      tailorCv(
        root,
        { candidatureId: candidature.id, workingCvId: working.id },
        provider({ tailorCv: tailoring }),
      ),
    ).resolves.toEqual({
      recommendations: [{ itemId: workingItem.id, rationale: "Directly relevant experience." }],
    });
  });

  it("drafts against the cover letter's owned application and reusable career evidence", async () => {
    const root = workspace();
    const candidature = createCandidature(root, { values: [] });
    const profileItem = addProfileItem(root, {
      kind: "experience",
      title: "Reliability Engineer",
      description: "Owned incident response and production reliability.",
    });
    updateProfileItemAiContextPreference(root, { itemId: profileItem.id, aiUseAllowed: true });
    const letter = createCoverLetter(root, {
      candidatureId: candidature.id,
      title: "Application letter",
      bodyParagraphs: [],
    });
    await configure(root, "cover_letter_draft");

    const draft = vi.fn<ModelProvider["draftCoverLetter"]>(async (_connection, context) => {
      expect(context.candidature.label).toBe(candidature.label);
      expect(context.items).toEqual([
        expect.objectContaining({ title: "Reliability Engineer" }),
      ]);
      return {
        recipient: "",
        subject: "Application",
        bodyParagraphs: ["I am applying with relevant reliability experience."],
        closing: "",
      };
    });

    await expect(
      draftCoverLetter(root, { coverLetterId: letter.id }, provider({ draftCoverLetter: draft })),
    ).resolves.toMatchObject({
      subject: "Application",
      bodyParagraphs: ["I am applying with relevant reliability experience."],
    });
  });
});
