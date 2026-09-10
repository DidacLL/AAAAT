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
import { getSetupEnvironmentSnapshot } from "../src/main/setup-environment-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-setup-environment-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function provider(): ModelProvider {
  return {
    reviewOpportunity: vi.fn<ModelProvider["reviewOpportunity"]>(async () => ({
      summary: "Synthetic validation result",
      relevantEvidence: [],
      uncertainties: [],
      questions: [],
    })),
    extractJob: vi.fn<ModelProvider["extractJob"]>(async () => ({ proposals: [] })),
    recommendVariant: vi.fn<ModelProvider["recommendVariant"]>(async () => ({
      variantRef: "aaaat_validation_variant",
      rationale: "Synthetic validation result",
    })),
    tailorCv: vi.fn<ModelProvider["tailorCv"]>(async () => ({ recommendations: [] })),
    draftCoverLetter: vi.fn<ModelProvider["draftCoverLetter"]>(async () => ({
      recipient: "",
      subject: "Validation",
      bodyParagraphs: ["Synthetic validation result."],
      closing: "",
    })),
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("setup environment service", () => {
  it("projects fixed TeX readiness and the existing validated AI routes", async () => {
    const root = workspace();
    const saved = saveNamedAiConnection(root, {
      name: "Local fit model",
      endpoint: "http://localhost:11434/v1",
      model: "fit-model",
    });
    const connection = saved[0];
    if (!connection) throw new Error("connection fixture missing");
    await validateAiConnectionOperation(
      root,
      { connectionId: connection.id, operation: "opportunity_review" },
      provider(),
    );

    const probed: string[] = [];
    const snapshot = await getSetupEnvironmentSnapshot(root, async (command) => {
      probed.push(command);
      return {
        command,
        available: true,
        version: command === "latexmk" ? "Latexmk 4.86" : "pdfTeX 3.141592653",
      };
    });

    expect(probed).toEqual(["latexmk", "pdflatex"]);
    expect(snapshot.workspaceReady).toBe(true);
    expect(snapshot.tex).toMatchObject({ documentRenderingReady: true });
    expect(snapshot.ai).toMatchObject({ configurationReadable: true, connectionCount: 1 });
    expect(snapshot.ai.operations).toContainEqual({
      operation: "opportunity_review",
      available: true,
      connectionName: "Local fit model",
    });
    expect(snapshot.ai.operations).toContainEqual({
      operation: "cv_tailoring",
      available: false,
      connectionName: null,
    });
  });

  it("reports missing TeX and zero AI as valid manual configuration", async () => {
    const root = workspace();
    const snapshot = await getSetupEnvironmentSnapshot(root, async (command) => ({
      command,
      available: false,
      version: null,
    }));

    expect(snapshot.workspaceReady).toBe(true);
    expect(snapshot.tex.documentRenderingReady).toBe(false);
    expect(snapshot.tex.commands).toEqual([
      { command: "latexmk", available: false, version: null },
      { command: "pdflatex", available: false, version: null },
    ]);
    expect(snapshot.ai.configurationReadable).toBe(true);
    expect(snapshot.ai.connectionCount).toBe(0);
    expect(snapshot.ai.operations.every((operation) => !operation.available)).toBe(true);
  });
});
