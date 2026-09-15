from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Expected snippet not found in {path}: {old[:120]!r}")
    target.write_text(text.replace(old, new, count), encoding="utf-8")


# Keep the fixed AAAAT defaults literal. The first-pass patch replaced the first
# occurrence of four literals, which was inside the defaults map rather than the
# provider methods.
provider_path = ROOT / "src/main/ai-provider.ts"
provider = provider_path.read_text(encoding="utf-8")
marker = "export function createOpenAiCompatibleProvider("
prefix, suffix = provider.split(marker, 1)
operations = {
    "opportunity_review": "Review one opportunity using only the supplied context. Return only the final JSON object with keys summary, relevantEvidence, uncertainties, questions. Do not expose chain-of-thought or reasoning. Do not rate, score, rank, choose a winner, prescribe next actions, or define a career workflow. Missing candidature information is normal; do not invent facts.",
    "variant_recommendation": "Choose exactly one supplied profile variant for the supplied candidature. Return only the final JSON object with keys variantRef and rationale. Do not expose chain-of-thought or reasoning. Never invent a variantRef or propose creating a new variant.",
    "cv_tailoring": "Recommend the strongest supplied career items for this candidature. Return only the final JSON object with key recommendations, an array of objects with itemRef and rationale. Do not expose chain-of-thought or reasoning. Use only itemRef values supplied in context. Do not rewrite or invent career facts.",
    "cover_letter_draft": "Draft a concise cover letter using only the supplied opportunity and career evidence. Return only the final JSON object with keys recipient, subject, bodyParagraphs, closing. Do not expose chain-of-thought or reasoning. Do not invent career facts or contact details; use empty strings when recipient or closing is unsupported.",
}
for operation, instruction in operations.items():
    broken = f'{operation}: instructionFor("{operation}"),'
    literal = f'{operation}: {instruction!r},'.replace("'", '"')
    if broken not in prefix:
        raise RuntimeError(f"Expected broken default for {operation}")
    prefix = prefix.replace(broken, literal, 1)
    quoted = f'"{instruction}"'
    if quoted not in suffix:
        raise RuntimeError(f"Expected provider method literal for {operation}")
    suffix = suffix.replace(quoted, f'instructionFor("{operation}")', 1)
provider_path.write_text(prefix + marker + suffix, encoding="utf-8")

# Every user-facing AI operation must use workspace prompt guidance by default.
service_path = ROOT / "src/main/ai-service.ts"
service = service_path.read_text(encoding="utf-8")
service = service.replace(
    "provider: ModelProvider = createOpenAiCompatibleProvider(),",
    "provider: ModelProvider = createWorkspaceAiProvider(rootPath),",
)
service_path.write_text(service, encoding="utf-8")

# Type the prompt reset operation explicitly.
replace(
    "src/preload/ai-prompt-api.ts",
    'import { aiOperationSchema } from "../shared/ai-connection-contracts";\n',
    'import { aiOperationSchema, type AiOperation } from "../shared/ai-connection-contracts";\n',
)
replace(
    "src/preload/ai-prompt-api.ts",
    "    reset: async (operation) =>",
    "    reset: async (operation: AiOperation) =>",
)

# Register the new main-process IPC module alongside the existing bounded IPC modules.
replace(
    "src/main/entry.ts",
    '    import("./profile-ai-context-ipc"),\n',
    '    import("./profile-ai-context-ipc"),\n    import("./ai-prompt-ipc"),\n',
)

# Browser preview implements the expanded API instead of weakening types.
replace(
    "src/renderer/main.tsx",
    'import type { AiConnectionDesktopApi } from "../shared/ai-connection-contracts";\n',
    'import type { AiConnectionDesktopApi } from "../shared/ai-connection-contracts";\nimport type { AiPromptDesktopApi } from "../shared/ai-prompt-contracts";\n',
)
replace(
    "src/renderer/main.tsx",
    "  AiConnectionDesktopApi &\n  ArtifactDesktopApi &",
    "  AiConnectionDesktopApi &\n  AiPromptDesktopApi &\n  ArtifactDesktopApi &",
)
replace(
    "src/renderer/main.tsx",
    '      choose: async () => ({ rootPath: "/Users/example/AAAAT Workspace" }),\n',
    '      choose: async () => ({ rootPath: "/Users/example/AAAAT Workspace" }),\n      createDemo: async () => ({ rootPath: "/Users/example/AAAAT Demo Workspace" }),\n      reset: async () => ({ rootPath: "/Users/example/AAAAT Workspace" }),\n      status: async () => ({ demo: false }),\n',
)
replace(
    "src/renderer/main.tsx",
    "    artifacts: Object.freeze({\n",
    "    aiPrompts: Object.freeze({\n      list: async () => [],\n      save: async () => [],\n      reset: async () => [],\n    }),\n    artifacts: Object.freeze({\n",
)

