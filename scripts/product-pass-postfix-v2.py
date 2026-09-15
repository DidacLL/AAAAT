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
