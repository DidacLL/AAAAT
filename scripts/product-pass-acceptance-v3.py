from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Expected snippet not found in {path}: {old[:120]!r}")
    target.write_text(text.replace(old, new, count), encoding="utf-8")


# Keep task-local wire references intentionally tiny for small-model context.
replace(
    "src/main/robust-job-extraction.ts",
    '''function operationScope(): string {
  return "aaaat_discovery";
}

''',
    "",
)
replace(
    "src/main/robust-job-extraction.ts",
    '  const scope = operationScope();\n',
    "",
)
replace(
    "src/main/robust-job-extraction.ts",
    '    const fieldRef = `${scope}_${index + 1}`;\n',
    '    const fieldRef = `f${index + 1}`;\n',
)
replace(
    "src/main/robust-job-extraction.ts",
    '      const choiceRef = `${fieldRef}_${choiceIndex + 1}`;\n',
    '      const choiceRef = `c${choiceIndex + 1}`;\n',
)

# Direct protocol acceptance tests: targeted requests expose only their mutation
# targets; obvious language duplicates are deterministically reused while an
# unrelated new information kind remains allowed.
test_path = ROOT / "test/robust-job-extraction.test.ts"
test = test_path.read_text(encoding="utf-8")
insert = r'''

  it("sends only explicitly targeted fields with compact task-local references", async () => {
    const root = await configuredWorkspace();
    const target = discoveryField(root, {
      label: "Target language",
      description: "Language required by the opportunity.",
      valueType: "text",
      cardinality: "many",
      choices: [],
      enabled: true,
    });
    discoveryField(root, {
      label: "Unrelated notice period",
      description: "Notice period if supplied.",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });

    let payload: { fields: Array<{ fieldRef: string; label: string; description: string; cardinality: string }> } | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
        payload = JSON.parse(body.messages.find((message) => message.role === "user")?.content ?? "{}") as typeof payload;
        return new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify({ proposals: [], newFields: [] }) } }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    await extractJobWithPartialOutcomes(
      root,
      { sourceTitle: "Targeted", sourceUrl: "", sourceText: "English required." },
      undefined,
      [target.definition.id],
    );

    expect(payload?.fields).toEqual([
      expect.objectContaining({
        fieldRef: "f1",
        label: "Target language",
        description: "Language required by the opportunity.",
        cardinality: "many",
      }),
    ]);
    expect(JSON.stringify(payload)).not.toContain("Unrelated notice period");
    expect(JSON.stringify(payload)).not.toContain(target.definition.id);
  });

  it("reuses Idiomas for Language Required and still allows genuinely unrelated new information", async () => {
    const root = await configuredWorkspace();
    const idiomas = discoveryField(root, {
      label: "Idiomas",
      description: "Languages required or useful for the opportunity.",
      valueType: "text",
      cardinality: "many",
      choices: [],
      enabled: true,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
        const payload = JSON.parse(
          body.messages.find((message) => message.role === "user")?.content ?? "{}",
        ) as { fields: Array<{ fieldRef: string; label: string; description: string; cardinality: string }> };
        expect(payload.fields).toEqual([
          expect.objectContaining({
            fieldRef: "f1",
            label: "Idiomas",
            description: "Languages required or useful for the opportunity.",
            cardinality: "many",
          }),
        ]);
        const modelResult = {
          proposals: [],
          newFields: [
            {
              label: "Language Required",
              description: "Language required by the offer.",
              valueType: "text",
              cardinality: "many",
              choices: [],
              value: "English",
            },
            {
              label: "Interview format",
              description: "Interview format stated by the offer.",
              valueType: "text",
              cardinality: "one",
              choices: [],
              value: "Panel interview",
            },
          ],
        };
        return new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify(modelResult) } }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const result = await extractJobWithPartialOutcomes(
      root,
      { sourceTitle: "Reuse", sourceUrl: "", sourceText: "English required. Panel interview." },
      undefined,
      [idiomas.definition.id],
    );

    expect(result.proposals).toContainEqual({ fieldId: idiomas.definition.id, value: ["English"] });
    expect(result.newFields).toEqual([
      expect.objectContaining({ label: "Interview format", value: "Panel interview" }),
    ]);
    expect(result.newFields.some((field) => field.label === "Language Required")).toBe(false);
  });
'''
pos = test.rfind("\n});")
if pos < 0:
    raise RuntimeError("Could not find robust extraction describe terminator")
