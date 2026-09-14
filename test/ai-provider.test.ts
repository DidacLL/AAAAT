// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AI_PROVIDER_SAFETY_CEILING_MS,
  AiProviderError,
  createOpenAiCompatibleProvider,
} from "../src/main/ai-provider";
import type {
  AiConnectionStatus,
  ProviderOpportunityReviewContext,
  ProviderJobExtractionRequest,
  ProviderVariantRecommendationContext,
} from "../src/shared/ai-contracts";

const connection: AiConnectionStatus = {
  name: "Local fixture",
  endpoint: "http://localhost:11434/v1",
  model: "Qwen3-8B-Q4_K_M",
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

function extractionRequest(): ProviderJobExtractionRequest {
  return {
    sourceTitle: "Pilot vacancy",
    sourceUrl: "",
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
}

function contentResponse(content: string, status = 200): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status, headers: { "content-type": "application/json" } },
  );
}

function response(content: unknown): Response {
  return contentResponse(JSON.stringify(content));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("OpenAI-compatible provider", () => {
  it("uses schema-constrained output and disables thinking for a Qwen3 llama.cpp-compatible request", async () => {
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
      reasoning_effort: string;
      chat_template_kwargs: { enable_thinking: boolean };
      response_format: {
        type: string;
        json_schema: { strict: boolean; schema: Record<string, unknown> };
      };
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.model).toBe("Qwen3-8B-Q4_K_M");
    expect(body.reasoning_effort).toBe("none");
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema).toMatchObject({ type: "object" });
    expect(body.messages[1]?.content).toBe(JSON.stringify(context));
  });

  it("falls back coherently when an endpoint rejects the structured-output request option", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unsupported response_format", { status: 400 }))
      .mockResolvedValueOnce(
        response({
          summary: "Relevant evidence supplied.",
          relevantEvidence: ["TypeScript"],
          uncertainties: [],
          questions: [],
        }),
      );
    const provider = createOpenAiCompatibleProvider(fetchImpl);

    await expect(provider.reviewOpportunity(connection, context)).resolves.toMatchObject({
      summary: "Relevant evidence supplied.",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    const secondBody = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body)) as Record<string, unknown>;
    expect(firstBody.response_format).toBeDefined();
    expect(secondBody.response_format).toBeUndefined();
    expect(secondBody.chat_template_kwargs).toEqual({ enable_thinking: false });
  });

  it("allows a local-compatible response beyond the old 30-second threshold", async () => {
    vi.useFakeTimers();
    expect(AI_PROVIDER_SAFETY_CEILING_MS).toBeGreaterThan(30_000);

    const request = extractionRequest();
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      await new Promise((resolve) => setTimeout(resolve, 31_000));
      expect(init?.signal?.aborted).toBe(false);
      return response({ proposals: [{ fieldRef, value: 1500 }] });
    });
    const provider = createOpenAiCompatibleProvider(fetchImpl);
    const pending = provider.extractJob(connection, request);

    await vi.advanceTimersByTimeAsync(31_000);
    await expect(pending).resolves.toEqual({
      proposals: [{ fieldRef, value: 1500 }],
      newFields: [],
    });
  });

  it("aborts an active local extraction when the task is cancelled", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      await new Promise<never>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      });
      throw new Error("unreachable");
    });
    const provider = createOpenAiCompatibleProvider(fetchImpl);
    const pending = provider.extractJob(connection, extractionRequest(), controller.signal);

    controller.abort();

    await expect(pending).rejects.toThrow("AI task cancelled.");
    expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("sends operation-scoped discovery references and reads typed proposals plus optional new fields", async () => {
    const request = extractionRequest();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        proposals: [{ fieldRef, value: 1500 }],
        newFields: [
          {
            label: "Base location",
            description: "Primary operating base",
            valueType: "text",
            cardinality: "one",
            choices: [],
            value: "Madrid",
          },
        ],
      }),
    );
    const provider = createOpenAiCompatibleProvider(fetchImpl);

    await expect(provider.extractJob(connection, request)).resolves.toEqual({
      proposals: [{ fieldRef, value: 1500 }],
      newFields: [
        {
          label: "Base location",
          description: "Primary operating base",
          valueType: "text",
          cardinality: "one",
          choices: [],
          value: "Madrid",
        },
      ],
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

  it("distinguishes unreachable, HTTP, malformed-envelope, invalid-JSON, and contract failures with inspectable evidence", async () => {
    const unreachable = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError("connect ECONNREFUSED")),
    );
    await expect(unreachable.reviewOpportunity(connection, context)).rejects.toMatchObject({
      diagnostic: expect.objectContaining({
        failureKind: "connection_unreachable",
        systemInstruction: expect.stringContaining("Review one opportunity"),
        userPayload: JSON.stringify(context),
        rawModelResponse: "",
      }),
    });

    const http = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(new Response("provider overloaded", { status: 503 })),
    );
    await expect(http.reviewOpportunity(connection, context)).rejects.toMatchObject({
      diagnostic: expect.objectContaining({
        failureKind: "provider_http_failure",
        rawModelResponse: "provider overloaded",
      }),
    });

    const envelope = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(new Response("not-an-envelope", { status: 200 })),
    );
    await expect(envelope.reviewOpportunity(connection, context)).rejects.toMatchObject({
      diagnostic: expect.objectContaining({
        failureKind: "provider_envelope_invalid",
        rawModelResponse: "not-an-envelope",
      }),
    });

    const invalidJson = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(contentResponse("small model prose instead of JSON")),
    );
    await expect(invalidJson.reviewOpportunity(connection, context)).rejects.toMatchObject({
      diagnostic: expect.objectContaining({
        failureKind: "model_response_invalid_json",
        rawModelResponse: "small model prose instead of JSON",
        validationError: expect.any(String),
      }),
    });

    const noncompliant = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(
        response({ summary: "Only one field; deliberately schema-noncompliant." }),
      ),
    );
    await expect(noncompliant.reviewOpportunity(connection, context)).rejects.toMatchObject({
      diagnostic: expect.objectContaining({
        failureKind: "operation_contract_invalid",
        rawModelResponse: expect.stringContaining("deliberately schema-noncompliant"),
        validationError: expect.stringContaining("relevantEvidence"),
      }),
    });
  });

  it("keeps raw exchange evidence on the typed provider error without putting credentials into diagnostics", async () => {
    const provider = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(contentResponse("not-json")),
    );

    try {
      await provider.reviewOpportunity(connection, context);
      throw new Error("Expected provider failure");
    } catch (reason) {
      expect(reason).toBeInstanceOf(AiProviderError);
      const failure = reason as AiProviderError;
      expect(failure.diagnostic).toMatchObject({
        operation: "opportunity_review",
        endpoint: "http://localhost:11434/v1",
        model: "Qwen3-8B-Q4_K_M",
        userPayload: JSON.stringify(context),
        rawModelResponse: "not-json",
      });
      expect(failure.message).not.toContain("connect ECONNREFUSED");
    }
  });

  it("rejects ratings, rankings, winner selection, and prescribed actions as contract failures", async () => {
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

    await expect(provider.reviewOpportunity(connection, context)).rejects.toMatchObject({
      diagnostic: expect.objectContaining({ failureKind: "operation_contract_invalid" }),
    });
  });
});
