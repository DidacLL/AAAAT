// @vitest-environment node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAiConnectionForOperation,
  getDefaultAiConnection,
  listAiConnections,
  removeAiConnection,
  requireAiConnectionForOperation,
  requireDefaultAiConnection,
  saveNamedAiConnection,
  setAiOperationDefault,
  setDefaultAiConnection,
  validateAiConnectionOperation,
} from "../src/main/ai-connection-service";
import type { ModelProvider } from "../src/main/ai-provider";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-ai-connections-"));
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
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("named AI connections", () => {
  it("routes operations only through explicitly validated capabilities", async () => {
    const root = workspace();
    expect(listAiConnections(root)).toEqual([]);

    const firstSave = saveNamedAiConnection(root, {
      name: "Fast local",
      endpoint: "http://localhost:11434/v1",
      model: "fast-model",
    });
    const first = firstSave[0];
    if (!first) throw new Error("first connection fixture missing");
    expect(first).toMatchObject({
      name: "Fast local",
      isDefault: true,
      validatedOperations: [],
      defaultForOperations: [],
    });
    expect(getAiConnectionForOperation(root, "opportunity_review")).toBeNull();
    expect(() => requireAiConnectionForOperation(root, "opportunity_review")).toThrow(
      "Validate and choose a connection for Opportunity review",
    );

    const secondSave = saveNamedAiConnection(root, {
      name: "Deep local",
      endpoint: "http://127.0.0.1:1234/v1",
      model: "deep-model",
    });
    const second = secondSave.find((connection) => connection.name === "Deep local");
    if (!second) throw new Error("second connection fixture missing");
    setDefaultAiConnection(root, second.id);

    const firstValidated = await validateAiConnectionOperation(
      root,
      { connectionId: first.id, operation: "opportunity_review" },
      provider(),
    );
    expect(firstValidated.find((connection) => connection.id === first.id)).toMatchObject({
      validatedOperations: ["opportunity_review"],
      defaultForOperations: ["opportunity_review"],
    });
    expect(getAiConnectionForOperation(root, "opportunity_review")?.name).toBe("Fast local");

    const bothValidated = await validateAiConnectionOperation(
      root,
      { connectionId: second.id, operation: "opportunity_review" },
      provider(),
    );
    expect(bothValidated.find((connection) => connection.id === first.id)?.defaultForOperations).toEqual([
      "opportunity_review",
    ]);
    expect(bothValidated.find((connection) => connection.id === second.id)?.defaultForOperations).toEqual([]);

    const switched = setAiOperationDefault(root, {
      connectionId: second.id,
      operation: "opportunity_review",
    });
    expect(switched.find((connection) => connection.id === second.id)?.defaultForOperations).toEqual([
      "opportunity_review",
    ]);
    expect(getAiConnectionForOperation(root, "opportunity_review")?.name).toBe("Deep local");

    const renamed = saveNamedAiConnection(root, {
      id: second.id,
      name: "Deep local renamed",
      endpoint: second.endpoint,
      model: second.model,
    });
    expect(renamed.find((connection) => connection.id === second.id)).toMatchObject({
      validatedOperations: ["opportunity_review"],
      defaultForOperations: ["opportunity_review"],
    });

    const modelChanged = saveNamedAiConnection(root, {
      id: second.id,
      name: "Deep local renamed",
      endpoint: second.endpoint,
      model: "different-model",
    });
    expect(modelChanged.find((connection) => connection.id === second.id)).toMatchObject({
      validatedOperations: [],
      defaultForOperations: [],
    });
    expect(getAiConnectionForOperation(root, "opportunity_review")).toBeNull();

    const afterRemoval = removeAiConnection(root, second.id);
    expect(afterRemoval).toEqual([
      expect.objectContaining({ id: first.id, name: "Fast local", isDefault: false }),
    ]);
    expect(getDefaultAiConnection(root)).toBeNull();
    expect(() => requireDefaultAiConnection(root)).toThrow("Choose a default AI connection");

    const stored = readFileSync(path.join(root, "ai-connection.json"), "utf8");
    expect(stored).toContain('"version": 4');
    expect(stored).toContain('"validatedOperations"');
    expect(stored).toContain('"operationDefaults"');
    expect(stored).not.toMatch(/api.?key|credential|secret/i);
  });

  it("does not overwrite a connection changed while capability validation is running", async () => {
    const root = workspace();
    const saved = saveNamedAiConnection(root, {
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "model-a",
    });
    const connection = saved[0];
    if (!connection) throw new Error("connection fixture missing");

    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    let releaseValidation: (() => void) | undefined;
    const validationGate = new Promise<void>((resolve) => {
      releaseValidation = resolve;
    });
    const blockingProvider = provider();
    blockingProvider.reviewOpportunity = vi.fn<ModelProvider["reviewOpportunity"]>(async () => {
      markStarted?.();
      await validationGate;
      return {
        summary: "Synthetic validation result",
        relevantEvidence: [],
        uncertainties: [],
        questions: [],
      };
    });

    const pending = validateAiConnectionOperation(
      root,
      { connectionId: connection.id, operation: "opportunity_review" },
      blockingProvider,
    );
    await started;
    saveNamedAiConnection(root, {
      id: connection.id,
      name: connection.name,
      endpoint: connection.endpoint,
      model: "model-b",
    });
    releaseValidation?.();

    await expect(pending).rejects.toThrow("changed during capability validation");
    expect(listAiConnections(root)[0]).toMatchObject({
      model: "model-b",
      validatedOperations: [],
      defaultForOperations: [],
    });
  });

  it("rejects invalid routing, ambiguous names, unsafe endpoints, and obsolete development config", async () => {
    const root = workspace();
    const saved = saveNamedAiConnection(root, {
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "model-a",
    });
    const connection = saved[0];
    if (!connection) throw new Error("connection fixture missing");

    expect(() =>
      setAiOperationDefault(root, {
        connectionId: connection.id,
        operation: "cv_tailoring",
      }),
    ).toThrow("is not validated for CV tailoring");

    const failingProvider = provider();
    failingProvider.reviewOpportunity = vi.fn<ModelProvider["reviewOpportunity"]>(async () => {
      throw new Error("synthetic validation failed");
    });
    await expect(
      validateAiConnectionOperation(
        root,
        { connectionId: connection.id, operation: "opportunity_review" },
        failingProvider,
      ),
    ).rejects.toThrow("synthetic validation failed");
    expect(listAiConnections(root)[0]?.validatedOperations).toEqual([]);

    expect(() =>
      saveNamedAiConnection(root, {
        name: "local MODEL",
        endpoint: "http://127.0.0.1:11435/v1",
        model: "model-b",
      }),
    ).toThrow("names must be unique");
    expect(() =>
      saveNamedAiConnection(root, {
        name: "Unsafe remote HTTP",
        endpoint: "http://models.example.test/v1",
        model: "model-c",
      }),
    ).toThrow("loopback host");

    writeFileSync(
      path.join(root, "ai-connection.json"),
      JSON.stringify({
        version: 2,
        connections: [],
        defaultConnectionId: null,
      }),
      "utf8",
    );
    expect(() => listAiConnections(root)).toThrow("stored AI connection configuration is invalid");
  });

  it("normalizes a valid v3 configuration in place without preserving retired operations", () => {
    const root = workspace();
    const id = "00000000-0000-4000-8000-000000000001";
    writeFileSync(
      path.join(root, "ai-connection.json"),
      JSON.stringify({
        version: 3,
        connections: [
          {
            id,
            name: "Existing connection",
            endpoint: "https://models.example.test/v1",
            model: "existing-model",
            validatedOperations: ["fit_assessment", "job_extraction", "candidature_comparison"],
          },
        ],
        defaultConnectionId: id,
        operationDefaults: {
          fit_assessment: id,
          job_extraction: id,
          candidature_comparison: id,
        },
      }),
      "utf8",
    );

    expect(listAiConnections(root)).toEqual([
      expect.objectContaining({
        id,
        validatedOperations: ["opportunity_review", "job_extraction"],
        defaultForOperations: ["opportunity_review", "job_extraction"],
      }),
    ]);
    const corrected = readFileSync(path.join(root, "ai-connection.json"), "utf8");
    expect(corrected).toContain('"version": 4');
    expect(corrected).toContain('"opportunity_review"');
    expect(corrected).not.toContain("fit_assessment");
    expect(corrected).not.toContain("candidature_comparison");
  });
});