test_path.write_text(test[:pos] + insert + test[pos:], encoding="utf-8")

# Prove customized guidance is the exact system instruction sent to the provider,
# not merely settings/disclosure text.
prompt_path = ROOT / "test/ai-prompt-service.test.ts"
prompt = prompt_path.read_text(encoding="utf-8")
prompt = prompt.replace(
    'import { describe, expect, it } from "vitest";\n',
    'import { describe, expect, it, vi } from "vitest";\n',
    1,
)
prompt = prompt.replace(
    'import { listAiPromptDisclosures, resetAiPromptGuidance, saveAiPromptGuidance } from "../src/main/ai-prompt-service";\n',
    'import { createWorkspaceAiProvider, listAiPromptDisclosures, resetAiPromptGuidance, saveAiPromptGuidance } from "../src/main/ai-prompt-service";\nimport type { AiConnectionStatus, ProviderOpportunityReviewContext } from "../src/shared/ai-contracts";\n',
    1,
)
prompt_insert = r'''

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
'''
pos = prompt.rfind("\n});")
if pos < 0:
    raise RuntimeError("Could not find prompt describe terminator")
prompt_path.write_text(prompt[:pos] + prompt_insert + prompt[pos:], encoding="utf-8")

# Extend the existing packaged journey to exercise the first-run demo entry,
# readable retained Offer, advanced prompt disclosure/customization and reset.
desktop_path = ROOT / "test/desktop/packaged-app.spec.ts"
desktop = desktop_path.read_text(encoding="utf-8")

# Add a chooser helper for the demo folder dialog.
needle = '''function resizeLinuxAppWindow(width: number, height: number): { width: number; height: number } {'''
helper = r'''function chooseLinuxDemoDirectory(): void {
  execFileSync(
    "bash",
    [
      "-lc",
      [
        "set -eu",
        "window=''",
        "for attempt in $(seq 1 100); do",
        "  window=$(xdotool search --onlyvisible --name 'Create a demo AAAAT workspace' 2>/dev/null | tail -n 1 || true)",
        "  if [ -n \"$window\" ]; then break; fi",
        "  sleep 0.1",
        "done",
        "test -n \"$window\"",
        "xdotool windowactivate --sync \"$window\"",
        "eval \"$(xdotool getwindowgeometry --shell \"$window\")\"",
        "xdotool mousemove --window \"$window\" $((WIDTH - 70)) $((HEIGHT - 35)) click 1",
      ].join("\n"),
    ],
    { stdio: "inherit" },
  );
}

'''
if needle not in desktop:
    raise RuntimeError("Packaged resize helper anchor missing")
desktop = desktop.replace(needle, helper + needle, 1)

# The complete candidature must now visibly read like the retained opportunity.
desktop = desktop.replace(
    '  await expect(complete.getByRole("region", { name: "Candidature information" })).toBeVisible();\n',
    '  await expect(complete.getByRole("region", { name: "Retained offer" })).toBeVisible();\n  await expect(complete.getByRole("region", { name: "Candidature information" })).toBeVisible();\n',
    1,
)

# First-run demo entry and bounded API surface.
desktop = desktop.replace(
    '    await expect(running.page.getByText(/works without AI/i)).toBeVisible();\n',
    '    await expect(running.page.getByText(/works without AI/i)).toBeVisible();\n    await expect(running.page.getByRole("button", { name: "Try with demo data" })).toBeVisible();\n',
    1,
)
desktop = desktop.replace(
    '      workspaceChoose: typeof window.aaaat.workspace.choose,\n',
    '      workspaceChoose: typeof window.aaaat.workspace.choose,\n      workspaceCreateDemo: typeof window.aaaat.workspace.createDemo,\n      workspaceReset: typeof window.aaaat.workspace.reset,\n      workspaceStatus: typeof window.aaaat.workspace.status,\n      aiPromptList: typeof window.aaaat.aiPrompts.list,\n',
    1,
)