# App tests keep their narrow workspace-state setup but satisfy the real API.
replace(
    "test/App.test.tsx",
    "  workspace: { current, choose },\n",
    "  workspace: {\n    current,\n    choose,\n    createDemo: async () => readyWorkspace,\n    reset: async () => readyWorkspace,\n    status: async () => ({ demo: false }),\n  },\n",
)

# The demo marker is cosmetic. Missing/failed status lookup must never make a valid
# remembered workspace appear unavailable, including in narrow test/preview APIs.
replace(
    "src/renderer/App.tsx",
    '        if (currentWorkspace) void window.aaaat.workspace.status().then((status) => { if (active) setDemoWorkspace(status.demo); });\n',
    '''        if (currentWorkspace) {
          const status = (window.aaaat.workspace as typeof window.aaaat.workspace & { status?: () => Promise<{ demo: boolean }> }).status;
          if (status) void status().then((next) => { if (active) setDemoWorkspace(next.demo); }).catch(() => { if (active) setDemoWorkspace(false); });
        }
''',
)
replace(
    "src/renderer/App.tsx",
    '      setDemoWorkspace((await window.aaaat.workspace.status()).demo);\n      setWorkspacePhase("ready");\n',
    '''      const status = (window.aaaat.workspace as typeof window.aaaat.workspace & { status?: () => Promise<{ demo: boolean }> }).status;
      setDemoWorkspace(status ? await status().then((next) => next.demo).catch(() => false) : false);
      setWorkspacePhase("ready");
''',
)

# Prompt transparency is an additive advanced panel. Production preload always
# provides the API, but old/narrow renderer mocks should not crash unrelated views.
panel_path = ROOT / "src/renderer/AiPromptTransparencyPanel.tsx"
panel = panel_path.read_text(encoding="utf-8")
panel = panel.replace(
    '  const [busy, setBusy] = useState<string | null>(null);\n\n  useEffect(() => {',
    '  const [busy, setBusy] = useState<string | null>(null);\n  const promptApi = (window.aaaat as typeof window.aaaat & { aiPrompts?: typeof window.aaaat.aiPrompts }).aiPrompts;\n\n  useEffect(() => {',
    1,
)
panel = panel.replace(
    '    let active = true;\n    void window.aaaat.aiPrompts.list().then((next) => {',
    '    if (!promptApi) return undefined;\n    let active = true;\n    void promptApi.list().then((next) => {',
    1,
)
panel = panel.replace('  }, []);', '  }, [promptApi]);', 1)
panel = panel.replace(
    '  return (\n    <details className="profile-column ai-prompt-transparency">',
    '  if (!promptApi) return null;\n\n  return (\n    <details className="profile-column ai-prompt-transparency">',
    1,
)
panel = panel.replace('void window.aaaat.aiPrompts.save(', 'void promptApi.save(')
panel = panel.replace('void window.aaaat.aiPrompts.reset(', 'void promptApi.reset(')
panel_path.write_text(panel, encoding="utf-8")

# Demo ordering is presentation-driven, so assert retained raw HTML across all
# demo Sources rather than assuming a candidature list order.
demo_test = ROOT / "test/demo-workspace.test.ts"
demo = demo_test.read_text(encoding="utf-8")
demo = demo.replace(
    '    expect(listCandidatureSources(root, candidatures[0]!.id)[0]?.sourceText).toContain("<main>");\n',
    '''    const rawSources = candidatures.flatMap((candidature) =>
      listCandidatureSources(root, candidature.id).map((source) => source.sourceText),
    );
    expect(rawSources.some((source) => source.includes("<main>"))).toBe(true);
    expect(rawSources.some((source) => source.includes("<article>"))).toBe(true);
''',
    1,
)
demo_test.write_text(demo, encoding="utf-8")
