import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createOrOpenWorkspace } from "../src/main/workspace";
import { listAiPromptDisclosures, resetAiPromptGuidance, saveAiPromptGuidance } from "../src/main/ai-prompt-service";

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
});
