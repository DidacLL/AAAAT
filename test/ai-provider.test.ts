// @vitest-environment node

import { createServer, type Server } from "node:http";
import { once } from "node:events";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AI_DEFAULT_INSTRUCTIONS,
  createOpenAiCompatibleProvider,
} from "../src/main/ai-provider";
import type {
  AiConnectionStatus,
  ProviderDocumentAiContext,
  ProviderOpportunityReviewContext,
} from "../src/shared/ai-contracts";

const connection: AiConnectionStatus = {
  name: "Local fixture",
  endpoint: "http://localhost:11434/v1",
  model: "fixture-model",
};

const candidature = {
  label: "Platform engineer",
  information: [{ label: "Location", value: "Barcelona" }],
  sources: [],
};

const reviewContext: ProviderOpportunityReviewContext = {
  candidature,
  profileItems: [{ kind: "experience", title: "Platform Engineer", description: "Operated production systems." }],
};

const documentContext: ProviderDocumentAiContext = {
  candidature,
  items: [{ itemRef: "aaaat_cv_1", kind: "experience", title: "Platform Engineer", description: "Operated production systems." }],
};

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
});

function response(content: unknown): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

async function delayedProvider(delayMs: number, headersImmediately = false): Promise<AiConnectionStatus> {
  const body = JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            summary: "Relevant role",
            relevantEvidence: ["Platform Engineer"],
            uncertainties: [],
            questions: [],
          }),
        },
      },
    ],
  });
  const server = createServer((_request, outgoing) => {
    const finish = () => {
      if (outgoing.destroyed) return;
      if (!headersImmediately) outgoing.writeHead(200, { "content-type": "application/json" });
      outgoing.end(body);
    };
    if (headersImmediately) {
      outgoing.writeHead(200, { "content-type": "application/json" });
      outgoing.flushHeaders();
    }
    setTimeout(finish, delayMs);
  });
  servers.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP test server address.");
  return {
    name: "Delayed local fixture",
    endpoint: `http://127.0.0.1:${address.port}/v1`,
    model: "fixture-model",
  };
}

