// @vitest-environment node

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { AiOperation } from "../src/shared/ai-connection-contracts";
import {
  saveNamedAiConnection,
  validateAiConnectionOperation,
} from "../src/main/ai-connection-service";
import {
  discoverCandidatureFieldFromSources,
  extractJob,
  previewOpportunityReview,
  recommendVariant,
  reviewOpportunity,
} from "../src/main/ai-service";
import type { ModelProvider } from "../src/main/ai-provider";
import {
  createCandidatureField,
  setCandidatureFieldValue,
  updateCandidatureFieldPreferences,
} from "../src/main/candidature-field-service";
import {
  addCandidatureSource,
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

function provider(overrides: Partial<ModelProvider>): ModelProvider {
  return {
    reviewOpportunity: vi.fn<ModelProvider["reviewOpportunity"]>(),
    extractJob: vi.fn<ModelProvider["extractJob"]>(),
    recommendVariant: vi.fn<ModelProvider["recommendVariant"]>(),
    tailorCv: vi.fn<ModelProvider["tailorCv"]>(),
    draftCoverLetter: vi.fn<ModelProvider["draftCoverLetter"]>(),
    ...overrides,
  };
}

function validationProvider(): ModelProvider {
  return provider({
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
  });
}

async function configuredWorkspace(...operations: readonly AiOperation[]): Promise<string> {
  const root = workspace();
  const saved = saveNamedAiConnection(root, {
    name: "Local model",
    endpoint: "http://localhost:11434/v1",
    model: "local-model",
  });
  const connection = saved[0];
  if (!connection) throw new Error("connection fixture missing");
  for (const operation of operations) {
    await validateAiConnectionOperation(
      root,
      { connectionId: connection.id, operation },
      validationProvider(),
    );
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("AI service over live candidature information", () => {
  it("persists keyless local or remote connection settings and rejects unsafe endpoints", () => {
    const root = workspace();
    const saved = saveNamedAiConnection(root, {
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "model-a",
    });
    expect(saved[0]).toMatchObject({
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "model-a",
      isDefault: true,
      validatedOperations: [],
      defaultForOperations: [],
    });
    const stored = readFileSync(path.join(root, "ai-connection.json"), "utf8");
    expect(stored).toContain('"version": 4');
    expect(stored).toContain('"connections"');
    expect(stored).not.toMatch(/api.?key|credential|secret/i);

    expect(
      saveNamedAiConnection(root, {
        name: "Remote",
        endpoint: "https://models.example.test/v1",
        model: "model-a",
      })[1],
    ).toMatchObject({ endpoint: "https://models.example.test/v1" });
    for (const endpoint of [
      "http://models.example.test/v1",
      "https://user:password@models.example.test/v1",
      "https://models.example.test/v1?token=secret",
      "https://models.example.test/v1#secret",
    ]) {
      expect(() =>
        saveNamedAiConnection(root, { name: endpoint, endpoint, model: "model-a" }),
      ).toThrow();
    }
  });

  it("does not disclose replacement-mode literals and restores them locally in the result", async () => {
    const root = await configuredWorkspace("opportunity_review");
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
      values: [{ fieldId: sensitive.definition.id, value: "LOCAL-REFERRAL-ONLY" }],
    });
    addProfileItem(root, { kind: "identity", title: "Didac Example" });

    const preview = previewOpportunityReview(root, {
      candidatureId: candidature.id,
      identityPrivacy: "token",
      contactPrivacy: "omit",
    });
    const previewValue = preview.projectedContext.candidature.information.find(
      (item) => item.fieldId === sensitive.definition.id,
    )?.value;
    const previewIdentity = preview.projectedContext.profileItems.find(
      (item) => item.kind === "identity",
    )?.title;
    expect(typeof previewValue).toBe("string");
    expect(typeof previewIdentity).toBe("string");
    expect(previewValue).not.toBe("LOCAL-REFERRAL-ONLY");
    expect(previewIdentity).not.toBe("Didac Example");
    expect(previewValue).not.toBe(previewIdentity);

    const serialized = JSON.stringify(preview.projectedContext);
    expect(serialized).not.toContain("Didac Example");
    expect(serialized).not.toContain("LOCAL-REFERRAL-ONLY");

    const review = vi.fn<ModelProvider["reviewOpportunity"]>(async (_connection, context) => {
      const projectedValue = context.candidature.information.find(
        (item) => item.label === "Internal referral code",
      )?.value;
      expect(JSON.stringify(context)).not.toContain(sensitive.definition.id);
      const projectedIdentity = context.profileItems.find((item) => item.kind === "identity")?.title;
      expect(typeof projectedValue).toBe("string");
      expect(typeof projectedIdentity).toBe("string");
      expect(projectedValue).not.toBe("LOCAL-REFERRAL-ONLY");
      expect(projectedIdentity).not.toBe("Didac Example");
      expect(projectedValue).not.toBe(projectedIdentity);
      return {
        summary: String(projectedValue),
        relevantEvidence: [projectedIdentity ?? ""],
        uncertainties: [],
        questions: [],
      };
    });

    await expect(
      reviewOpportunity(
        root,
        {
          candidatureId: candidature.id,
          identityPrivacy: "token",
          contactPrivacy: "omit",
        },
        provider({ reviewOpportunity: review }),
      ),
    ).resolves.toMatchObject({
      summary: "LOCAL-REFERRAL-ONLY",
      relevantEvidence: ["Didac Example"],
    });
  });

  it("keeps retained Sources out of ordinary AI projection and lets field privacy control disclosure", async () => {
    const root = await configuredWorkspace("opportunity_review", "variant_recommendation");
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

    const preview = previewOpportunityReview(root, {
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
    const projectedReferral = preview.projectedContext.candidature.information.find(
      (item) => item.fieldId === tokenized.definition.id,
    )?.value;
    expect(typeof projectedReferral).toBe("string");
    expect(projectedReferral).not.toBe("PRIVATE-REF-42");

    const recommend = vi.fn<ModelProvider["recommendVariant"]>(async (_connection, context) => {
      const providerContext = JSON.stringify(context);
      expect(context.candidature.sources).toEqual([]);
      expect(context.candidature.label).toBe("Candidature");
      expect(providerContext).not.toContain("PRIVATE RECRUITER THREAD");
      expect(providerContext).not.toContain("SECRET-COMP-9000");
      expect(providerContext).not.toContain("PRIVATE-REF-42");
      expect(providerContext).not.toContain(variant.id);
      return { variantRef: context.variants[0]?.variantRef ?? "", rationale: "General match." };
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
    const root = await configuredWorkspace("job_extraction");
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
      const configured = request.fields.find((field) => field.label === "Minimum flight hours");
      expect(configured).toMatchObject({
        fieldRef: expect.any(String),
        label: "Minimum flight hours",
        description: "Minimum total flight hours requested by the opportunity.",
        valueType: "number",
        cardinality: "one",
        choices: [],
      });
      expect(JSON.stringify(request)).not.toContain(hours.definition.id);
      return { proposals: [{ fieldRef: configured?.fieldRef ?? "", value: 1500 }] };
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
    const root = await configuredWorkspace("job_extraction");
    const unexpectedId = "aaaat_discovery_00000000-0000-4000-8000-000000009999_1";
    const extract = vi.fn<ModelProvider["extractJob"]>(async () => ({
      proposals: [{ fieldRef: unexpectedId, value: "invented" }],
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
    const root = await configuredWorkspace("historical_field_discovery");
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
    addCandidatureSource(root, {
      candidatureId: candidature.id,
      kind: "recruiter_message",
      title: "Unselected recruiter note",
      url: "https://example.invalid/unselected",
      sourceText: "Do not provide this unrelated retained Source to discovery.",
    });

    const rating = createCandidatureField(root, {
      label: "Type rating",
      description: "Aircraft type rating required or preferred.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const discover = vi.fn<ModelProvider["extractJob"]>(async (_connection, request) => {
      expect(request.fields).toMatchObject([
        {
          fieldRef: expect.any(String),
          label: "Type rating",
          description: "Aircraft type rating required or preferred.",
          valueType: "text",
          cardinality: "one",
          choices: [],
        },
      ]);
      expect(request.sourceText).toContain("A320 type rating");
      expect(request.sourceText).not.toContain("unrelated retained Source");
      expect(JSON.stringify(request)).not.toContain(rating.definition.id);
      return { proposals: [{ fieldRef: request.fields[0]?.fieldRef ?? "", value: "A320" }] };
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

  it("projects choice labels instead of persisted choice and field identifiers", async () => {
    const root = await configuredWorkspace("opportunity_review");
    const choiceId = "00000000-0000-4000-8000-000000000011";
    const arrangement = createCandidatureField(root, {
      label: "Work arrangement",
      description: "",
      valueType: "choice",
      cardinality: "one",
      choices: [{ id: choiceId, label: "Remote" }],
      enabled: true,
    });
    updateCandidatureFieldPreferences(root, {
      ...arrangement.preferences,
      aiContextMode: "expose",
    });
    const candidature = createCandidature(root, {
      values: [{ fieldId: arrangement.definition.id, value: choiceId }],
    });
    const review = vi.fn<ModelProvider["reviewOpportunity"]>(async (_connection, context) => {
      const payload = JSON.stringify(context);
      expect(payload).not.toContain(arrangement.definition.id);
      expect(payload).not.toContain(choiceId);
      expect(context.candidature.information).toContainEqual({
        label: "Work arrangement",
        value: "Remote",
      });
      return {
        summary: "Choice projected.",
        relevantEvidence: [],
        uncertainties: [],
        questions: [],
      };
    });
    await expect(
      reviewOpportunity(
        root,
        { candidatureId: candidature.id, identityPrivacy: "omit", contactPrivacy: "omit" },
        provider({ reviewOpportunity: review }),
      ),
    ).resolves.toMatchObject({ summary: "Choice projected." });
  });
});
