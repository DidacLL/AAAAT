// @vitest-environment node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assessFit,
  extractJob,
  previewFitAssessment,
  recommendVariant,
  saveAiConnection,
} from "../src/main/ai-service";
import type { ModelProvider } from "../src/main/ai-provider";
import { createCandidature, listCandidatures } from "../src/main/candidature-service";
import { addProfileItem, createProfileVariant } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-ai-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function configuredWorkspace(): string {
  const root = workspace();
  saveAiConnection(root, {
    name: "Local model",
    endpoint: "http://localhost:11434/v1",
    model: "local-model",
  });
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
    const assess = vi.fn<ModelProvider["assessFit"]>();

    await expect(
      assessFit(
        root,
        {
          candidatureId,
          identityPrivacy: "token",
          contactPrivacy: "omit",
        },
        provider({ assessFit: assess }),
      ),
    ).rejects.toThrow("stored AI connection configuration is invalid");
    expect(assess).not.toHaveBeenCalled();
  });

  it("projects identity as opaque local tokens and omits contact before inference", () => {
    const root = configuredWorkspace();
    const candidatureId = seedFitContext(root);

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

  it("passes only projected context to the fit provider and rehydrates local tokens", async () => {
    const root = configuredWorkspace();
    const candidatureId = seedFitContext(root);
    const assess = vi.fn<ModelProvider["assessFit"]>(async (_connection, context) => {
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

    const result = await assessFit(
      root,
      {
        candidatureId,
        identityPrivacy: "token",
        contactPrivacy: "omit",
      },
      provider({ assessFit: assess }),
    );

    expect(assess).toHaveBeenCalledOnce();
    expect(result.summary).toBe("Strong evidence for Didac Example.");
  });

  it("passes only the pasted source payload to job extraction and does not mutate", async () => {
    const root = configuredWorkspace();
    const extract = vi.fn<ModelProvider["extractJob"]>(async (_connection, request) => {
      expect(request).toEqual({
        source: "Company careers",
        sourceUrl: "https://example.test/jobs/1",
        sourceText: "Example Corp seeks a Platform Engineer in Madrid.",
      });
      return {
        company: "Example Corp",
        role: "Platform Engineer",
        location: "Madrid",
        workMode: "",
        salaryText: "",
      };
    });

    await expect(
      extractJob(
        root,
        {
          source: "Company careers",
          sourceUrl: "https://example.test/jobs/1",
          sourceText: "Example Corp seeks a Platform Engineer in Madrid.",
        },
        provider({ extractJob: extract }),
      ),
    ).resolves.toMatchObject({ company: "Example Corp", role: "Platform Engineer" });
    expect(listCandidatures(root)).toEqual([]);
  });

  it("rejects an invalid extraction result without mutating candidature data", async () => {
    const root = configuredWorkspace();
    const extract = vi.fn<ModelProvider["extractJob"]>(async () => ({
      company: "Example Corp",
      role: "Platform Engineer",
      location: "Madrid",
      workMode: "remote",
      salaryText: "",
      invented: "not allowed",
    }) as never);

    await expect(
      extractJob(
        root,
        { sourceText: "Example Corp seeks a Platform Engineer.", source: "", sourceUrl: "" },
        provider({ extractJob: extract }),
      ),
    ).rejects.toThrow();
    expect(listCandidatures(root)).toEqual([]);
  });

  it("recommends only from existing variant metadata without sending profile content", async () => {
    const root = configuredWorkspace();
    const candidatureId = seedFitContext(root);
    const variants = createProfileVariant(root, {
      name: "Platform",
      focus: "Platform engineering",
      targetTags: ["platform"],
      preferredLanguage: "en",
    }).variants;
    const selected = variants[0];
    if (!selected) throw new Error("variant fixture missing");
    const recommend = vi.fn<ModelProvider["recommendVariant"]>(async (_connection, context) => {
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain("Didac Example");
      expect(serialized).not.toContain("didac@example.test");
      expect(serialized).toContain("Platform engineering");
      return { variantId: selected.id, rationale: "Matches the platform focus." };
    });

    await expect(
      recommendVariant(root, { candidatureId }, provider({ recommendVariant: recommend })),
    ).resolves.toEqual({
      variantId: selected.id,
      rationale: "Matches the platform focus.",
    });
  });

  it("rejects a recommendation for an unknown variant", async () => {
    const root = configuredWorkspace();
    const candidatureId = seedFitContext(root);
    createProfileVariant(root, {
      name: "Platform",
      focus: "Platform engineering",
      targetTags: [],
      preferredLanguage: "en",
    });
    const recommend = vi.fn<ModelProvider["recommendVariant"]>(async () => ({
      variantId: "00000000-0000-4000-8000-000000000099",
      rationale: "Invented.",
    }));

    await expect(
      recommendVariant(root, { candidatureId }, provider({ recommendVariant: recommend })),
    ).rejects.toThrow("no longer exists");
  });
});
