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
  recommendVariant,
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

  it("uses collision-resistant opaque tokens and rehydrates token-looking private literals without chaining", async () => {
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
      values: [{ fieldId: sensitive.definition.id, value: "[AAAT_PRIVATE_2]" }],
    });
    addProfileItem(root, { kind: "identity", title: "Didac Example" });

    const preview = previewFitAssessment(root, {
      candidatureId: candidature.id,
      identityPrivacy: "token",
      contactPrivacy: "omit",
    });
    const serialized = JSON.stringify(preview.projectedContext);
    const tokens = serialized.match(/\[AAAT_PRIVATE_[0-9a-f-]{36}\]/g) ?? [];
    expect(new Set(tokens).size).toBe(2);
    expect(serialized).not.toContain("Didac Example");
    expect(serialized).not.toContain("[AAAT_PRIVATE_2]");

    const assess = vi.fn<ModelProvider["assessFit"]>(async (_connection, context) => {
      const projectedValue = context.candidature.information.find(
        (item) => item.fieldId === sensitive.definition.id,
      )?.value;
      const projectedIdentity = context.profileItems.find((item) => item.kind === "identity")?.title;
      expect(typeof projectedValue).toBe("string");
      expect(projectedIdentity).toMatch(/^\[AAAT_PRIVATE_[0-9a-f-]{36}\]$/);
      return {
        fit: "possible",
        summary: String(projectedValue),
        strengths: [projectedIdentity ?? ""],
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
    ).resolves.toMatchObject({
      summary: "[AAAT_PRIVATE_2]",
      strengths: ["Didac Example"],
    });
  });

  it("keeps retained Sources out of ordinary AI projection and lets field privacy control disclosure", async () => {
    const root = configuredWorkspace();
    const omitted = createCandidatureField(root, {
      label: "Private compensation note",
      description: "Never send this field in ordinary AI context.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const tokenized = createCandidatureField(root, {
      label: "Referral code",
      description: "Tokenize this field in ordinary AI context.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    updateCandidatureFieldPreferences(root, {
      ...omitted.preferences,
      aiContextMode: "omit",
    });
    updateCandidatureFieldPreferences(root, {
      ...tokenized.preferences,
      aiContextMode: "token",
    });
    const candidature = createCandidature(root, {
      source: {
        kind: "recruiter_message",
        title: "PRIVATE RECRUITER THREAD",
        url: "https://example.invalid/private-thread",
        sourceText: "SECRET-COMP-9000 and PRIVATE-REF-42 appear in retained evidence.",
      },
      values: [
        { fieldId: omitted.definition.id, value: "SECRET-COMP-9000" },
        { fieldId: tokenized.definition.id, value: "PRIVATE-REF-42" },
      ],
    });
    const variant = createProfileVariant(root, {
      name: "General",
      focus: "General applications",
      targetTags: [],
    }).variants[0];
    if (!variant) throw new Error("variant fixture missing");

    const preview = previewFitAssessment(root, {
      candidatureId: candidature.id,
      identityPrivacy: "omit",
      contactPrivacy: "omit",
    });
    expect(preview.projectedContext.candidature.sources).toEqual([]);
    expect(preview.projectedContext.candidature.label).toBe("Candidature");
    const serialized = JSON.stringify(preview.projectedContext);
    expect(serialized).not.toContain("PRIVATE RECRUITER THREAD");
    expect(serialized).not.toContain("private-thread");
    expect(serialized).not.toContain("SECRET-COMP-9000");
    expect(serialized).not.toContain("PRIVATE-REF-42");
    expect(serialized).toMatch(/\[AAAT_PRIVATE_[0-9a-f-]{36}\]/);

    const recommend = vi.fn<ModelProvider["recommendVariant"]>(async (_connection, context) => {
      const providerContext = JSON.stringify(context);
      expect(context.candidature.sources).toEqual([]);
      expect(context.candidature.label).toBe("Candidature");
      expect(providerContext).not.toContain("PRIVATE RECRUITER THREAD");
      expect(providerContext).not.toContain("SECRET-COMP-9000");
      expect(providerContext).not.toContain("PRIVATE-REF-42");
      return { variantId: variant.id, rationale: "General match." };
    });
    await expect(
      recommendVariant(
        root,
        { candidatureId: candidature.id },
        provider({ recommendVariant: recommend }),
      ),
    ).resolves.toEqual({ variantId: variant.id, rationale: "General match." });
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
});