old_create = '''    await running.page.getByRole("button", { name: "Create workspace" }).click();
    chooseLinuxDirectory();
    await expect(running.page.getByText(ownedWorkspace)).toBeVisible();
    await expect(running.page.getByRole("heading", { name: "Candidatures", exact: true })).toBeVisible();

    await proveAcceptedShellAtWindowSize(running.page, 1200, 800);
    await proveAcceptedShellAtWindowSize(running.page, 720, 600);
'''
new_create = '''    await running.page.getByRole("button", { name: "Try with demo data" }).click();
    chooseLinuxDemoDirectory();
    await expect(running.page.getByText(ownedWorkspace)).toBeVisible();
    await expect(running.page.getByText("Demo workspace", { exact: true })).toBeVisible();
    await expect(running.page.getByRole("heading", { name: "Candidatures", exact: true })).toBeVisible();
    const demoCorpus = running.page.locator('[aria-label="Candidature corpus Focus"]');
    await expect(demoCorpus.getByRole("button", { name: /Northstar Labs/i }).first()).toBeVisible();
    await demoCorpus.getByRole("button", { name: /Northstar Labs/i }).first().click();
    await running.page.getByRole("region", { name: "Candidature Focus", exact: true }).getByRole("button", { name: "All details" }).click();
    const demoComplete = running.page.getByRole("region", { name: "Complete candidature" });
    const demoOffer = demoComplete.getByRole("region", { name: "Retained offer" });
    await expect(demoOffer).toContainText("English is required");
    await expect(demoOffer.getByText("Original Source")).toBeVisible();
    await demoComplete.getByRole("button", { name: "Back" }).click();

    await running.page.getByRole("button", { name: "Settings" }).click();
    await running.page.getByRole("button", { name: /AI connections/ }).click();
    const advanced = running.page.locator("summary").filter({ hasText: "Advanced: AI instructions and context" });
    await advanced.click();
    const coverPrompt = running.page.locator(".document-card").filter({ hasText: "Cover letter draft" }).first();
    await coverPrompt.getByLabel("Optional guidance").fill("Prefer short paragraphs in packaged verification.");
    await coverPrompt.getByRole("button", { name: "Save guidance" }).click();
    await coverPrompt.locator("summary").filter({ hasText: "Effective final instruction" }).click();
    await expect(coverPrompt).toContainText("Prefer short paragraphs in packaged verification.");
    await running.page.getByRole("button", { name: "Back to Settings" }).click();
    await running.page.getByRole("button", { name: "Workspace", exact: true }).click();
    const reset = running.page.getByRole("region", { name: "Reset workspace" });
    await expect(reset.getByRole("button", { name: "Reset workspace" })).toBeVisible();
    running.page.once("dialog", (dialog) => void dialog.accept());
    await reset.getByRole("button", { name: "Reset workspace" }).click();
    await expect(running.page.getByRole("heading", { name: "Candidatures", exact: true })).toBeVisible();
    await expect(running.page.getByText("No candidatures yet")).toBeVisible();

    const resetDatabase = new DatabaseSync(path.join(ownedWorkspace, "workspace.sqlite"), { readOnly: true });
    try {
      expect(resetDatabase.prepare("SELECT COUNT(*) AS count FROM candidatures").get()).toEqual({ count: 0 });
      expect(resetDatabase.prepare("SELECT COUNT(*) AS count FROM profile_items").get()).toEqual({ count: 0 });
      expect(resetDatabase.prepare("SELECT COUNT(*) AS count FROM documents").get()).toEqual({ count: 0 });
      expect(resetDatabase.prepare("SELECT value FROM workspace_metadata WHERE key = 'workspace.demo'").get()).toBeUndefined();
      expect(resetDatabase.prepare("SELECT value FROM workspace_metadata WHERE key = 'ai.prompt.guidance.cover_letter_draft'").get()).toBeUndefined();
    } finally {
      resetDatabase.close();
    }

    await proveAcceptedShellAtWindowSize(running.page, 1200, 800);
    await proveAcceptedShellAtWindowSize(running.page, 720, 600);
'''
if old_create not in desktop:
    raise RuntimeError("Packaged create-workspace block missing")
desktop = desktop.replace(old_create, new_create, 1)

desktop_path.write_text(desktop, encoding="utf-8")
