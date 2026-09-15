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
import { extractJobWithPartialOutcomes } from "../src/main/robust-job-extraction";
import {
  createCandidatureField,
  updateCandidatureFieldPreferences,
} from "../src/main/candidature-field-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-partial-ai-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function validationProvider(): ModelProvider {
  return {
    reviewOpportunity: vi.fn<ModelProvider["reviewOpportunity"]>(),
    extractJob: vi.fn<ModelProvider["extractJob"]>(async () => ({ proposals: [] })),
    recommendVariant: vi.fn<ModelProvider["recommendVariant"]>(),
    tailorCv: vi.fn<ModelProvider["tailorCv"]>(),
    draftCoverLetter: vi.fn<ModelProvider["draftCoverLetter"]>(),
  };
}

async function configuredWorkspace(): Promise<string> {
  const root = workspace();
  const connection = saveNamedAiConnection(root, {
    name: "Imperfect local model",
    endpoint: "http://127.0.0.1:18080/v1",
    model: "small-local-model",
  })[0];
  if (!connection) throw new Error("connection fixture missing");
  await validateAiConnectionOperation(
    root,
    { connectionId: connection.id, operation: "job_extraction" },
    validationProvider(),
  );
  return root;
}

function discoveryField(
  root: string,
  input: Parameters<typeof createCandidatureField>[1],
) {
  const created = createCandidatureField(root, input);
  updateCandidatureFieldPreferences(root, {
    ...created.preferences,
    aiDiscovery: true,
    aiContextMode: "expose",
  });
  return created;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("partial-safe job extraction", () => {
  it("keeps valid siblings, normalizes safe cardinality mismatches, and isolates invalid or stale proposals", async () => {
    const root = await configuredWorkspace();
    const organisation = discoveryField(root, {
      label: "Organisation partial test",
      description: "Employer name.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const languages = discoveryField(root, {
      label: "Idiomas",
      description: "Languages requested by the opportunity.",
      valueType: "text",
      cardinality: "many",
      choices: [],
      enabled: true,
    });
    const location = discoveryField(root, {
      label: "Location partial test",
      description: "Opportunity location.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const salary = discoveryField(root, {
      label: "Salary partial test",
      description: "Compensation amount.",
      valueType: "number",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const applyUrl = discoveryField(root, {
      label: "Apply URL partial test",
      description: "Application URL.",
      valueType: "url",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const workMode = discoveryField(root, {
      label: "Work mode partial test",
      description: "Allowed working mode.",
      valueType: "choice",
      cardinality: "one",
      choices: [
        { id: "00000000-0000-4000-8000-000000009901", label: "Remote" },
        { id: "00000000-0000-4000-8000-000000009902", label: "On site" },
      ],
      enabled: true,
    });

    let sentBody: Record<string, unknown> | null = null;
    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
      sentBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      const messages = sentBody.messages as Array<{ role: string; content: string }>;
      const userPayload = JSON.parse(
        messages.find((message) => message.role === "user")?.content ?? "{}",
      ) as {
        fields: Array<{
          fieldRef: string;
          label: string;
          choices: Array<{ choiceRef: string }>;
        }>;
      };
      const ref = (label: string) =>
        userPayload.fields.find((field) => field.label === label)?.fieldRef ?? "";

      const modelResult = {
        proposals: [
          { fieldRef: ref("Organisation partial test"), value: "Aster Aviation" },
          { fieldRef: ref("Idiomas"), value: "English" },
          { fieldRef: ref("Location partial test"), value: ["Madrid"] },
          { fieldRef: ref("Salary partial test"), value: "50000" },
          { fieldRef: ref("Apply URL partial test"), value: "not a URL" },
          { fieldRef: ref("Work mode partial test"), value: "aaaat_unknown_choice" },
          { fieldRef: "aaaat_stale_field_1", value: "stale" },
        ],
        newFields: [
          {
            label: "Seniority partial test",
            description: "Seniority named by the offer.",
            valueType: "text",
            cardinality: "one",
            choices: [],
            value: "Senior",
          },
          {
            label: "Broken extra",
            description: "Deliberately malformed local-model suggestion.",
            valueType: "text",
            cardinality: "one",
            choices: ["Should not exist for text"],
            value: "x",
          },
        ],
      };
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(modelResult) } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractJobWithPartialOutcomes(root, {
      sourceTitle: "Aster vacancy",
      sourceUrl: "https://example.invalid/jobs/aster",
      sourceText: "Aster Aviation seeks a Senior candidate in Madrid. English is required.",
    });

    expect(result.proposals).toEqual(
      expect.arrayContaining([
        { fieldId: organisation.definition.id, value: "Aster Aviation" },
        { fieldId: languages.definition.id, value: ["English"] },
        { fieldId: location.definition.id, value: "Madrid" },
      ]),
    );
    expect(result.proposals).toHaveLength(3);
    expect(result.newFields).toMatchObject([{ label: "Seniority partial test", value: "Senior" }]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: salary.definition.id, kind: "invalid" }),
        expect.objectContaining({ fieldId: applyUrl.definition.id, kind: "invalid" }),
        expect.objectContaining({ fieldId: workMode.definition.id, kind: "invalid" }),
        expect.objectContaining({ fieldId: null, kind: "stale" }),
        expect.objectContaining({ fieldLabel: "Broken extra", kind: "new_field_invalid" }),
      ]),
    );

    expect(result.exchange?.rawModelResponse).toContain("English");
    expect(result.exchange?.systemInstruction).toContain("obey each field type and cardinality");
    expect(result.exchange?.userPayload).toContain("Idiomas");
    expect(result.exchange?.providerValidationError).not.toBe("");

    const capturedBody = sentBody as unknown as Record<string, unknown> | null;
    const responseFormat = capturedBody?.response_format as {
      json_schema?: { schema?: { properties?: { proposals?: { items?: unknown } } } };
    };
    const items = responseFormat.json_schema?.schema?.properties?.proposals?.items as {
      anyOf?: Array<{
        properties?: { fieldRef?: { const?: string }; value?: { type?: string; items?: unknown } };
      }>;
    };
    const parsedPayload = JSON.parse(result.exchange?.userPayload ?? "{}") as {
      fields: Array<{ label: string; fieldRef: string }>;
    };
    const languageWireRef = parsedPayload.fields.find(
      (candidate) => candidate.label === "Idiomas",
    )?.fieldRef;
    const locationWireRef = parsedPayload.fields.find(
      (candidate) => candidate.label === "Location partial test",
    )?.fieldRef;
    expect(
      items.anyOf?.find((candidate) => candidate.properties?.fieldRef?.const === languageWireRef)
        ?.properties?.value?.type,
    ).toBe("array");
    expect(
      items.anyOf?.find((candidate) => candidate.properties?.fieldRef?.const === locationWireRef)
        ?.properties?.value?.type,
    ).toBe("string");
  });

  it("marks one-value multi-item arrays incompatible without discarding usable siblings", async () => {
    const root = await configuredWorkspace();
    const role = discoveryField(root, {
      label: "Role partial test",
      description: "Role title.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const location = discoveryField(root, {
      label: "Location single-value partial test",
      description: "Location.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as {
          messages: Array<{ role: string; content: string }>;
        };
        const payload = JSON.parse(
          body.messages.find((message) => message.role === "user")?.content ?? "{}",
        ) as { fields: Array<{ fieldRef: string; label: string }> };
        const ref = (label: string) =>
          payload.fields.find((field) => field.label === label)?.fieldRef ?? "";
        const modelResult = {
          proposals: [
            { fieldRef: ref("Role partial test"), value: ["Engineer", "Architect"] },
            { fieldRef: ref("Location single-value partial test"), value: "Madrid" },
          ],
          newFields: [],
        };
        return new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify(modelResult) } }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const result = await extractJobWithPartialOutcomes(root, {
      sourceTitle: "",
      sourceUrl: "",
      sourceText: "Engineer or Architect wording appears near Madrid.",
    });

    expect(result.proposals).toEqual([{ fieldId: location.definition.id, value: "Madrid" }]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        fieldId: role.definition.id,
        kind: "invalid",
        proposedValue: ["Engineer", "Architect"],
      }),
    ]);
  });
});
