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
      label: "Role",
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
        proposals: [{ fieldRef: user.fields[0]?.fieldRef, value: "Senior Platform Engineer" }],
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
});
