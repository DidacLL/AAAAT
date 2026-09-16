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
import { addProfileItem } from "../src/main/profile-service";
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
  });
}

async function configuredWorkspace(...operations: readonly AiOperation[]): Promise<string> {
  const root = workspace();
  const connection = saveNamedAiConnection(root, {
    name: "Local model",
    endpoint: "http://localhost:11434/v1",
    model: "local-model",
  })[0];
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
    expect(stored).not.toMatch(/api.?key|credential|secret/i);

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

  it("discloses populated application values only when their single AI-use eye is enabled", async () => {
    const root = await configuredWorkspace("opportunity_review");
    const allowed = createCandidatureField(root, {
      label: "Allowed application fact",
      description: "May be used by AI.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const disabled = createCandidatureField(root, {
      label: "Private application fact",
      description: "Must stay local.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    updateCandidatureFieldPreferences(root, {
      ...allowed.preferences,
      aiUseAllowed: true,
    });
    updateCandidatureFieldPreferences(root, {
      ...disabled.preferences,
      aiUseAllowed: false,
    });
    const candidature = createCandidature(root, {
      source: {
        kind: "recruiter_message",
        title: "PRIVATE SOURCE TITLE",
        url: "https://example.invalid/private",
        sourceText: "PRIVATE SOURCE BODY",
      },
      values: [
        { fieldId: allowed.definition.id, value: "VISIBLE VALUE" },
        { fieldId: disabled.definition.id, value: "HIDDEN VALUE" },
      ],
    });

    const preview = previewOpportunityReview(root, { candidatureId: candidature.id });
    expect(preview.projectedContext.candidature.sources).toEqual([]);
    expect(preview.projectedContext.candidature.information).toEqual([
      {
        fieldId: allowed.definition.id,
        label: "Allowed application fact",
        value: "VISIBLE VALUE",
      },
    ]);
    expect(JSON.stringify(preview.projectedContext)).not.toContain("HIDDEN VALUE");
    expect(JSON.stringify(preview.projectedContext)).not.toContain("PRIVATE SOURCE");

    const review = vi.fn<ModelProvider["reviewOpportunity"]>(async (_connection, context) => {
      expect(context.candidature.information).toEqual([
        { label: "Allowed application fact", value: "VISIBLE VALUE" },
      ]);
      expect(JSON.stringify(context)).not.toContain("HIDDEN VALUE");
      expect(JSON.stringify(context)).not.toContain(allowed.definition.id);
      return {
        summary: "Allowed value received.",
        relevantEvidence: ["VISIBLE VALUE"],
        uncertainties: [],
        questions: [],
      };
    });

    await expect(
      reviewOpportunity(
        root,
        { candidatureId: candidature.id },
        provider({ reviewOpportunity: review }),
      ),
    ).resolves.toMatchObject({ relevantEvidence: ["VISIBLE VALUE"] });
  });

  it("supplies enabled identity and contact information normally", async () => {
    const root = await configuredWorkspace("opportunity_review");
    const candidature = createCandidature(root, { values: [] });
    addProfileItem(root, { kind: "identity", title: "Didac Example" });
    addProfileItem(root, { kind: "contact", title: "didac@example.test" });

    const preview = previewOpportunityReview(root, { candidatureId: candidature.id });
    expect(preview.projectedContext.profileItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "identity", title: "Didac Example" }),
        expect.objectContaining({ kind: "contact", title: "didac@example.test" }),
      ]),
    );
    expect(JSON.stringify(preview.projectedContext)).not.toContain("AAAT_PRIVATE_");
  });

  it("builds extraction requests only from current fields allowed for AI use", async () => {
    const root = await configuredWorkspace("job_extraction");
    const hours = createCandidatureField(root, {
      label: "Minimum flight hours",
      description: "Minimum total flight hours requested by the opportunity.",
      valueType: "number",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const privateField = createCandidatureField(root, {
      label: "Private local note",
      description: "Never request this from AI.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    updateCandidatureFieldPreferences(root, {
      ...hours.preferences,
      aiUseAllowed: true,
    });
    updateCandidatureFieldPreferences(root, {
      ...privateField.preferences,
      aiUseAllowed: false,
    });

    const extract = vi.fn<ModelProvider["extractJob"]>(async (_connection, request) => {
      const configured = request.fields.find(
        (field) => field.label === "Minimum flight hours",
      );
      expect(configured).toMatchObject({
        label: "Minimum flight hours",
        valueType: "number",
        cardinality: "one",
      });
      expect(request.fields.some((field) => field.label === "Private local note")).toBe(false);
      expect(request.tags).toEqual([]);
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
    ).resolves.toEqual({
      proposals: [{ fieldId: hours.definition.id, value: 1500 }],
      newFields: [],
    });
    expect(listCandidatures(root)).toEqual([]);
  });

  it("rediscovers one configured field from explicitly selected retained Sources without overwriting", async () => {
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
      url: "",
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
    updateCandidatureFieldPreferences(root, {
      ...rating.preferences,
      aiUseAllowed: true,
    });
    const discover = vi.fn<ModelProvider["extractJob"]>(async (_connection, request) => {
      expect(request.fields).toHaveLength(1);
      expect(request.fields[0]?.label).toBe("Type rating");
      expect(request.sourceText).toContain("A320 type rating");
      expect(request.sourceText).not.toContain("unrelated retained Source");
      return {
        proposals: [{ fieldRef: request.fields[0]?.fieldRef ?? "", value: "A320" }],
      };
    });

    const result = await discoverCandidatureFieldFromSources(
      root,
      {
        candidatureId: candidature.id,
        fieldId: rating.definition.id,
        sourceIds: [source.id],
      },
      provider({ extractJob: discover }),
    );
    expect(result).toEqual({
      proposal: { fieldId: rating.definition.id, value: "A320" },
      existingValuePresent: false,
    });
    expect(listCandidatures(root)[0]?.values).toEqual([]);

    setCandidatureFieldValue(root, {
      candidatureId: candidature.id,
      fieldId: rating.definition.id,
      value: "A320",
    });
    expect(listCandidatures(root)[0]?.values).toEqual([
      expect.objectContaining({ fieldId: rating.definition.id, value: "A320" }),
    ]);
  });

  it("projects choice labels instead of persisted choice identifiers", async () => {
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
      aiUseAllowed: true,
    });
    const candidature = createCandidature(root, {
      values: [{ fieldId: arrangement.definition.id, value: choiceId }],
    });
    const review = vi.fn<ModelProvider["reviewOpportunity"]>(async (_connection, context) => {
      expect(context.candidature.information).toContainEqual({
        label: "Work arrangement",
        value: "Remote",
      });
      expect(JSON.stringify(context)).not.toContain(choiceId);
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
        { candidatureId: candidature.id },
        provider({ reviewOpportunity: review }),
      ),
    ).resolves.toMatchObject({ summary: "Choice projected." });
  });
});
