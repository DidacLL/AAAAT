// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createOpenAiCompatibleProvider } from "../src/main/ai-provider";
import type { AiConnectionStatus, FitProjectedContext } from "../src/shared/ai-contracts";

const connection: AiConnectionStatus = {
  name: "Local fixture",
  endpoint: "http://localhost:11434/v1",
  model: "fixture-model",
};

const context: FitProjectedContext = {
  candidature: {
    company: "Example",
    role: "Platform Engineer",
    location: "Remote",
    workMode: "remote",
    salaryText: "",
    source: "job board",
    sourceText: "Build TypeScript systems.",
  },
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
        focus: ["Ask about platform ownership"],
      }),
    );
    const provider = createOpenAiCompatibleProvider(fetchImpl);

    await expect(provider.assessFit(connection, context)).resolves.toEqual({
      fit: "strong",
      summary: "Strong match.",
      strengths: ["TypeScript"],
      gaps: [],
      focus: ["Ask about platform ownership"],
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "content-type": "application/json" });
    expect(init?.redirect).toBe("error");
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.model).toBe("fixture-model");
    expect(body.messages[1]?.content).toBe(JSON.stringify(context));
  });

  it("sends only the extraction request and validates source-grounded fields", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        company: "Example Corp",
        role: "Platform Engineer",
        location: "Madrid",
        workMode: "hybrid",
        salaryText: "€70k–€80k",
      }),
    );
    const provider = createOpenAiCompatibleProvider(fetchImpl);
    const request = {
      source: "Company careers",
      sourceUrl: "https://example.test/job/1",
      sourceText: "Example Corp seeks a hybrid Platform Engineer in Madrid for €70k–€80k.",
    };

    await expect(provider.extractJob(connection, request)).resolves.toEqual({
      company: "Example Corp",
      role: "Platform Engineer",
      location: "Madrid",
      workMode: "hybrid",
      salaryText: "€70k–€80k",
    });
    const [, init] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[1]?.content).toBe(JSON.stringify(request));
    expect(body.messages[0]?.content).toMatch(/empty string/i);
  });

  it("rejects malformed fit output instead of returning an untyped proposal", async () => {
    const provider = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "not-json" } }] }),
          { status: 200 },
        ),
      ),
    );

    await expect(provider.assessFit(connection, context)).rejects.toThrow(
      "invalid fit assessment",
    );
  });

  it("rejects extraction output containing unsupported extra fields", async () => {
    const provider = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(
        response({
          company: "Example Corp",
          role: "Platform Engineer",
          location: "",
          workMode: "",
          salaryText: "",
          status: "applied",
        }),
      ),
    );

    await expect(
      provider.extractJob(connection, { source: "", sourceUrl: "", sourceText: "Example job" }),
    ).rejects.toThrow("invalid job extraction");
  });

  it("does not expose raw provider response details on request failure", async () => {
    const provider = createOpenAiCompatibleProvider(
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response("internal-provider-detail", { status: 500 }),
      ),
    );

    await expect(provider.assessFit(connection, context)).rejects.toThrow(
      "configured local model provider rejected the request",
    );
  });
});
