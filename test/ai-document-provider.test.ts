// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createOpenAiCompatibleProvider } from "../src/main/ai-provider";
import type { AiConnectionStatus, DocumentAiContext } from "../src/shared/ai-contracts";

const connection: AiConnectionStatus = {
  name: "Local fixture",
  endpoint: "http://localhost:11434/v1",
  model: "fixture-model",
};

const context: DocumentAiContext = {
  candidature: {
    company: "Example Corp",
    role: "Platform Engineer",
    location: "Madrid",
    workMode: "hybrid",
    salaryText: "",
    source: "Careers",
    sourceText: "Build reliable TypeScript services.",
  },
  items: [
    {
      id: "00000000-0000-4000-8000-000000000010",
      kind: "skill",
      title: "TypeScript",
    },
  ],
};

function response(content: unknown): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("document AI provider operations", () => {
  it("validates CV recommendations against the strict proposal shape", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        recommendations: [
          {
            itemId: context.items[0]?.id,
            rationale: "Direct role match.",
          },
        ],
      }),
    );
    const provider = createOpenAiCompatibleProvider(fetchImpl);

    await expect(provider.tailorCv(connection, context)).resolves.toMatchObject({
      recommendations: [{ rationale: "Direct role match." }],
    });
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[1]?.content).toBe(JSON.stringify(context));
    expect(body.messages[0]?.content).toMatch(/existing career items/i);
  });

  it("validates structured cover-letter drafts", async () => {
    const provider = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(
        response({
          recipient: "Hiring team",
          subject: "Application",
          bodyParagraphs: ["First paragraph.", "Second paragraph."],
          closing: "Regards",
        }),
      ),
    );

    await expect(provider.draftCoverLetter(connection, context)).resolves.toEqual({
      recipient: "Hiring team",
      subject: "Application",
      bodyParagraphs: ["First paragraph.", "Second paragraph."],
      closing: "Regards",
    });
  });

  it("rejects unsupported cover-letter fields", async () => {
    const provider = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(
        response({
          recipient: "Hiring team",
          subject: "Application",
          bodyParagraphs: ["First paragraph."],
          closing: "Regards",
          inventedCareerFact: "not allowed",
        }),
      ),
    );

    await expect(provider.draftCoverLetter(connection, context)).rejects.toThrow(
      "invalid cover-letter draft",
    );
  });
});
