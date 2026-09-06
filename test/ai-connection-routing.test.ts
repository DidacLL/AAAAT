// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  removeAiConnection,
  saveNamedAiConnection,
  setDefaultAiConnection,
} from "../src/main/ai-connection-service";
import type { ModelProvider } from "../src/main/ai-provider";
import { assessFit } from "../src/main/ai-service";
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
    assessFit: vi.fn<ModelProvider["assessFit"]>(async (connection) => ({
      fit: "possible",
      summary: connection.name,
      strengths: [],
      gaps: [],
      focus: [],
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

describe("AI default connection routing", () => {
  it("uses only the explicit default and never falls back after that default is removed", async () => {
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

    await expect(
      assessFit(
        root,
        { candidatureId: candidature.id, identityPrivacy: "omit", contactPrivacy: "omit" },
        modelProvider,
      ),
    ).resolves.toMatchObject({ summary: "First local" });

    setDefaultAiConnection(root, second.id);
    await expect(
      assessFit(
        root,
        { candidatureId: candidature.id, identityPrivacy: "omit", contactPrivacy: "omit" },
        modelProvider,
      ),
    ).resolves.toMatchObject({ summary: "Second local" });

    removeAiConnection(root, second.id);
    await expect(
      assessFit(
        root,
        { candidatureId: candidature.id, identityPrivacy: "omit", contactPrivacy: "omit" },
        modelProvider,
      ),
    ).rejects.toThrow("Choose a default local AI connection");
    expect(first.isDefault).toBe(true);
  });
});
