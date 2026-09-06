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
import {
  compareCandidatures,
  previewCandidatureComparison,
} from "../src/main/candidature-comparison-service";
import {
  createCandidatureField,
  updateCandidatureFieldPreferences,
} from "../src/main/candidature-field-service";
import {
  addCandidatureSource,
  createCandidature,
  listCandidatures,
} from "../src/main/candidature-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];
const choiceId = "00000000-0000-4000-8000-000000001911";
type CompareCandidatures = NonNullable<ModelProvider["compareCandidatures"]>;

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-comparison-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function provider(overrides: Partial<ModelProvider> = {}): ModelProvider {
  return {
    assessFit: vi.fn<ModelProvider["assessFit"]>(),
    extractJob: vi.fn<ModelProvider["extractJob"]>(),
    recommendVariant: vi.fn<ModelProvider["recommendVariant"]>(),
    tailorCv: vi.fn<ModelProvider["tailorCv"]>(),
    draftCoverLetter: vi.fn<ModelProvider["draftCoverLetter"]>(),
    compareCandidatures: vi.fn<CompareCandidatures>(),
    ...overrides,
  };
}

async function configureComparison(root: string): Promise<void> {
  const connection = saveNamedAiConnection(root, {
    name: "Local comparison model",
    endpoint: "http://localhost:11434/v1",
    model: "comparison-model",
  })[0];
  if (!connection) throw new Error("comparison connection fixture missing");
  await validateAiConnectionOperation(
    root,
    { connectionId: connection.id, operation: "candidature_comparison" },
    provider({
      compareCandidatures: vi.fn<CompareCandidatures>(async (_connection, context) => ({
        analyses: context.candidatures.map((candidature) => ({
          candidatureRef: candidature.candidatureRef,
          strengths: [],
          concerns: [],
          questions: [],
        })),
        considerations: [],
      })),
    }),
  );
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("bounded candidature comparison", () => {
  it("previews and compares only AI-visible selected information without durable IDs or Sources", async () => {
    const root = workspace();
    await configureComparison(root);

    const exposed = createCandidatureField(root, {
      label: "Role",
      description: "Role title",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const omitted = createCandidatureField(root, {
      label: "Private note",
      description: "Local only",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const tokenized = createCandidatureField(root, {
      label: "Referral code",
      description: "Replace for AI",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const choice = createCandidatureField(root, {
      label: "Work mode",
      description: "Preferred work mode",
      valueType: "choice",
      cardinality: "one",
      choices: [{ id: choiceId, label: "Remote" }],
      enabled: true,
    });
    updateCandidatureFieldPreferences(root, {
      ...exposed.preferences,
      aiContextMode: "expose",
    });
    updateCandidatureFieldPreferences(root, {
      ...omitted.preferences,
      aiContextMode: "omit",
    });
    updateCandidatureFieldPreferences(root, {
      ...tokenized.preferences,
      aiContextMode: "token",
    });
    updateCandidatureFieldPreferences(root, {
      ...choice.preferences,
      aiContextMode: "expose",
    });

    const first = createCandidature(root, {
      source: {
        kind: "job_posting",
        title: "Alpha retained source",
        url: "https://example.test/alpha",
        sourceText: "SOURCE-SECRET-ALPHA",
      },
      values: [
        { fieldId: exposed.definition.id, value: "Platform engineer" },
        { fieldId: omitted.definition.id, value: "DO-NOT-DISCLOSE" },
        { fieldId: tokenized.definition.id, value: "LOCAL-REF-ALPHA" },
        { fieldId: choice.definition.id, value: choiceId },
      ],
    });
    const second = createCandidature(root, {
      values: [
        { fieldId: exposed.definition.id, value: "Reliability engineer" },
        { fieldId: tokenized.definition.id, value: "LOCAL-REF-BETA" },
      ],
    });
    addCandidatureSource(root, {
      candidatureId: second.id,
      kind: "recruiter_message",
      title: "Beta retained source",
      url: "",
      sourceText: "SOURCE-SECRET-BETA",
    });

    const request = { candidatureIds: [first.id, second.id] };
    const preview = previewCandidatureComparison(root, request);
    expect(preview.entries).toHaveLength(2);
    expect(preview.entries.map((entry) => entry.providerLabel)).toEqual([
      "Candidature 1",
      "Candidature 2",
    ]);
    const serializedPreview = JSON.stringify(preview);
    expect(serializedPreview).not.toContain("DO-NOT-DISCLOSE");
    expect(serializedPreview).not.toContain("SOURCE-SECRET-ALPHA");
    expect(serializedPreview).not.toContain("SOURCE-SECRET-BETA");
    expect(serializedPreview).not.toContain("LOCAL-REF-ALPHA");
    expect(serializedPreview).not.toContain("LOCAL-REF-BETA");
    expect(serializedPreview).toContain("Remote");
    expect(serializedPreview).not.toContain(choiceId);

    const before = listCandidatures(root);
    const compare = vi.fn<CompareCandidatures>(async (_connection, context) => {
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain(first.id);
      expect(serialized).not.toContain(second.id);
      expect(serialized).not.toContain(exposed.definition.id);
      expect(serialized).not.toContain(omitted.definition.id);
      expect(serialized).not.toContain(tokenized.definition.id);
      expect(serialized).not.toContain(choice.definition.id);
      expect(serialized).not.toContain(choiceId);
      expect(serialized).not.toContain("SOURCE-SECRET-ALPHA");
      expect(serialized).not.toContain("SOURCE-SECRET-BETA");
      expect(serialized).not.toContain("DO-NOT-DISCLOSE");
      expect(serialized).not.toContain("LOCAL-REF-ALPHA");
      expect(serialized).toContain("Remote");

      const token = context.candidatures[0]?.information.find(
        (item) => item.label === "Referral code",
      )?.value;
      expect(typeof token).toBe("string");
      return {
        analyses: context.candidatures.map((candidature, index) => ({
          candidatureRef: candidature.candidatureRef,
          strengths: index === 0 ? [String(token)] : [],
          concerns: [],
          questions: [],
        })),
        considerations: ["Compare the evidence the user considers important."],
      };
    });

    const result = await compareCandidatures(root, request, provider({ compareCandidatures: compare }));
    expect(result.analyses.map((analysis) => analysis.candidatureId)).toEqual([
      first.id,
      second.id,
    ]);
    expect(result.analyses[0]?.strengths).toEqual(["LOCAL-REF-ALPHA"]);
    expect(result.considerations).toEqual([
      "Compare the evidence the user considers important.",
    ]);
    expect(listCandidatures(root)).toEqual(before);
  });

  it("fails closed when provider references do not exactly match the selected candidatures", async () => {
    const root = workspace();
    await configureComparison(root);
    const first = createCandidature(root, { values: [] });
    const second = createCandidature(root, { values: [] });

    await expect(
      compareCandidatures(
        root,
        { candidatureIds: [first.id, second.id] },
        provider({
          compareCandidatures: vi.fn<CompareCandidatures>(async (_connection, context) => ({
            analyses: [
              {
                candidatureRef: context.candidatures[0]?.candidatureRef ?? "aaaat_missing_1",
                strengths: [],
                concerns: [],
                questions: [],
              },
              {
                candidatureRef: "aaaat_unselected_reference",
                strengths: [],
                concerns: [],
                questions: [],
              },
            ],
            considerations: [],
          })),
        }),
      ),
    ).rejects.toThrow("did not match the selected candidatures");
  });
});
