import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createOrOpenWorkspace } from "../src/main/workspace";
import { createWorkspaceAiProvider, listAiPromptDisclosures, resetAiPromptGuidance, saveAiPromptGuidance } from "../src/main/ai-prompt-service";
import type { AiConnectionStatus, ProviderOpportunityReviewContext } from "../src/shared/ai-contracts";

describe("AI prompt transparency", () => {
  it("shows the fixed effective instruction, appends user guidance, and resets to default", () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-prompts-"));
    createOrOpenWorkspace(root);
    const original = listAiPromptDisclosures(root).find((item) => item.operation === "cover_letter_draft")!;
    expect(original.userGuidance).toBe("");
    expect(original.effectiveInstruction).toBe(original.defaultInstruction);
    const customized = saveAiPromptGuidance(root, "cover_letter_draft", "Prefer short paragraphs.")
      .find((item) => item.operation === "cover_letter_draft")!;
    expect(customized.effectiveInstruction).toContain(original.defaultInstruction);
    expect(customized.effectiveInstruction).toContain("Prefer short paragraphs.");
    expect(customized.responseExpectation).toContain("JSON");
    const reset = resetAiPromptGuidance(root, "cover_letter_draft")
      .find((item) => item.operation === "cover_letter_draft")!;
    expect(reset.effectiveInstruction).toBe(reset.defaultInstruction);
  });

  it("uses the disclosed customized instruction as the actual provider system instruction", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-prompts-wire-"));
    createOrOpenWorkspace(root);
    saveAiPromptGuidance(root, "opportunity_review", "Keep the summary under three sentences.");
    const disclosure = listAiPromptDisclosures(root).find((item) => item.operation === "opportunity_review")!;
    let sentSystemInstruction = "";
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
      sentSystemInstruction = body.messages.find((message) => message.role === "system")?.content ?? "";
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify({
          summary: "Short review.", relevantEvidence: [], uncertainties: [], questions: [],
        }) } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const provider = createWorkspaceAiProvider(root, fetchImpl);
    const connection: AiConnectionStatus = {
      name: "Prompt fixture",
      endpoint: "http://127.0.0.1:11434/v1",
      model: "fixture-model",
    };
    const context: ProviderOpportunityReviewContext = {
      candidature: { label: "Fixture", information: [], sources: [] },
      profileItems: [],
    };

    await provider.reviewOpportunity(connection, context);
    expect(sentSystemInstruction).toBe(disclosure.effectiveInstruction);
    expect(sentSystemInstruction).toContain("Keep the summary under three sentences.");
  });

});
