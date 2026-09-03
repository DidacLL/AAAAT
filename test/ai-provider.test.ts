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

describe("OpenAI-compatible fit provider", () => {
  it("sends one keyless chat-completions request and validates the typed result", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  fit: "strong",
                  summary: "Strong match.",
                  strengths: ["TypeScript"],
                  gaps: [],
                  focus: ["Ask about platform ownership"],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
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
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.model).toBe("fixture-model");
    expect(body.messages[1]?.content).toBe(JSON.stringify(context));
  });

  it("rejects malformed model output instead of returning an untyped proposal", async () => {
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
