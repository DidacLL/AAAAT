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
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-extraction-tags-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function validationProvider(): ModelProvider {
  return {
    reviewOpportunity: vi.fn<ModelProvider["reviewOpportunity"]>(),
    extractJob: vi.fn<ModelProvider["extractJob"]>(async () => ({ proposals: [] })),
    tailorCv: vi.fn<ModelProvider["tailorCv"]>(),
    draftCoverLetter: vi.fn<ModelProvider["draftCoverLetter"]>(),
  };
}

function modelResponse(content: unknown): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("robust job extraction", () => {
  it("sends a bounded shared Tag glossary, matches existing Tags, and requires definitions for new Tags", async () => {
    const root = workspace();
    const role = createCandidatureField(root, {
      label: "Target role",
      description: "Role named in the opportunity.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    updateCandidatureFieldPreferences(root, {
      ...role.preferences,
      aiUseAllowed: true,
    });
    const platform = createTag(root, {
      name: "Platform engineering",
      aliases: ["Platform"],
      definition: "Engineering and operating shared application infrastructure.",
      notes: "",
    });

    const connection = saveNamedAiConnection(root, {
      name: "Local extraction model",
      endpoint: "http://localhost:11434/v1",
      model: "fixture-model",
    })[0];
    if (!connection) throw new Error("connection fixture missing");
    await validateAiConnectionOperation(
      root,
      { connectionId: connection.id, operation: "job_extraction" },
      validationProvider(),
    );

    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      const user = JSON.parse(
        body.messages.find((message) => message.role === "user")?.content ?? "{}",
      ) as {
        fields: Array<{ fieldRef: string; label: string }>;
        tags: Array<{ tagRef: string; name: string; aliases: string[]; definition: string }>;
      };

      expect(user.tags).toEqual([
        {
          tagRef: expect.any(String),
          name: "Platform engineering",
          aliases: ["Platform"],
          definition: "Engineering and operating shared application infrastructure.",
        },
      ]);
      expect(user.tags).toHaveLength(1);

      return modelResponse({
        proposals: [{ fieldRef: user.fields.find((field) => field.label === "Target role")?.fieldRef, value: "Senior Platform Engineer" }],
        existingTags: [{ tagRef: user.tags[0]?.tagRef, evidence: "platform team" }],
        newTags: [
          {
            name: "Distributed systems",
            definition: "Design and operation of systems spanning multiple networked components.",
            aliases: [],
            evidence: "distributed services",
          },
          {
            name: "Missing definition",
            definition: "",
            aliases: [],
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchImpl);

    const result = await extractJobWithPartialOutcomes(root, {
      sourceTitle: "Senior Platform Engineer",
      sourceUrl: "https://example.invalid/jobs/platform",
      sourceText: "Join our platform team to operate distributed services.",
    });

    expect(result.proposals).toEqual([
      { fieldId: role.definition.id, value: "Senior Platform Engineer" },
    ]);
    expect(result.existingTags).toEqual([
      expect.objectContaining({ tagId: platform.id }),
    ]);
    expect(result.newTags).toEqual([
      expect.objectContaining({
        name: "Distributed systems",
        definition: "Design and operation of systems spanning multiple networked components.",
      }),
    ]);
    expect(result.issues).toEqual([
      expect.objectContaining({ kind: "tag_invalid" }),
    ]);
  });
  it("keeps valid proposals when sibling proposals fail local field validation", async () => {
    const root = workspace();
    const role = createCandidatureField(root, {
      label: "Target role",
      description: "Role named in the opportunity.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    const closingDate = createCandidatureField(root, {
      label: "Closing date",
      description: "Application closing date.",
      valueType: "date",
      cardinality: "one",
      choices: [],
      enabled: true,
    });

    const connection = saveNamedAiConnection(root, {
      name: "Local extraction model",
      endpoint: "http://localhost:11434/v1",
      model: "fixture-model",
    })[0];
    if (!connection) throw new Error("connection fixture missing");
    await validateAiConnectionOperation(
      root,
      { connectionId: connection.id, operation: "job_extraction" },
      validationProvider(),
    );

    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      const user = JSON.parse(
        body.messages.find((message) => message.role === "user")?.content ?? "{}",
      ) as { fields: Array<{ fieldRef: string; label: string }> };
      const roleRef = user.fields.find((field) => field.label === "Target role")?.fieldRef;
      const dateRef = user.fields.find((field) => field.label === "Closing date")?.fieldRef;
      return modelResponse({
        proposals: [
          { fieldRef: roleRef, value: "Senior Platform Engineer" },
          { fieldRef: dateRef, value: "2026-99-99" },
          { fieldRef: "aaaat_missing", value: "stale" },
          42,
        ],
      });
    }));

    const result = await extractJobWithPartialOutcomes(
      root,
      {
        sourceTitle: "Senior Platform Engineer",
        sourceUrl: "",
        sourceText: "Senior Platform Engineer. Closing date is malformed in this fixture.",
      },
      undefined,
      [role.definition.id, closingDate.definition.id],
    );

    expect(result.proposals).toEqual([
      { fieldId: role.definition.id, value: "Senior Platform Engineer" },
    ]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: closingDate.definition.id, kind: "invalid" }),
        expect.objectContaining({ kind: "stale" }),
      ]),
    );
  });

  it("uses a small provider-agnostic envelope and salvages plain fenced JSON from a less-capable model", async () => {
    const root = workspace();
    const remoteId = "00000000-0000-4000-8000-000000000e01";
    const hybridId = "00000000-0000-4000-8000-000000000e02";
    const workMode = createCandidatureField(root, {
      label: "Work mode",
      description: "Work arrangement.",
      valueType: "choice",
      cardinality: "one",
      choices: [
        { id: remoteId, label: "Remote" },
        { id: hybridId, label: "Hybrid" },
      ],
      enabled: true,
    });

    const connection = saveNamedAiConnection(root, {
      name: "Small local model",
      endpoint: "http://localhost:11434/v1",
      model: "small-model",
    })[0];
    if (!connection) throw new Error("connection fixture missing");
    await validateAiConnectionOperation(
      root,
      { connectionId: connection.id, operation: "job_extraction" },
      validationProvider(),
    );

    const bodies: Array<Record<string, unknown>> = [];
    let attempt = 0;
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      bodies.push(body);
      attempt += 1;
      if (attempt === 1) {
        return new Response("structured output unsupported", { status: 400 });
      }
      return new Response(
        JSON.stringify({
          choices: [{
            message: {
              content: "```json\n{\"proposals\":[{\"fieldRef\":\"Work mode\",\"value\":\"Remote\"}]}\n```",
            },
          }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }));

    const result = await extractJobWithPartialOutcomes(
      root,
      {
        sourceTitle: "Remote role",
        sourceUrl: "",
        sourceText: "This role is remote.",
      },
      undefined,
      [workMode.definition.id],
    );

    expect(result.proposals).toEqual([{ fieldId: workMode.definition.id, value: remoteId }]);
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toHaveProperty("response_format");
    expect(JSON.stringify((bodies[0] as { response_format?: unknown }).response_format)).not.toContain("anyOf");
    expect(JSON.stringify(bodies[0])).not.toContain("reasoning_effort");
    expect(JSON.stringify(bodies[0])).not.toContain("chat_template_kwargs");
    expect(bodies[1]).not.toHaveProperty("response_format");
  });

});
