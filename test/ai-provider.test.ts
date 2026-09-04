// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createOpenAiCompatibleProvider } from "../src/main/ai-provider";
import type {
  AiConnectionStatus,
  FitProjectedContext,
  JobExtractionProviderRequest,
  VariantRecommendationContext,
} from "../src/shared/ai-contracts";

const connection: AiConnectionStatus = {
  name: "Local fixture",
  endpoint: "http://localhost:11434/v1",
  model: "fixture-model",
};
const fieldId = "00000000-0000-4000-8000-000000000801";
const candidature = {
  label: "Pilot opportunity",
  information: [{ fieldId, label: "Minimum flight hours", value: 1500 }],
  sources: [
    {
      title: "Vacancy",
      url: "https://example.invalid/pilot",
      sourceText: "Minimum 1,500 total hours.",
    },
  ],
};
const context: FitProjectedContext = {
  candidature,
  profileItems: [{ kind: "skill", title: "TypeScript" }],
};

function response(content: unknown): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("OpenAI-compatible provider", () => {
  it("sends one keyless fit request and validates the typed result", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        fit: "strong",
        summary: "Strong match.",
        strengths: ["TypeScript"],
        gaps: [],
        focus: ["Review evidence"],
      }),
    );
    const provider = createOpenAiCompatibleProvider(fetchImpl);

    await expect(provider.assessFit(connection, context)).resolves.toMatchObject({ fit: "strong" });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect(init?.headers).toEqual({ "content-type": "application/json" });
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.model).toBe("fixture-model");
    expect(body.messages[1]?.content).toBe(JSON.stringify(context));
  });

  it("sends the runtime discovery catalogue and validates field-ID proposals", async () => {
    const request: JobExtractionProviderRequest = {
      sourceTitle: "Pilot vacancy",
      sourceUrl: "https://example.invalid/pilot",
      sourceText: "Minimum 1,500 total hours.",
      fields: [
        {
          id: fieldId,
          label: "Minimum flight hours",
          description: "Minimum total flight hours requested.",
          valueType: "number",
          cardinality: "one",
          choices: [],
        },
      ],
    };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response({ proposals: [{ fieldId, value: 1500 }] }),
    );
    const provider = createOpenAiCompatibleProvider(fetchImpl);

    await expect(provider.extractJob(connection, request)).resolves.toEqual({
      proposals: [{ fieldId, value: 1500 }],
    });
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[1]?.content).toBe(JSON.stringify(request));
    expect(body.messages[0]?.content).toMatch(/field IDs present in fields/i);
  });

  it("sends only candidature and existing variant metadata for recommendation", async () => {
    const variantContext: VariantRecommendationContext = {
      candidature,
      variants: [
        {
          id: "00000000-0000-4000-8000-000000000810",
          name: "Platform",
          focus: "Platform focus",
          targetTags: ["platform"],
          preferredLanguage: "en",
        },
      ],
    };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        variantId: variantContext.variants[0]?.id,
        rationale: "Matches platform focus.",
      }),
    );
    const provider = createOpenAiCompatibleProvider(fetchImpl);

    await expect(provider.recommendVariant(connection, variantContext)).resolves.toMatchObject({
      rationale: "Matches platform focus.",
    });
  });

  it("rejects malformed typed output and hides raw provider failure details", async () => {
    const malformed = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), {
          status: 200,
        }),
      ),
    );
    await expect(malformed.assessFit(connection, context)).rejects.toThrow("invalid fit assessment");

    const failed = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(new Response("private provider detail", { status: 500 })),
    );
    await expect(failed.assessFit(connection, context)).rejects.toThrow(
      "configured local model provider rejected the request",
    );
  });
});
