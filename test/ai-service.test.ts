// @vitest-environment node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { assessFit, previewFitAssessment, saveAiConnection } from "../src/main/ai-service";
import type { FitModelProvider } from "../src/main/ai-provider";
import { createCandidature } from "../src/main/candidature-service";
import { addProfileItem } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-ai-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function seedFitContext(root: string): string {
  addProfileItem(root, { kind: "identity", title: "Didac Example" });
  addProfileItem(root, { kind: "contact", title: "didac@example.test" });
  addProfileItem(root, { kind: "skill", title: "TypeScript" });
  const candidature = createCandidature(root, {
    company: "Example Corp",
    role: "Platform Engineer",
    location: "Remote",
    workMode: "remote",
    salaryText: "",
    source: "Job board",
    sourceUrl: "",
    sourceText: "Build reliable TypeScript platform systems.",
    status: "saved",
    applicationDate: "",
    nextAction: "",
    nextActionDate: "",
    notes: "This note is intentionally not part of the AI context.",
  });
  return candidature.id;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("M3 AI service", () => {
  it("persists only understandable non-secret local connection settings", () => {
    const root = workspace();
    const status = saveAiConnection(root, {
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "model-a",
    });

    expect(status).toEqual({
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "model-a",
    });
    const stored = readFileSync(path.join(root, "ai-connection.json"), "utf8");
    expect(stored).toContain('"version": 1');
    expect(stored).not.toMatch(/api.?key|credential|secret/i);
  });

  it("rejects non-loopback endpoints", () => {
    const root = workspace();
    expect(() =>
      saveAiConnection(root, {
        name: "Remote",
        endpoint: "https://models.example.test/v1",
        model: "model-a",
      }),
    ).toThrow("loopback endpoint");
  });

  it("revalidates a stored connection before inference", async () => {
    const root = workspace();
    const candidatureId = seedFitContext(root);
    saveAiConnection(root, {
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "local-model",
    });
    writeFileSync(
      path.join(root, "ai-connection.json"),
      `${JSON.stringify({
        version: 1,
        name: "Edited connection",
        endpoint: "https://models.example.test/v1",
        model: "remote-model",
      })}\n`,
      "utf8",
    );
    const assess = vi.fn<FitModelProvider["assessFit"]>();

    await expect(
      assessFit(
        root,
        {
          candidatureId,
          identityPrivacy: "token",
          contactPrivacy: "omit",
        },
        { assessFit: assess },
      ),
    ).rejects.toThrow("stored AI connection configuration is invalid");
    expect(assess).not.toHaveBeenCalled();
  });

  it("projects identity as opaque local tokens and omits contact before inference", () => {
    const root = workspace();
    const candidatureId = seedFitContext(root);
    saveAiConnection(root, {
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "local-model",
    });

    const preview = previewFitAssessment(root, {
      candidatureId,
      identityPrivacy: "token",
      contactPrivacy: "omit",
    });
    const serialized = JSON.stringify(preview.projectedContext);
    expect(serialized).toContain("[AAAT_PRIVATE_1]");
    expect(serialized).not.toContain("Didac Example");
    expect(serialized).not.toContain("didac@example.test");
    expect(serialized).toContain("TypeScript");
    expect(serialized).not.toContain("intentionally not part");
  });

  it("passes only projected context to the provider and rehydrates local tokens", async () => {
    const root = workspace();
    const candidatureId = seedFitContext(root);
    saveAiConnection(root, {
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "local-model",
    });

    const assess = vi.fn<FitModelProvider["assessFit"]>(async (_connection, context) => {
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain("Didac Example");
      expect(serialized).not.toContain("didac@example.test");
      expect(serialized).toContain("[AAAT_PRIVATE_1]");
      return {
        fit: "strong",
        summary: "Strong evidence for [AAAT_PRIVATE_1].",
        strengths: ["TypeScript"],
        gaps: [],
        focus: ["Platform ownership"],
      };
    });
    const provider: FitModelProvider = { assessFit: assess };

    const result = await assessFit(
      root,
      {
        candidatureId,
        identityPrivacy: "token",
        contactPrivacy: "omit",
      },
      provider,
    );

    expect(assess).toHaveBeenCalledOnce();
    expect(result.summary).toBe("Strong evidence for Didac Example.");
  });
});
