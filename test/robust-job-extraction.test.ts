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
import { createTag } from "../src/main/tag-service";
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

function aiField(
  root: string,
  label: string,
  valueType: "text" | "number" = "text",
  aiUseAllowed = true,
) {
  const created = createCandidatureField(root, {
    label,
    description: `${label} description`,
    valueType,
    cardinality: "one",
    choices: [],
    enabled: true,
  });
  return updateCandidatureFieldPreferences(root, {
    ...created.preferences,
    aiUseAllowed,
  });
}

function userPayload(init: RequestInit | undefined): {
  fields: Array<{ fieldRef: string; label: string }>;
  tags: Array<{ tagRef: string; name: string; aliases: string[]; definition: string }>;
} {
  const body = JSON.parse(String(init?.body)) as {
    messages: Array<{ role: string; content: string }>;
  };
  return JSON.parse(
    body.messages.find((message) => message.role === "user")?.content ?? "{}",
  ) as {
    fields: Array<{ fieldRef: string; label: string }>;
    tags: Array<{ tagRef: string; name: string; aliases: string[]; definition: string }>;
  };
}

function modelResponse(result: unknown): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("partial-safe job extraction", () => {
  it("keeps a valid sibling when another proposed field value is incompatible", async () => {
    const root = await configuredWorkspace();
    const organisation = aiField(root, "Organisation partial test");
    const salary = aiField(root, "Salary partial test", "number");

    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        const payload = userPayload(init);
        const ref = (label: string) =>
          payload.fields.find((field) => field.label === label)?.fieldRef ?? "";
        return modelResponse({
          proposals: [
            { fieldRef: ref("Organisation partial test"), value: "Aster Aviation" },
            { fieldRef: ref("Salary partial test"), value: "not-a-number" },
          ],
          newFields: [],
          existingTags: [],
          newTags: [],
        });
      }),
    );

    const result = await extractJobWithPartialOutcomes(root, {
      sourceTitle: "Aster vacancy",
      sourceUrl: "",
      sourceText: "Aster Aviation offers a competitive salary.",
    });

    expect(result.proposals).toEqual([
      { fieldId: organisation.definition.id, value: "Aster Aviation" },
    ]);
    expect(result.issues).toEqual([
      expect.objectContaining({ fieldId: salary.definition.id, kind: "invalid" }),
    ]);
  });

  it("requests only empty information whose single AI-use eye is enabled", async () => {
    const root = await configuredWorkspace();
    const allowed = aiField(root, "Allowed information", "text", true);
    const disabled = aiField(root, "Disabled information", "text", false);
    const payloads: ReturnType<typeof userPayload>[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        payloads.push(userPayload(init));
        return modelResponse({ proposals: [], newFields: [], existingTags: [], newTags: [] });
      }),
    );

    await extractJobWithPartialOutcomes(root, {
      sourceTitle: "Targeted offer",
      sourceUrl: "",
      sourceText: "Some supported facts.",
    });

    const sent = payloads.at(-1);
    expect(sent).toBeDefined();
    expect(sent?.fields.map((field) => field.label)).toContain("Allowed information");
    expect(sent?.fields.map((field) => field.label)).not.toContain("Disabled information");
    expect(JSON.stringify(sent)).not.toContain(disabled.definition.id);

    await expect(
      extractJobWithPartialOutcomes(
        root,
        { sourceTitle: "Targeted", sourceUrl: "", sourceText: "Some supported facts." },
        undefined,
        [disabled.definition.id],
      ),
    ).rejects.toThrow("The requested information is no longer available for AI use.");
    expect(allowed.preferences.aiUseAllowed).toBe(true);
  });

  it("supplies a bounded shared Tag glossary and returns existing matches plus defined new Tags for review", async () => {
    const root = await configuredWorkspace();
    aiField(root, "Role");
    const existing = createTag(root, {
      name: "TypeScript",
      definition: "Use of TypeScript in professional software work.",
      aliases: ["TS"],
      notes: "Local note is not provider context.",
    });
    const payloads: ReturnType<typeof userPayload>[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        const payload = userPayload(init);
        payloads.push(payload);
        const tagRef = payload.tags.find((tag) => tag.name === "TypeScript")?.tagRef ?? "";
        return modelResponse({
          proposals: [],
          newFields: [],
          existingTags: [{ tagRef, evidence: "The offer requires TypeScript." }],
          newTags: [
            {
              name: "Distributed systems",
              definition: "Design and operation of software spanning multiple networked components.",
              aliases: ["distributed architecture"],
              evidence: "The role owns distributed services.",
            },
          ],
        });
      }),
    );

    const result = await extractJobWithPartialOutcomes(root, {
      sourceTitle: "Platform role",
      sourceUrl: "",
      sourceText: "TypeScript is required for distributed services.",
    });

    const sent = payloads.at(-1);
    expect(sent).toBeDefined();
    expect(sent?.tags).toEqual([
      expect.objectContaining({
        name: "TypeScript",
        aliases: ["TS"],
        definition: existing.definition,
      }),
    ]);
    expect(JSON.stringify(sent)).not.toContain("Local note is not provider context");
    expect(result.existingTags).toEqual([
      { tagId: existing.id, name: "TypeScript", evidence: "The offer requires TypeScript." },
    ]);
    expect(result.newTags).toEqual([
      {
        name: "Distributed systems",
        definition: "Design and operation of software spanning multiple networked components.",
        aliases: ["distributed architecture"],
        evidence: "The role owns distributed services.",
      },
    ]);
  });
});
