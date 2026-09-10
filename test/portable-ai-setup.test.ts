// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildPortableAiSetup,
  getAiConnectionForOperation,
  listAiConnections,
  replaceAiConnectionsFromPortableSetup,
  saveNamedAiConnection,
  setDefaultAiConnection,
  validateAiConnectionOperation,
} from "../src/main/ai-connection-service";
import type { ModelProvider } from "../src/main/ai-provider";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-portable-ai-setup-"));
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

describe("portable local AI setup", () => {
  it("exports only portable connection setup and resets environment-specific validation on import", async () => {
    const root = workspace();
    const firstSave = saveNamedAiConnection(root, {
      name: "Fast local",
      endpoint: "http://localhost:11434/v1",
      model: "fast-model",
    });
    const first = firstSave[0];
    if (!first) throw new Error("first connection fixture missing");
    const secondSave = saveNamedAiConnection(root, {
      name: "Deep local",
      endpoint: "http://127.0.0.1:1234/v1",
      model: "deep-model",
    });
    const second = secondSave.find((connection) => connection.name === "Deep local");
    if (!second) throw new Error("second connection fixture missing");
    setDefaultAiConnection(root, second.id);
    await validateAiConnectionOperation(
      root,
      { connectionId: first.id, operation: "opportunity_review" },
      provider(),
    );

    const portable = buildPortableAiSetup(root);
    expect(portable).toEqual({
      format: "aaaat-ai-setup",
      version: 1,
      connections: [
        { name: "Fast local", endpoint: "http://localhost:11434/v1", model: "fast-model" },
        { name: "Deep local", endpoint: "http://127.0.0.1:1234/v1", model: "deep-model" },
      ],
      defaultConnectionName: "Deep local",
    });
    const serialized = JSON.stringify(portable);
    expect(serialized).not.toMatch(/"id"|validatedOperations|operationDefaults|defaultForOperations/);

    const previousIds = new Set(listAiConnections(root).map((connection) => connection.id));
    const imported = replaceAiConnectionsFromPortableSetup(root, portable);
    expect(imported).toHaveLength(2);
    expect(imported.find((connection) => connection.name === "Deep local")?.isDefault).toBe(true);
    expect(imported.every((connection) => !previousIds.has(connection.id))).toBe(true);
    expect(imported.every((connection) => connection.validatedOperations.length === 0)).toBe(true);
    expect(imported.every((connection) => connection.defaultForOperations.length === 0)).toBe(true);
    expect(getAiConnectionForOperation(root, "opportunity_review")).toBeNull();
  });

  it("rejects invalid portable setup before replacing the current connections", () => {
    const root = workspace();
    saveNamedAiConnection(root, {
      name: "Existing local",
      endpoint: "http://localhost:11434/v1",
      model: "existing-model",
    });
    const remote = replaceAiConnectionsFromPortableSetup(root, {
      format: "aaaat-ai-setup",
      version: 1,
      connections: [
        { name: "Remote", endpoint: "https://models.example.test/v1", model: "remote-model" },
      ],
      defaultConnectionName: "Remote",
    });
    expect(remote).toEqual([
      expect.objectContaining({ name: "Remote", endpoint: "https://models.example.test/v1" }),
    ]);
    const before = listAiConnections(root);

    expect(() =>
      replaceAiConnectionsFromPortableSetup(root, {
        format: "not-an-ai-setup",
        version: 1,
        connections: [
          { name: "Different", endpoint: "https://models.example.test/v1", model: "remote-model" },
        ],
        defaultConnectionName: "Different",
      } as never),
    ).toThrow();
    expect(listAiConnections(root)).toEqual(before);

    expect(() =>
      replaceAiConnectionsFromPortableSetup(root, {
        format: "aaaat-ai-setup",
        version: 1,
        connections: [
          { name: "Same", endpoint: "http://localhost:11434/v1", model: "one" },
          { name: "same", endpoint: "http://localhost:1234/v1", model: "two" },
        ],
        defaultConnectionName: "Same",
      }),
    ).toThrow("Portable AI connection names must be unique");
    expect(listAiConnections(root)).toEqual(before);

    expect(() =>
      replaceAiConnectionsFromPortableSetup(root, {
        format: "aaaat-ai-setup",
        version: 2,
        connections: [],
        defaultConnectionName: null,
      } as never),
    ).toThrow();
    expect(listAiConnections(root)).toEqual(before);
  });
});
