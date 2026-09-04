// @vitest-environment node

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assessFit,
  discoverCandidatureFieldFromSources,
  extractJob,
  previewFitAssessment,
  saveAiConnection,
} from "../src/main/ai-service";
import type { ModelProvider } from "../src/main/ai-provider";
import {
  createCandidatureField,
  setCandidatureFieldValue,
  updateCandidatureFieldPreferences,
} from "../src/main/candidature-field-service";
import {
  createCandidature,
  listCandidatureSources,
  listCandidatures,
} from "../src/main/candidature-service";
import { addProfileItem } from "../src/main/profile-service";
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
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("AI service over live candidature information", () => {
  it("persists understandable local-only connection settings and rejects non-loopback endpoints", () => {
    const root = workspace();
    expect(
      saveAiConnection(root, {
        name: "Local model",
        endpoint: "http://localhost:11434/v1",
        model: "model-a",
      }),
    ).toEqual({
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "model-a",
    });
    const stored = readFileSync(path.join(root, "ai-connection.json"), "utf8");
    expect(stored).toContain('"version": 1');
    expect(stored).not.toMatch(/api.?key|credential|secret/i);

    expect(() =>
      saveAiConnection(root, {
        name: "Remote",
        endpoint: "https://models.example.test/v1",
        model: "model-a",
      }),
    ).toThrow("loopback endpoint");
  });

  it("assigns distinct opaque tokens across candidature information and profile identity", () => {
    const root = configuredWorkspace();
    const sensitive = createCandidatureField(root, {
      label: "Internal referral code",
      description: "Private local reference.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    updateCandidatureFieldPreferences(root, {
      ...sensitive.preferences,
      aiContextMode: "token",
    });
    const candidature = createCandidature(root, {
      values: [{ fieldId: sensitive.definition.id, value: "PRIVATE-REF-42" }],
    });
    addProfileItem(root, { kind: "identity", title: "Didac Example" });

    const preview = previewFitAssessment(root, {
      candidatureId: candidature.id,
      identityPrivacy: "token",
      contactPrivacy: "omit",
    });
    const serialized = JSON.stringify(preview.projectedContext);
    expect(serialized).toContain("[AAAT_PRIVATE_1]");
    expect(serialized).toContain("[AAAT_PRIVATE_2]");
    expect(serialized).not.toContain("PRIVATE-REF-42");
    expect(serialized).not.toContain("Didac Example");
  });

  it("builds extraction requests from the current live field catalogue, including a field added at runtime", async () => {
    const root = configuredWorkspace();
    const hours = createCandidatureField(root, {
      label: "Minimum flight hours",
      description: "Minimum total flight hours requested by the opportunity.",
      valueType: "number",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    updateCandidatureFieldPreferences(root, {
      ...hours.preferences,
      aiDiscovery: true,
      aiContextMode: "expose",
    });

    const extract = vi.fn<ModelProvider["extractJob"]>(async (_connection, request) => {
      const configured = request.fields.find((field) => field.id === hours.definition.id);
      expect(configured).toEqual({
        id: hours.definition.id,
        label: "Minimum flight hours",
        description: "Minimum total flight hours requested by the opportunity.",
        valueType: "number",
        cardinality: "one",
        choices: [],
      });
      return { proposals: [{ fieldId: hours.definition.id, value: 1500 }] };
    });

    await expect(
      extractJob(
        root,
        {
          sourceTitle: "Pilot vacancy",
          sourceUrl: "https://example.invalid/jobs/pilot",
          sourceText: "Applicants need at least 1,500 total flight hours.",
        },
        provider({ extractJob: extract }),
      ),
    ).resolves.toEqual({ proposals: [{ fieldId: hours.definition.id, value: 1500 }] });
    expect(listCandidatures(root)).toEqual([]);
  });

  it("rejects provider proposals for fields that were not requested", async () => {
    const root = configuredWorkspace();
    const unexpectedId = "00000000-0000-4000-8000-000000009999";
    const extract = vi.fn<ModelProvider["extractJob"]>(async () => ({
      proposals: [{ fieldId: unexpectedId, value: "invented" }],
    }));

    await expect(
      extractJob(
        root,
        { sourceTitle: "", sourceUrl: "", sourceText: "Opportunity text" },
        provider({ extractJob: extract }),
      ),
    ).rejects.toThrow("was not requested");
    expect(listCandidatures(root)).toEqual([]);
  });

  it("rediscovers a newly configured field from historical retained Sources and returns proposals without overwriting", async () => {
    const root = configuredWorkspace();
    const candidature = createCandidature(root, {
      source: {
        kind: "job_posting",
        title: "Original vacancy",
        url: "https://example.invalid/original",
        sourceText: "An A320 type rating is required for this position.",
      },
      values: [],
    });
    const source = listCandidatureSources(root, candidature.id)[0];
    if (!source) throw new Error("source fixture missing");

    const rating = createCandidatureField(root, {
      label: "Type rating",
      description: "Aircraft type rating required or preferred.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const discover = vi.fn<ModelProvider["extractJob"]>(async (_connection, request) => {
      expect(request.fields).toEqual([
        {
          id: rating.definition.id,
          label: "Type rating",
          description: "Aircraft type rating required or preferred.",
          valueType: "text",
          cardinality: "one",
          choices: [],
        },
      ]);
      expect(request.sourceText).toContain("A320 type rating");
      return { proposals: [{ fieldId: rating.definition.id, value: "A320" }] };
    });

    const first = await discoverCandidatureFieldFromSources(
      root,
      {
        candidatureId: candidature.id,
        fieldId: rating.definition.id,
        sourceIds: [source.id],
      },
      provider({ extractJob: discover }),
    );
    expect(first).toEqual({
      proposal: { fieldId: rating.definition.id, value: "A320" },
      existingValuePresent: false,
    });
    expect(listCandidatures(root)[0]?.values).toEqual([]);

    setCandidatureFieldValue(root, {
      candidatureId: candidature.id,
      fieldId: rating.definition.id,
      value: "A320",
    });
    const second = await discoverCandidatureFieldFromSources(
      root,
      {
        candidatureId: candidature.id,
        fieldId: rating.definition.id,
        sourceIds: [source.id],
      },
      provider({ extractJob: discover }),
    );
    expect(second.existingValuePresent).toBe(true);
    expect(listCandidatures(root)[0]?.values).toEqual([
      expect.objectContaining({ fieldId: rating.definition.id, value: "A320" }),
    ]);
  });

  it("rehydrates privacy tokens only after local fit inference returns", async () => {
    const root = configuredWorkspace();
    addProfileItem(root, { kind: "identity", title: "Didac Example" });
    const candidature = createCandidature(root, { values: [] });
    const assess = vi.fn<ModelProvider["assessFit"]>(async (_connection, context) => {
      expect(JSON.stringify(context)).not.toContain("Didac Example");
      return {
        fit: "possible",
        summary: "Evidence for [AAAT_PRIVATE_1].",
        strengths: [],
        gaps: [],
        focus: [],
      };
    });

    await expect(
      assessFit(
        root,
        {
          candidatureId: candidature.id,
          identityPrivacy: "token",
          contactPrivacy: "omit",
        },
        provider({ assessFit: assess }),
      ),
    ).resolves.toMatchObject({ summary: "Evidence for Didac Example." });
  });
});
