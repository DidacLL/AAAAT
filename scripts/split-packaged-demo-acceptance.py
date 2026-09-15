from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "test/desktop/packaged-app.spec.ts"
text = path.read_text(encoding="utf-8")

# Restore the established normal-workspace chooser used by the security journey.
demo_helper = "function chooseLinuxDemoDirectory(): void {\n"
if demo_helper not in text:
    raise RuntimeError("demo chooser helper anchor missing")
normal_helper = r'''function chooseLinuxDirectory(): void {
  execFileSync(
    "bash",
    [
      "-lc",
      [
        "set -eu",
        "window=''",
        "for attempt in $(seq 1 100); do",
        "  window=$(xdotool search --onlyvisible --name 'Create or select an AAAAT workspace' 2>/dev/null | tail -n 1 || true)",
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
text = text.replace(demo_helper, normal_helper + demo_helper, 1)

security_anchor = 'test("packaged desktop preserves security gates and required bounded capabilities", async () => {\n'
if security_anchor not in text:
    raise RuntimeError("security test anchor missing")

demo_test = r'''test("packaged demo workspace exposes offer, prompt guidance, and reset", async () => {
  test.skip(process.platform !== "linux", "Linux chooser automation exercises the packaged demo path");
  const isolatedUserData = mkdtempSync(path.join(tmpdir(), "aaaat-demo-packaged-"));
  const ownedWorkspace = mkdtempSync(path.join(tmpdir(), "aaaat-demo-owned-"));
  const linuxHome = prepareLinuxChooserHome(ownedWorkspace);
  let running: RunningApp | undefined;

  try {
    running = await startPackagedApp(isolatedUserData, linuxHome);
    await expect(running.page.getByRole("button", { name: "Try with demo data" })).toBeVisible();
    await running.page.getByRole("button", { name: "Try with demo data" }).click();
    chooseLinuxDemoDirectory();

    await expect(running.page.getByText(ownedWorkspace)).toBeVisible();
    await expect(running.page.getByText("Demo workspace", { exact: true })).toBeVisible();
    const demoCorpus = running.page.locator('[aria-label="Candidature corpus Focus"]');
    await expect(demoCorpus.getByRole("button", { name: /Northstar Labs/i }).first()).toBeVisible();
    await demoCorpus.getByRole("button", { name: /Northstar Labs/i }).first().click();
    await running.page
      .getByRole("region", { name: "Candidature Focus", exact: true })
      .getByRole("button", { name: "All details" })
      .click();
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

    const database = new DatabaseSync(path.join(ownedWorkspace, "workspace.sqlite"), { readOnly: true });
    try {
      expect(database.prepare("SELECT COUNT(*) AS count FROM candidatures").get()).toEqual({ count: 0 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM profile_items").get()).toEqual({ count: 0 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM documents").get()).toEqual({ count: 0 });
      expect(database.prepare("SELECT value FROM workspace_metadata WHERE key = 'workspace.demo'").get()).toBeUndefined();
      expect(database.prepare("SELECT value FROM workspace_metadata WHERE key = 'ai.prompt.guidance.cover_letter_draft'").get()).toBeUndefined();
    } finally {
      database.close();
    }
  } finally {
    if (running) await stopPackagedApp(running);
    rmSync(isolatedUserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(ownedWorkspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    rmSync(linuxHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

'''
text = text.replace(security_anchor, demo_test + security_anchor, 1)
text = text.replace(security_anchor + "  test.setTimeout(120_000);\n", security_anchor, 1)

start_marker = '    await running.page.getByRole("button", { name: "Try with demo data" }).click();\n'
start = text.find(start_marker, text.find(security_anchor))
end_marker = '    await proveAcceptedShellAtWindowSize(running.page, 1200, 800);\n'
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise RuntimeError("combined demo block anchors missing")
normal_setup = '''    await running.page.getByRole("button", { name: "Create workspace" }).click();
    chooseLinuxDirectory();
    await expect(running.page.getByText(ownedWorkspace)).toBeVisible();
    await expect(running.page.getByRole("heading", { name: "Candidatures", exact: true })).toBeVisible();

'''
text = text[:start] + normal_setup + text[end:]

path.write_text(text, encoding="utf-8")
