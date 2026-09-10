// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  removeAiConnection,
  saveNamedAiConnection,
  setAiOperationDefault,
  setDefaultAiConnection,
  validateAiConnectionOperation,
} from "../src/main/ai-connection-service";
import type { ModelProvider } from "../src/main/ai-provider";
import { reviewOpportunity } from "../src/main/ai-service";
import { createCandidature } from "../src/main/candidature-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-ai-routing-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function provider(): ModelProvider {
  return {
    reviewOpportunity: vi.fn<ModelProvider["reviewOpportunity"]>(async (connection) => ({
      summary: connection.name,
      relevantEvidence: [],
      uncertainties: [],
      questions: [],
    })),
    extractJob: vi.fn<ModelProvider["extractJob"]>(),
    recommendVariant: vi.fn<ModelProvider["recommendVariant"]>(),
    tailorCv: vi.fn<ModelProvider["tailorCv"]>(),
    draftCoverLetter: vi.fn<ModelProvider["draftCoverLetter"]>(),
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("AI operation connection routing", () => {
  it("uses an operation default before the validated general default and never falls back arbitrarily", async () => {
    const root = workspace();
    const candidature = createCandidature(root, { values: [] });
    const firstSave = saveNamedAiConnection(root, {
      name: "First local",
      endpoint: "http://localhost:11434/v1",
      model: "first-model",
    });
    const first = firstSave[0];
    if (!first) throw new Error("first connection fixture missing");
    const secondSave = saveNamedAiConnection(root, {
      name: "Second local",
      endpoint: "http://127.0.0.1:1234/v1",
      model: "second-model",
    });
    const second = secondSave.find((connection) => connection.name === "Second local");
    if (!second) throw new Error("second connection fixture missing");
    const modelProvider = provider();
    const request = {
      candidatureId: candidature.id,
      identityPrivacy: "omit" as const,
      contactPrivacy: "omit" as const,
    };

    await expect(reviewOpportunity(root, request, modelProvider)).rejects.toThrow(
      "Validate and choose a connection for Opportunity review",
    );

    await validateAiConnectionOperation(
      root,
      { connectionId: first.id, operation: "opportunity_review" },
      modelProvider,
    );
    setDefaultAiConnection(root, second.id);
    await expect(reviewOpportunity(root, request, modelProvider)).resolves.toMatchObject({
      summary: "First local",
    });

    await validateAiConnectionOperation(
      root,
      { connectionId: second.id, operation: "opportunity_review" },
      modelProvider,
    );
    await expect(reviewOpportunity(root, request, modelProvider)).resolves.toMatchObject({
      summary: "First local",
    });

    setAiOperationDefault(root, { connectionId: second.id, operation: "opportunity_review" });
    await expect(reviewOpportunity(root, request, modelProvider)).resolves.toMatchObject({
      summary: "Second local",
    });

    removeAiConnection(root, second.id);
    await expect(reviewOpportunity(root, request, modelProvider)).rejects.toThrow(
      "Validate and choose a connection for Opportunity review",
    );
  });
});