describe("OpenAI-compatible provider", () => {
  it("uses the current bounded operation contracts without aggregate profile-variant machinery", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ summary: "Relevant role", relevantEvidence: ["Platform Engineer"], uncertainties: [], questions: [] }),
      )
      .mockResolvedValueOnce(
        response({ recommendations: [{ itemRef: "aaaat_cv_1", rationale: "Directly relevant experience." }] }),
      )
      .mockResolvedValueOnce(
        response({ recipient: "", subject: "Application", bodyParagraphs: ["I am applying for the role."], closing: "" }),
      );
    const provider = createOpenAiCompatibleProvider(fetchImpl);

    await expect(provider.reviewOpportunity(connection, reviewContext)).resolves.toMatchObject({
      summary: "Relevant role",
    });
    await expect(provider.tailorCv(connection, documentContext)).resolves.toEqual({
      recommendations: [{ itemRef: "aaaat_cv_1", rationale: "Directly relevant experience." }],
    });
    await expect(provider.draftCoverLetter(connection, documentContext)).resolves.toMatchObject({
      subject: "Application",
    });

    const bodies = fetchImpl.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as {
      messages: Array<{ role: string; content: string }>;
    });
    expect(bodies[0]?.messages[0]?.content).toBe(AI_DEFAULT_INSTRUCTIONS.opportunity_review);
    expect(bodies[1]?.messages[0]?.content).toBe(AI_DEFAULT_INSTRUCTIONS.cv_tailoring);
    expect(bodies[2]?.messages[0]?.content).toBe(AI_DEFAULT_INSTRUCTIONS.cover_letter_draft);
    expect(JSON.stringify(bodies)).not.toContain("variant_recommendation");
  });

  it("disables Undici parser timeouts so AAAAT's configured ceiling is authoritative", async () => {
    const symbol = Symbol.for("undici.globalDispatcher.1");
    const scope = globalThis as unknown as Record<PropertyKey, unknown>;
    const original = scope[symbol];
    const dispatch = vi.fn((options: Record<string, unknown>, handler: unknown) => {
      void options;
      void handler;
      return true;
    });
    scope[symbol] = { dispatch };

    try {
      const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
        const dispatcher = (init as RequestInit & {
          dispatcher?: { dispatch(options: Record<string, unknown>, handler: unknown): boolean };
        }).dispatcher;
        expect(dispatcher).toBeDefined();
        dispatcher?.dispatch({ headersTimeout: 300_000, bodyTimeout: 300_000 }, {});
        return response({ summary: "Relevant role", relevantEvidence: [], uncertainties: [], questions: [] });
      });
      const provider = createOpenAiCompatibleProvider(fetchImpl, 900_000);

      await expect(provider.reviewOpportunity(connection, reviewContext)).resolves.toMatchObject({
        summary: "Relevant role",
      });
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ headersTimeout: 0, bodyTimeout: 0 }),
        expect.anything(),
      );
    } finally {
      if (original === undefined) delete scope[symbol];
      else scope[symbol] = original;
    }
  });

  it("uses the corrected dispatcher on the real default Node fetch path", async () => {
    const delayedConnection = await delayedProvider(80);
    const provider = createOpenAiCompatibleProvider(undefined, 500);

    await expect(provider.reviewOpportunity(delayedConnection, reviewContext)).resolves.toMatchObject({
      summary: "Relevant role",
    });
  });

  it("reports AAAAT's own timeout when the default Node transport exceeds the configured ceiling", async () => {
    const delayedConnection = await delayedProvider(250);
    const provider = createOpenAiCompatibleProvider(undefined, 30);

    await expect(provider.reviewOpportunity(delayedConnection, reviewContext)).rejects.toMatchObject({
      message: expect.stringContaining("AAAAT's 15-minute safety limit"),
      diagnostic: expect.objectContaining({
        failureKind: "connection_unreachable",
        validationError: "The request exceeded AAAAT's provider safety timeout.",
      }),
    });
  });

  it("reports AAAAT's own timeout when the response body exceeds the configured ceiling", async () => {
    const delayedConnection = await delayedProvider(250, true);
    const provider = createOpenAiCompatibleProvider(undefined, 30);

    await expect(provider.reviewOpportunity(delayedConnection, reviewContext)).rejects.toMatchObject({
      message: expect.stringContaining("AAAAT's 15-minute safety limit"),
      diagnostic: expect.objectContaining({
        failureKind: "connection_unreachable",
        validationError: "The request exceeded AAAAT's provider safety timeout.",
      }),
    });
  });

  it("keeps provider failures inspectable, including nested transport causes", async () => {
    const cause = Object.assign(new Error("Headers Timeout Error"), {
      name: "HeadersTimeoutError",
      code: "UND_ERR_HEADERS_TIMEOUT",
    });
    const failure = new TypeError("fetch failed", { cause });
    const provider = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockRejectedValue(failure),
    );

    await expect(provider.reviewOpportunity(connection, reviewContext)).rejects.toMatchObject({
      diagnostic: expect.objectContaining({
        failureKind: "connection_unreachable",
        operation: "opportunity_review",
        endpoint: "http://localhost:11434/v1",
        model: "fixture-model",
        systemInstruction: AI_DEFAULT_INSTRUCTIONS.opportunity_review,
        userPayload: JSON.stringify(reviewContext),
        rawModelResponse: "",
        validationError: expect.stringContaining("UND_ERR_HEADERS_TIMEOUT"),
      }),
    });
  });

  it("distinguishes invalid model JSON from a valid provider envelope", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "not json" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const provider = createOpenAiCompatibleProvider(fetchImpl);

    await expect(provider.reviewOpportunity(connection, reviewContext)).rejects.toMatchObject({
      diagnostic: expect.objectContaining({
        failureKind: "model_response_invalid_json",
        rawModelResponse: "not json",
      }),
    });
  });
});
