// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createOpenAiCompatibleProvider } from "../src/main/ai-provider";
import type {
  AiConnectionStatus,
  ProviderOpportunityReviewContext,
  ProviderJobExtractionRequest,
  ProviderVariantRecommendationContext,
} from "../src/shared/ai-contracts";

const connection: AiConnectionStatus = {
  name: "Local fixture",
  endpoint: "http://localhost:11434/v1",
  model: "fixture-model",
};
const fieldRef = "aaaat_provider_00000000-0000-4000-8000-000000000801_1";
const candidature = {
  label: "Pilot opportunity",
  information: [{ label: "Minimum flight hours", value: 1500 }],
  sources: [
    {
      title: "Vacancy",
      url: "https://example.invalid/pilot",
      sourceText: "Minimum 1,500 total hours.",
    },
  ],
};
const context: ProviderOpportunityReviewContext = {
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
  it("sends one keyless opportunity review request and validates the neutral result", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        summary: "The supplied TypeScript experience is relevant evidence.",
        relevantEvidence: ["TypeScript"],
        uncertainties: [],
        questions: ["Which responsibilities matter most for this role?"],
      }),
    );
    const provider = createOpenAiCompatibleProvider(fetchImpl);

    await expect(provider.reviewOpportunity(connection, context)).resolves.toMatchObject({
      relevantEvidence: ["TypeScript"],
    });
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

  it("sends operation-scoped discovery references and reads typed proposals", async () => {
    const request: ProviderJobExtractionRequest = {
      sourceTitle: "Pilot vacancy",
      sourceUrl: "https://example.invalid/pilot",
      sourceText: "Minimum 1,500 total hours.",
      fields: [
        {
          fieldRef,
          label: "Minimum flight hours",
          description: "Minimum total flight hours requested.",
          valueType: "number",
          cardinality: "one",
          choices: [],
        },
      ],
    };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response({ proposals: [{ fieldRef, value: 1500 }] }),
    );
    const provider = createOpenAiCompatibleProvider(fetchImpl);

    await expect(provider.extractJob(connection, request)).resolves.toEqual({
      proposals: [{ fieldRef, value: 1500 }],
    });
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[1]?.content).toBe(JSON.stringify(request));
  });

  it("sends only candidature and existing variant metadata for recommendation", async () => {
    const variantContext: ProviderVariantRecommendationContext = {
      candidature,
      variants: [
        {
          variantRef: "aaaat_variant_00000000-0000-4000-8000-000000000810_1",
          name: "Platform",
          focus: "Platform focus",
          targetTags: ["platform"],
          preferredLanguage: "en",
        },
      ],
    };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        variantRef: variantContext.variants[0]?.variantRef,
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
    await expect(malformed.reviewOpportunity(connection, context)).rejects.toThrow(
      "invalid opportunity review",
    );

    const failed = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(new Response("private provider detail", { status: 500 })),
    );
    await expect(failed.reviewOpportunity(connection, context)).rejects.toThrow(
      "configured AI provider rejected the request",
    );
  });

  it("rejects ratings, rankings, winner selection, and prescribed actions", async () => {
    const provider = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(
        response({
          summary: "Score: 9 out of 10.",
          relevantEvidence: [],
          uncertainties: [],
          questions: ["You should apply for this opportunity."],
        }),
      ),
    );

    await expect(provider.reviewOpportunity(connection, context)).rejects.toThrow(
      "invalid opportunity review",
    );
  });
});
