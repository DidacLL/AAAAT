// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

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

function response(content: unknown): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
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

  it("keeps provider failures inspectable", async () => {
    const provider = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError("connect ECONNREFUSED")),
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
