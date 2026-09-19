import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createOrOpenWorkspace } from "../src/main/workspace";
import { createWorkspaceAiProvider, listAiPromptDisclosures, resetAiPromptInstruction, saveAiPromptInstruction } from "../src/main/ai-prompt-service";
import type { AiConnectionStatus, ProviderOpportunityReviewContext } from "../src/shared/ai-contracts";

describe("AI prompt transparency", () => {
  it("lets the user replace the operation instruction and reset to the shipped default", () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-prompts-"));
    createOrOpenWorkspace(root);
    const original = listAiPromptDisclosures(root).find((item) => item.operation === "cover_letter_draft")!;
    expect(original.instruction).toBe(original.defaultInstruction);
    expect(original.isDefault).toBe(true);
    const customized = saveAiPromptInstruction(root, "cover_letter_draft", "Use my own complete instruction.")
      .find((item) => item.operation === "cover_letter_draft")!;
    expect(customized.instruction).toBe("Use my own complete instruction.");
    expect(customized.instruction).not.toContain(original.defaultInstruction);
    expect(customized.isDefault).toBe(false);
    expect(customized.responseExpectation).toContain("JSON");
    const reset = resetAiPromptInstruction(root, "cover_letter_draft")
      .find((item) => item.operation === "cover_letter_draft")!;
    expect(reset.instruction).toBe(reset.defaultInstruction);
    expect(reset.isDefault).toBe(true);
  });

  it("uses the disclosed customized instruction as the actual provider system instruction", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-prompts-wire-"));
    createOrOpenWorkspace(root);
    saveAiPromptInstruction(root, "opportunity_review", "Return a concise review using only supplied facts.");
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
    expect(sentSystemInstruction).toBe(disclosure.instruction);
    expect(sentSystemInstruction).toBe("Return a concise review using only supplied facts.");
  });

});
