// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createOpenAiCompatibleProvider } from "../src/main/ai-provider";
import type { AiConnectionStatus, ProviderDocumentAiContext } from "../src/shared/ai-contracts";

const connection: AiConnectionStatus = {
  name: "Local fixture",
  endpoint: "http://localhost:11434/v1",
  model: "fixture-model",
};

const context: ProviderDocumentAiContext = {
  candidature: {
    label: "Pilot opportunity",
    information: [
      {
        label: "Minimum flight hours",
        value: 1500,
      },
    ],
    sources: [
      {
        title: "Vacancy",
        url: "https://example.invalid/pilot",
        sourceText: "Minimum 1,500 total hours.",
      },
    ],
  },
  items: [
    {
      itemRef: "aaaat_document_00000000-0000-4000-8000-000000000710_1",
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
  it("sends the projected candidature and existing evidence and validates CV recommendations", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        recommendations: [
          { itemRef: context.items[0]?.itemRef, rationale: "Direct evidence match." },
        ],
      }),
    );
    const provider = createOpenAiCompatibleProvider(fetchImpl);

    await expect(provider.tailorCv(connection, context)).resolves.toEqual({
      recommendations: [
        { itemRef: context.items[0]?.itemRef, rationale: "Direct evidence match." },
      ],
    });
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[1]?.content).toBe(JSON.stringify(context));
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

  it("rejects provider output outside the structured cover-letter contract", async () => {
    const provider = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(
        response({
          recipient: "Hiring team",
          subject: "Application",
          bodyParagraphs: ["First paragraph."],
          closing: "Regards",
          unsupported: "extra",
        }),
      ),
    );

    await expect(provider.draftCoverLetter(connection, context)).rejects.toThrow(
      "invalid cover-letter draft",
    );
  });
});
