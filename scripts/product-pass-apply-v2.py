from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Expected snippet not found in {path}: {old[:160]!r}")
    target.write_text(text.replace(old, new, count), encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


# Workspace demo/reset contracts.
replace(
    "src/shared/contracts.ts",
    '  workspaceCurrent: "aaaat:workspace-current",\n  workspaceChoose: "aaaat:workspace-choose",\n',
    '  workspaceCurrent: "aaaat:workspace-current",\n  workspaceChoose: "aaaat:workspace-choose",\n  workspaceCreateDemo: "aaaat:workspace-create-demo",\n  workspaceReset: "aaaat:workspace-reset",\n  workspaceStatus: "aaaat:workspace-status",\n',
)
replace(
    "src/shared/contracts.ts",
    'export type WorkspaceInfo = z.infer<typeof workspaceInfoSchema>;\n\n',
    'export type WorkspaceInfo = z.infer<typeof workspaceInfoSchema>;\nexport const workspaceStatusSchema = z.object({ demo: z.boolean() }).strict();\nexport type WorkspaceStatus = z.infer<typeof workspaceStatusSchema>;\n\n',
)
replace(
    "src/shared/contracts.ts",
    '  readonly workspace: {\n    readonly current: () => Promise<WorkspaceInfo | null>;\n    readonly choose: (choice: WorkspaceChoice) => Promise<WorkspaceInfo | null>;\n  };',
    '  readonly workspace: {\n    readonly current: () => Promise<WorkspaceInfo | null>;\n    readonly choose: (choice: WorkspaceChoice) => Promise<WorkspaceInfo | null>;\n    readonly createDemo: () => Promise<WorkspaceInfo | null>;\n    readonly reset: () => Promise<WorkspaceInfo>;\n    readonly status: () => Promise<WorkspaceStatus>;\n  };',
)
replace(
    "src/preload/api.ts",
    '  workspaceChoiceSchema,\n  type DesktopApi,\n',
    '  workspaceChoiceSchema,\n  workspaceInfoSchema,\n  workspaceStatusSchema,\n  type DesktopApi,\n',
)
replace(
    "src/preload/api.ts",
    '    choose: async (choice: "create" | "open") =>\n      optionalWorkspaceInfoSchema.parse(\n        await invoke(channels.workspaceChoose, workspaceChoiceSchema.parse(choice)),\n      ),\n',
    '    choose: async (choice: "create" | "open") =>\n      optionalWorkspaceInfoSchema.parse(\n        await invoke(channels.workspaceChoose, workspaceChoiceSchema.parse(choice)),\n      ),\n    createDemo: async () =>\n      optionalWorkspaceInfoSchema.parse(await invoke(channels.workspaceCreateDemo)),\n    reset: async () => workspaceInfoSchema.parse(await invoke(channels.workspaceReset)),\n    status: async () => workspaceStatusSchema.parse(await invoke(channels.workspaceStatus)),\n',
)

# Reset owns only known AAAAT workspace data and rebuilds current schema.
replace(
    "src/main/workspace.ts",
    'export function withWorkspaceDatabase<T>(\n',
    '''export function resetWorkspace(rootPath: string): WorkspaceInfo {
  const canonicalPath = canonicalizeWorkspaceRoot(rootPath);
  verifyExistingWorkspace(canonicalPath);
  for (const target of [
    databasePathFor(canonicalPath),
    databasePathFor(canonicalPath) + "-wal",
    databasePathFor(canonicalPath) + "-shm",
    path.join(canonicalPath, "documents"),
    path.join(canonicalPath, "artifacts"),
    path.join(canonicalPath, "ai-connection.json"),
  ]) {
    rmSync(target, { recursive: true, force: true });
  }
  return initializeNewWorkspace(canonicalPath);
}

export function workspaceIsDemo(rootPath: string): boolean {
  return withWorkspaceDatabase(rootPath, (database) => {
    const row = database.prepare("SELECT value FROM workspace_metadata WHERE key = ?")
      .get("workspace.demo") as { value: string } | undefined;
    return row?.value === "1";
  });
}

export function withWorkspaceDatabase<T>(
''',
)

write(
    "src/main/demo-workspace.ts",
    r'''import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";

import { createDocument } from "./document-service";
import { createOrOpenWorkspace, withWorkspaceDatabase } from "./workspace";

const orgField = "00000000-0000-4000-8000-000000000101";
const roleField = "00000000-0000-4000-8000-000000000102";
const locationField = "00000000-0000-4000-8000-000000000103";
const compensationField = "00000000-0000-4000-8000-000000000104";
const notesField = "00000000-0000-4000-8000-000000000106";

export function createDemoWorkspace(rootPath: string) {
  if (readdirSync(rootPath).length > 0) {
    throw new Error("Demo data can only be created in an empty folder.");
  }
  const workspace = createOrOpenWorkspace(rootPath);
  const now = new Date().toISOString();
  const first = randomUUID();
  const second = randomUUID();
  const languageField = randomUUID();
  const tags = [
    { id: randomUUID(), name: "Remote", definition: "Remote-friendly opportunity." },
    { id: randomUUID(), name: "Backend", definition: "Backend/platform engineering work." },
    { id: randomUUID(), name: "ML", definition: "Machine-learning product work." },
  ];

  withWorkspaceDatabase(workspace.rootPath, (database) => {
    database.exec("BEGIN IMMEDIATE");
    try {
      database.prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)")
        .run("workspace.demo", "1");
      database.prepare(`INSERT INTO candidature_fields(
        id, system_key, label, description, value_type, cardinality, options_json, enabled, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, 'text', 'many', '[]', 1, ?, ?)`)
        .run(languageField, "Languages", "Languages required or useful for the opportunity.", now, now);
      database.prepare(`INSERT INTO candidature_field_preferences(
        field_id, focus_visible, focus_order, focus_prominence, identity_order, ai_discovery, ai_context_mode
      ) VALUES (?, 1, 4, 'compact', NULL, 1, 'expose')`).run(languageField);

      const insertCandidature = database.prepare(
        "INSERT INTO candidatures(id, archived, opportunity_research_selected, created_at, updated_at) VALUES (?, 0, 0, ?, ?)",
      );
      insertCandidature.run(first, now, now);
      insertCandidature.run(second, now, now);
      const value = database.prepare(`INSERT INTO candidature_field_values(
        candidature_id, field_id, value_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)`);
      const setValues = (id: string, rows: readonly [string, unknown][]) => {
        for (const [fieldId, item] of rows) value.run(id, fieldId, JSON.stringify(item), now, now);
      };
      setValues(first, [
        [orgField, "Northstar Labs"], [roleField, "Platform Engineer"], [locationField, "Spain · Remote"],
        [compensationField, "€55k–€70k"], [languageField, ["English", "Spanish"]],
        [notesField, "Fictional demo candidature. Recruiter screen expected next week."],
      ]);
      setValues(second, [
        [orgField, "Lumen Health"], [roleField, "ML Product Engineer"], [locationField, "Barcelona · Hybrid"],
        [languageField, ["English"]], [notesField, "Fictional demo candidature. Portfolio link requested."],
      ]);
      const source = database.prepare(`INSERT INTO candidature_sources(
        id, candidature_id, kind, title, url, source_text, created_at, updated_at
      ) VALUES (?, ?, 'job_posting', ?, ?, ?, ?, ?)`);
      source.run(randomUUID(), first, "Platform Engineer — Northstar Labs", "https://example.test/northstar-platform",
        `<main><h1>Platform Engineer</h1><p>Northstar Labs builds developer infrastructure for distributed teams.</p><p>We are looking for experience with TypeScript, APIs, PostgreSQL and production observability.</p><p>English is required. Spanish is useful.</p><p>Remote within Spain. Salary €55,000–€70,000.</p></main>`, now, now);
      source.run(randomUUID(), second, "ML Product Engineer — Lumen Health", "https://example.test/lumen-ml",
        `<article><h1>ML Product Engineer</h1><p>Build user-facing ML workflows with Python and TypeScript.</p><p>Experience shipping models is valued; healthcare experience is helpful but not required.</p><p>English required. Hybrid in Barcelona.</p></article>`, now, now);

      for (const tag of tags) {
        database.prepare(`INSERT INTO tags(id, name, definition, notes, aliases_json, created_at, updated_at)
          VALUES (?, ?, ?, '', '[]', ?, ?)`).run(tag.id, tag.name, tag.definition, now, now);
      }
      database.prepare("INSERT INTO candidature_tags(candidature_id, tag_id) VALUES (?, ?)").run(first, tags[0]!.id);
      database.prepare("INSERT INTO candidature_tags(candidature_id, tag_id) VALUES (?, ?)").run(first, tags[1]!.id);
      database.prepare("INSERT INTO candidature_tags(candidature_id, tag_id) VALUES (?, ?)").run(second, tags[2]!.id);

      const profile = database.prepare(`INSERT INTO profile_items(
        id, kind, title, subtitle, description, start_date, end_date, url, sort_order, ai_context_mode, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 'expose', ?, ?)`);
      profile.run(randomUUID(), "summary", "Fictional demo profile", null, "Software engineer focused on backend systems, developer tooling and practical ML products.", 0, now, now);
      profile.run(randomUUID(), "experience", "Software Engineer", "Example Cooperative", "Built TypeScript services, PostgreSQL data flows and internal automation used by distributed teams.", 1, now, now);
      profile.run(randomUUID(), "skill", "Backend engineering", null, "TypeScript, Python, SQL, API design, testing and observability.", 2, now, now);
      profile.run(randomUUID(), "language", "English", "Professional", "Fictional demo proficiency.", 3, now, now);
      database.prepare(`UPDATE career_context SET career_direction = ?, objectives = ?, constraints_text = ?, target_roles = ?, target_markets_locations = ?, work_preferences = ?, application_writing_preferences = ?, updated_at = ? WHERE id = 1`)
        .run("Backend/platform or ML product engineering.", "Find a product team with strong engineering ownership.", "Prefer Spain or remote EU roles.", "Backend Engineer; Platform Engineer; ML Product Engineer", "Spain; Remote EU", "Small-to-medium product teams; pragmatic engineering culture.", "Concise, concrete, avoid inflated claims.", now);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  });

  const cv = createDocument(workspace.rootPath, {
    kind: "cv", title: "Demo CV", variantId: null, language: "en", engine: "pdflatex", bodyParagraphs: [],
  });
  const letter = createDocument(workspace.rootPath, {
    kind: "cover_letter", title: "Demo cover letter", variantId: null, language: "en", engine: "pdflatex",
    recipient: "Hiring team", subject: "Platform Engineer application",
    bodyParagraphs: ["I am interested in the fictional Platform Engineer role because it matches my backend and developer-tooling experience.", "My recent work includes TypeScript services, PostgreSQL workflows and production automation for distributed teams."],
    closing: "Kind regards",
  });
  withWorkspaceDatabase(workspace.rootPath, (database) => {
    database.prepare("INSERT INTO candidature_documents(candidature_id, document_id) VALUES (?, ?)").run(first, cv.id);
    database.prepare("INSERT INTO candidature_documents(candidature_id, document_id) VALUES (?, ?)").run(first, letter.id);
  });
  return workspace;
}
''',
)

# Main workspace IPC.
replace(
    "src/main/main.ts",
    '  workspaceChoiceSchema,\n  type WorkspaceInfo,\n',
    '  workspaceChoiceSchema,\n  workspaceStatusSchema,\n  type WorkspaceInfo,\n',
)
replace(
    "src/main/main.ts",
    'import { createWindowOptions } from "./window-options";\n',
    'import { createWindowOptions } from "./window-options";\nimport { createDemoWorkspace } from "./demo-workspace";\n',
)
replace(
    "src/main/main.ts",
    '  rememberWorkspacePath,\n} from "./workspace";\n',
    '  rememberWorkspacePath,\n  resetWorkspace,\n  workspaceIsDemo,\n} from "./workspace";\n',
)
replace(
    "src/main/main.ts",
    'async function backUpWorkspace(mainWindow: BrowserWindow) {\n',
    '''async function createDemo(mainWindow: BrowserWindow): Promise<WorkspaceInfo | null> {
  const selection = await dialog.showOpenDialog(mainWindow, {
    title: "Create a demo AAAAT workspace",
    buttonLabel: "Create demo here",
    properties: ["openDirectory", "createDirectory", "promptToCreate"],
  });
  const selectedPath = selection.filePaths[0];
  if (selection.canceled || !selectedPath) return null;
  const workspace = createDemoWorkspace(selectedPath);
  rememberWorkspacePath(workspaceSettingsPath(), workspace.rootPath);
  currentWorkspace = workspace;
  return workspace;
}

async function backUpWorkspace(mainWindow: BrowserWindow) {
''',
)
replace(
    "src/main/main.ts",
    '  ipcMain.handle(channels.workspaceChoose, async (event, choice: unknown) => {\n    assertTrustedSender(event, mainWindow);\n    return optionalWorkspaceInfoSchema.parse(await chooseWorkspace(mainWindow, choice));\n  });\n',
    '''  ipcMain.handle(channels.workspaceChoose, async (event, choice: unknown) => {
    assertTrustedSender(event, mainWindow);
    return optionalWorkspaceInfoSchema.parse(await chooseWorkspace(mainWindow, choice));
  });
  ipcMain.handle(channels.workspaceCreateDemo, async (event) => {
    assertTrustedSender(event, mainWindow);
    return optionalWorkspaceInfoSchema.parse(await createDemo(mainWindow));
  });
  ipcMain.handle(channels.workspaceReset, (event) => {
    assertTrustedSender(event, mainWindow);
    const workspace = resetWorkspace(requireWorkspaceRoot());
    rememberWorkspacePath(workspaceSettingsPath(), workspace.rootPath);
    currentWorkspace = workspace;
    return workspace;
  });
  ipcMain.handle(channels.workspaceStatus, (event) => {
    assertTrustedSender(event, mainWindow);
    return workspaceStatusSchema.parse({ demo: workspaceIsDemo(requireWorkspaceRoot()) });
  });
''',
)

# Prompt contracts, service, IPC and preload.
write(
    "src/shared/ai-prompt-contracts.ts",
    r'''import { z } from "zod";
import { aiOperationSchema } from "./ai-connection-contracts";

export const aiPromptChannels = Object.freeze({
  list: "aaaat:ai-prompt-list",
  save: "aaaat:ai-prompt-save",
  reset: "aaaat:ai-prompt-reset",
} as const);

export const aiPromptDisclosureSchema = z.object({
  operation: aiOperationSchema,
  label: z.string().min(1),
  defaultInstruction: z.string().min(1),
  userGuidance: z.string(),
  effectiveInstruction: z.string().min(1),
  contextSummary: z.string().min(1),
  responseExpectation: z.string().min(1),
}).strict();
export type AiPromptDisclosure = z.infer<typeof aiPromptDisclosureSchema>;
export const aiPromptDisclosureListSchema = z.array(aiPromptDisclosureSchema);
export const aiPromptUpdateSchema = z.object({ operation: aiOperationSchema, guidance: z.string().max(4000) }).strict();
export type AiPromptUpdate = z.infer<typeof aiPromptUpdateSchema>;

export interface AiPromptDesktopApi {
  readonly aiPrompts: {
    readonly list: () => Promise<AiPromptDisclosure[]>;
    readonly save: (input: AiPromptUpdate) => Promise<AiPromptDisclosure[]>;
    readonly reset: (operation: z.infer<typeof aiOperationSchema>) => Promise<AiPromptDisclosure[]>;
  };
}
''',
)
write(
    "src/main/ai-prompt-service.ts",
    r'''import type { AiOperation } from "../shared/ai-connection-contracts";
import { aiOperationLabels, aiOperations } from "../shared/ai-connection-contracts";
import type { AiPromptDisclosure } from "../shared/ai-prompt-contracts";
import { AI_DEFAULT_INSTRUCTIONS, createOpenAiCompatibleProvider, type ModelProvider } from "./ai-provider";
import { withWorkspaceDatabase } from "./workspace";

const contextSummary: Readonly<Record<AiOperation, string>> = {
  opportunity_review: "AI-visible candidature information plus career context allowed for this review. Retained Sources are not added implicitly.",
  job_extraction: "Only the supplied Source text plus the requested eligible field definitions. Single-field requests contain only that target; bulk requests contain only eligible missing targets.",
  historical_field_discovery: "Only the retained Sources selected by the user plus the one target field.",
  variant_recommendation: "Bounded AI-visible candidature information plus saved variant descriptors.",
  cv_tailoring: "Bounded AI-visible candidature information plus shareable evidence from the selected CV context.",
  cover_letter_draft: "Bounded AI-visible candidature information plus shareable evidence from the selected cover-letter context.",
};

const responseExpectation: Readonly<Record<AiOperation, string>> = {
  opportunity_review: "JSON: summary, relevant evidence, uncertainties and questions. Read-only review; no workflow decisions.",
  job_extraction: "JSON proposals keyed by task-local field references, with optional new fields only when existing information cannot fit.",
  historical_field_discovery: "JSON proposal for the one requested field; no other candidature mutation authority.",
  variant_recommendation: "JSON selecting one supplied task-local variant reference plus rationale.",
  cv_tailoring: "JSON recommendations using only supplied task-local evidence references.",
  cover_letter_draft: "JSON recipient, subject, body paragraphs and closing; no invented career facts.",
};

function key(operation: AiOperation): string { return `ai.prompt.guidance.${operation}`; }

export function aiPromptGuidance(rootPath: string): Partial<Record<AiOperation, string>> {
  return withWorkspaceDatabase(rootPath, (database) => {
    const guidance: Partial<Record<AiOperation, string>> = {};
    for (const operation of aiOperations) {
      const row = database.prepare("SELECT value FROM workspace_metadata WHERE key = ?").get(key(operation)) as { value: string } | undefined;
      if (row?.value.trim()) guidance[operation] = row.value.trim();
    }
    return guidance;
  });
}

function effective(operation: AiOperation, guidance: string): string {
  const suffix = guidance.trim();
  return suffix
    ? `${AI_DEFAULT_INSTRUCTIONS[operation]}\n\nUser guidance (must not override the fixed response contract or supplied facts):\n${suffix}`
    : AI_DEFAULT_INSTRUCTIONS[operation];
}

export function listAiPromptDisclosures(rootPath: string): AiPromptDisclosure[] {
  const guidance = aiPromptGuidance(rootPath);
  return aiOperations.map((operation) => ({
    operation,
    label: aiOperationLabels[operation],
    defaultInstruction: AI_DEFAULT_INSTRUCTIONS[operation],
    userGuidance: guidance[operation] ?? "",
    effectiveInstruction: effective(operation, guidance[operation] ?? ""),
    contextSummary: contextSummary[operation],
    responseExpectation: responseExpectation[operation],
  }));
}

export function saveAiPromptGuidance(rootPath: string, operation: AiOperation, guidance: string): AiPromptDisclosure[] {
  withWorkspaceDatabase(rootPath, (database) => {
    const trimmed = guidance.trim();
    if (!trimmed) database.prepare("DELETE FROM workspace_metadata WHERE key = ?").run(key(operation));
    else database.prepare("INSERT OR REPLACE INTO workspace_metadata(key, value) VALUES (?, ?)").run(key(operation), trimmed);
  });
  return listAiPromptDisclosures(rootPath);
}

export function resetAiPromptGuidance(rootPath: string, operation: AiOperation): AiPromptDisclosure[] {
  return saveAiPromptGuidance(rootPath, operation, "");
}

export function createWorkspaceAiProvider(
  rootPath: string,
  fetchImpl: typeof fetch = fetch,
): ModelProvider {
  return createOpenAiCompatibleProvider(fetchImpl, undefined, aiPromptGuidance(rootPath));
}
''',
)
write(
    "src/main/ai-prompt-ipc.ts",
    r'''import path from "node:path";
import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import { aiOperationSchema } from "../shared/ai-connection-contracts";
import { aiPromptChannels, aiPromptDisclosureListSchema, aiPromptUpdateSchema } from "../shared/ai-prompt-contracts";
import { listAiPromptDisclosures, resetAiPromptGuidance, saveAiPromptGuidance } from "./ai-prompt-service";
import { readLastWorkspacePath } from "./workspace";

function trusted(event: IpcMainInvokeEvent, window: BrowserWindow) {
  if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error("Untrusted IPC sender");
}
function root(): string {
  const value = readLastWorkspacePath(path.join(app.getPath("userData"), "workspace-settings.json"));
  if (!value) throw new Error("Choose an AAAAT workspace first.");
  return value;
}
function register(window: BrowserWindow) {
  for (const channel of Object.values(aiPromptChannels)) ipcMain.removeHandler(channel);
  ipcMain.handle(aiPromptChannels.list, (event) => { trusted(event, window); return aiPromptDisclosureListSchema.parse(listAiPromptDisclosures(root())); });
  ipcMain.handle(aiPromptChannels.save, (event, raw: unknown) => {
    trusted(event, window); const input = aiPromptUpdateSchema.parse(raw);
    return aiPromptDisclosureListSchema.parse(saveAiPromptGuidance(root(), input.operation, input.guidance));
  });
  ipcMain.handle(aiPromptChannels.reset, (event, raw: unknown) => {
    trusted(event, window); return aiPromptDisclosureListSchema.parse(resetAiPromptGuidance(root(), aiOperationSchema.parse(raw)));
  });
}
app.on("browser-window-created", (_event, window) => register(window));
''',
)
write(
    "src/preload/ai-prompt-api.ts",
    r'''import { aiOperationSchema } from "../shared/ai-connection-contracts";
import { aiPromptChannels, aiPromptDisclosureListSchema, aiPromptUpdateSchema, type AiPromptDesktopApi, type AiPromptUpdate } from "../shared/ai-prompt-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;
export function createAiPromptDesktopApi(invoke: Invoke): AiPromptDesktopApi {
  return Object.freeze({ aiPrompts: Object.freeze({
    list: async () => aiPromptDisclosureListSchema.parse(await invoke(aiPromptChannels.list)),
    save: async (input: AiPromptUpdate) => aiPromptDisclosureListSchema.parse(await invoke(aiPromptChannels.save, aiPromptUpdateSchema.parse(input))),
    reset: async (operation) => aiPromptDisclosureListSchema.parse(await invoke(aiPromptChannels.reset, aiOperationSchema.parse(operation))),
  }) });
}
''',
)
replace(
    "src/preload/preload.ts",
    'import { createAiConnectionDesktopApi } from "./ai-connection-api";\n',
    'import { createAiConnectionDesktopApi } from "./ai-connection-api";\nimport { createAiPromptDesktopApi } from "./ai-prompt-api";\n',
)
replace(
    "src/preload/preload.ts",
    '  ...createAiConnectionDesktopApi(invoke),\n',
    '  ...createAiConnectionDesktopApi(invoke),\n  ...createAiPromptDesktopApi(invoke),\n',
)
replace(
    "src/renderer/global.d.ts",
    'import type { AiConnectionDesktopApi } from "../shared/ai-connection-contracts";\n',
    'import type { AiConnectionDesktopApi } from "../shared/ai-connection-contracts";\nimport type { AiPromptDesktopApi } from "../shared/ai-prompt-contracts";\n',
)
replace(
    "src/renderer/global.d.ts",
    '      AiConnectionDesktopApi &\n',
    '      AiConnectionDesktopApi &\n      AiPromptDesktopApi &\n',
)

# Provider owns the fixed contract; guidance is appended, never replaces it.
replace(
    "src/main/ai-provider.ts",
    'export interface ModelProvider {\n',
    '''export const AI_DEFAULT_INSTRUCTIONS: Readonly<Record<AiOperation, string>> = Object.freeze({
  opportunity_review: "Review one opportunity using only the supplied context. Return only the final JSON object with keys summary, relevantEvidence, uncertainties, questions. Do not expose chain-of-thought or reasoning. Do not rate, score, rank, choose a winner, prescribe next actions, or define a career workflow. Missing candidature information is normal; do not invent facts.",
  job_extraction: "Extract only facts supported by the supplied Source. Return only the final JSON object as {\\\"proposals\\\":[{\\\"fieldRef\\\":\\\"...\\\",\\\"value\\\":...}],\\\"newFields\\\":[{\\\"label\\\":\\\"...\\\",\\\"description\\\":\\\"...\\\",\\\"valueType\\\":\\\"text|long_text|number|boolean|date|url|choice\\\",\\\"cardinality\\\":\\\"one|many\\\",\\\"choices\\\":[\\\"...\\\"],\\\"value\\\":...}]}. Do not expose chain-of-thought or reasoning. For proposals, use only fieldRef values present in fields, obey each field type and cardinality, use only supplied choiceRef values for existing choice fields, and omit unsupported values. Reuse supplied fields first. Their label, description, type, cardinality, and choices define what each can hold. newFields is optional discovery only for useful facts that genuinely cannot fit any supplied field: suggest at most 8 concise reusable candidature information kinds, never duplicate an existing field by meaning or name (for example Languages/Idiomas vs Language Required), use choices only for choice fields, and omit speculative or weakly supported facts. Return an empty array when there are no genuinely useful new fields.",
  historical_field_discovery: "Extract only the requested information from the retained Sources explicitly selected by the user. Return the same fixed extraction JSON contract, using only the supplied target fieldRef. Do not expose chain-of-thought or reasoning. Do not infer unrelated fields or invent facts.",
  variant_recommendation: "Choose exactly one supplied profile variant for the supplied candidature. Return only the final JSON object with keys variantRef and rationale. Do not expose chain-of-thought or reasoning. Never invent a variantRef or propose creating a new variant.",
  cv_tailoring: "Recommend the strongest supplied career items for this candidature. Return only the final JSON object with key recommendations, an array of objects with itemRef and rationale. Do not expose chain-of-thought or reasoning. Use only itemRef values supplied in context. Do not rewrite or invent career facts.",
  cover_letter_draft: "Draft a concise cover letter using only the supplied opportunity and career evidence. Return only the final JSON object with keys recipient, subject, bodyParagraphs, closing. Do not expose chain-of-thought or reasoning. Do not invent career facts or contact details; use empty strings when recipient or closing is unsupported.",
});

export interface ModelProvider {
''',
)
replace(
    "src/main/ai-provider.ts",
    '    signal?: AbortSignal,\n  ): Promise<z.input<typeof providerJobExtractionResultSchema>>;\n',
    '    signal?: AbortSignal,\n    operation?: "job_extraction" | "historical_field_discovery",\n  ): Promise<z.input<typeof providerJobExtractionResultSchema>>;\n',
)
replace(
    "src/main/ai-provider.ts",
    'export function createOpenAiCompatibleProvider(\n  fetchImpl: typeof fetch = fetch,\n  requestTimeoutMs: number = AI_PROVIDER_SAFETY_CEILING_MS,\n): ModelProvider {\n',
    '''export function createOpenAiCompatibleProvider(
  fetchImpl: typeof fetch = fetch,
  requestTimeoutMs: number | undefined = AI_PROVIDER_SAFETY_CEILING_MS,
  guidance: Partial<Record<AiOperation, string>> = {},
): ModelProvider {
  const timeout = requestTimeoutMs ?? AI_PROVIDER_SAFETY_CEILING_MS;
  const instructionFor = (operation: AiOperation): string => {
    const userGuidance = guidance[operation]?.trim();
    return userGuidance
      ? `${AI_DEFAULT_INSTRUCTIONS[operation]}\n\nUser guidance (must not override the fixed response contract or supplied facts):\n${userGuidance}`
      : AI_DEFAULT_INSTRUCTIONS[operation];
  };
''',
)
# Replace the five hardcoded operation instructions and timeout variable.
for literal, operation in [
    ('"Review one opportunity using only the supplied context. Return only the final JSON object with keys summary, relevantEvidence, uncertainties, questions. Do not expose chain-of-thought or reasoning. Do not rate, score, rank, choose a winner, prescribe next actions, or define a career workflow. Missing candidature information is normal; do not invent facts."', 'opportunity_review'),
    ('"Choose exactly one supplied profile variant for the supplied candidature. Return only the final JSON object with keys variantRef and rationale. Do not expose chain-of-thought or reasoning. Never invent a variantRef or propose creating a new variant."', 'variant_recommendation'),
    ('"Recommend the strongest supplied career items for this candidature. Return only the final JSON object with key recommendations, an array of objects with itemRef and rationale. Do not expose chain-of-thought or reasoning. Use only itemRef values supplied in context. Do not rewrite or invent career facts."', 'cv_tailoring'),
    ('"Draft a concise cover letter using only the supplied opportunity and career evidence. Return only the final JSON object with keys recipient, subject, bodyParagraphs, closing. Do not expose chain-of-thought or reasoning. Do not invent career facts or contact details; use empty strings when recipient or closing is unsupported."', 'cover_letter_draft'),
]:
    replace("src/main/ai-provider.ts", literal, f'instructionFor("{operation}")')
# Extraction method gets distinct operation identity when historical discovery calls it.
extract_literal = '"Extract only facts supported by the supplied Source. Return only the final JSON object as {\\"proposals\\":[{\\"fieldRef\\":\\"...\\",\\"value\\":...}],\\"newFields\\":[{\\"label\\":\\"...\\",\\"description\\":\\"...\\",\\"valueType\\":\\"text|long_text|number|boolean|date|url|choice\\",\\"cardinality\\":\\"one|many\\",\\"choices\\":[\\"...\\"],\\"value\\":...}]}. Do not expose chain-of-thought or reasoning. For proposals, use only fieldRef values present in fields, obey each field type and cardinality, use only supplied choiceRef values for existing choice fields, and omit unsupported values. Reuse supplied fields first. Their label, description, type, cardinality, and choices define what each can hold. newFields is optional discovery only for useful facts that genuinely cannot fit any supplied field: suggest at most 8 concise reusable candidature information kinds, never duplicate an existing field by meaning or name (for example Languages/Idiomas vs Language Required), use choices only for choice fields, and omit speculative or weakly supported facts. Return an empty array when there are no genuinely useful new fields."'
replace("src/main/ai-provider.ts", '      signal?: AbortSignal,\n    ): Promise<z.input<typeof providerJobExtractionResultSchema>> {\n', '      signal?: AbortSignal,\n      operation: "job_extraction" | "historical_field_discovery" = "job_extraction",\n    ): Promise<z.input<typeof providerJobExtractionResultSchema>> {\n')
replace("src/main/ai-provider.ts", '        "job_extraction",\n        ' + extract_literal + ',\n', '        operation,\n        instructionFor(operation),\n')
replace("src/main/ai-provider.ts", '        requestTimeoutMs,\n', '        timeout,\n', count=5)

# Normal operations use workspace guidance. Provider injection in tests remains supported.
replace(
    "src/main/ai-service.ts",
    'import { createOpenAiCompatibleProvider, type ModelProvider } from "./ai-provider";\n',
    'import { type ModelProvider } from "./ai-provider";\nimport { createWorkspaceAiProvider } from "./ai-prompt-service";\n',
)
replace("src/main/ai-service.ts", 'provider: ModelProvider = createOpenAiCompatibleProvider(),', 'provider: ModelProvider = createWorkspaceAiProvider(rootPath),', count=5)
replace(
    "src/main/ai-service.ts",
    '  const rawResult = await provider.extractJob(statusFor(stored), wire.request);\n',
    '  const rawResult = await provider.extractJob(statusFor(stored), wire.request, undefined, "historical_field_discovery");\n',
)
replace(
    "src/main/robust-job-extraction.ts",
    'import { createOpenAiCompatibleProvider, type ModelProvider } from "./ai-provider";\n',
    'import { type ModelProvider } from "./ai-provider";\nimport { createWorkspaceAiProvider } from "./ai-prompt-service";\n',
)
replace(
    "src/main/robust-job-extraction.ts",
    '  const provider = createOpenAiCompatibleProvider(capture.fetchImpl);\n',
    '  const provider = createWorkspaceAiProvider(rootPath, capture.fetchImpl);\n',
)

# Renderer advanced prompt disclosure.
write(
    "src/renderer/AiPromptTransparencyPanel.tsx",
    r'''import { useEffect, useState } from "react";
import type { AiPromptDisclosure } from "../shared/ai-prompt-contracts";

export function AiPromptTransparencyPanel() {
  const [items, setItems] = useState<AiPromptDisclosure[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.aiPrompts.list().then((next) => {
      if (!active) return;
      setItems(next);
      setDrafts(Object.fromEntries(next.map((item) => [item.operation, item.userGuidance])));
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "AAAAT could not read AI instructions."); });
    return () => { active = false; };
  }, []);

  const apply = (next: AiPromptDisclosure[]) => {
    setItems(next);
    setDrafts(Object.fromEntries(next.map((item) => [item.operation, item.userGuidance])));
  };

  return (
    <details className="profile-column ai-prompt-transparency">
      <summary><strong>Advanced: AI instructions and context</strong></summary>
      <p className="compact-help">AAAAT owns each response contract. You can add guidance without making the JSON contract editable.</p>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <div className="document-list">
        {items.map((item) => (
          <article className="document-card" key={item.operation}>
            <h3>{item.label}</h3>
            <p><strong>Context sent:</strong> {item.contextSummary}</p>
            <p><strong>Expected response:</strong> {item.responseExpectation}</p>
            <label>
              Optional guidance
              <textarea value={drafts[item.operation] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [item.operation]: event.target.value }))} rows={3} placeholder="Add preferences for this operation without changing AAAAT's fixed response contract." />
            </label>
            <div className="button-row">
              <button type="button" className="compact-secondary" disabled={busy === item.operation} onClick={() => {
                setBusy(item.operation); setError(null);
                void window.aaaat.aiPrompts.save({ operation: item.operation, guidance: drafts[item.operation] ?? "" }).then(apply).catch((reason) => setError(reason instanceof Error ? reason.message : "AAAAT could not save AI guidance.")).finally(() => setBusy(null));
              }}>Save guidance</button>
              <button type="button" className="compact-secondary" disabled={busy === item.operation || !item.userGuidance} onClick={() => {
                setBusy(item.operation); setError(null);
                void window.aaaat.aiPrompts.reset(item.operation).then(apply).catch((reason) => setError(reason instanceof Error ? reason.message : "AAAAT could not reset AI guidance.")).finally(() => setBusy(null));
              }}>Reset to default</button>
            </div>
            <details>
              <summary>Effective final instruction</summary>
              <pre className="ai-effective-instruction">{item.effectiveInstruction}</pre>
            </details>
          </article>
        ))}
      </div>
    </details>
  );
}
''',
)
replace(
    "src/renderer/AiSettingsWorkspace.tsx",
    'import { AiConnectionValidationPanel } from "./AiConnectionValidationPanel";\n',
    'import { AiConnectionValidationPanel } from "./AiConnectionValidationPanel";\nimport { AiPromptTransparencyPanel } from "./AiPromptTransparencyPanel";\n',
)
replace(
    "src/renderer/AiSettingsWorkspace.tsx",
    '      {showPortability ? (\n',
    '      {showConnections ? <AiPromptTransparencyPanel /> : null}\n\n      {showPortability ? (\n',
)

# Demo first-run and visible marker.
replace(
    "src/renderer/App.tsx",
    '  const [workspaceError, setWorkspaceError] = useState<string | null>(null);\n',
    '  const [workspaceError, setWorkspaceError] = useState<string | null>(null);\n  const [demoWorkspace, setDemoWorkspace] = useState(false);\n',
)
replace(
    "src/renderer/App.tsx",
    '        setWorkspace(currentWorkspace);\n        setWorkspacePhase(currentWorkspace ? "ready" : "idle");\n',
    '        setWorkspace(currentWorkspace);\n        setWorkspacePhase(currentWorkspace ? "ready" : "idle");\n        if (currentWorkspace) void window.aaaat.workspace.status().then((status) => { if (active) setDemoWorkspace(status.demo); });\n',
)
replace(
    "src/renderer/App.tsx",
    '  const openRestoredWorkspace = (restoredWorkspace: WorkspaceInfo) => {\n',
    '''  const createDemoWorkspace = async () => {
    if (workspace && anyDirty && !window.confirm("Discard unsaved edits and switch to a demo workspace?")) return;
    setWorkspacePhase("choosing"); setWorkspaceError(null);
    try {
      const selected = await window.aaaat.workspace.createDemo();
      if (!selected) { setWorkspacePhase(workspace ? "ready" : "idle"); return; }
      setCandidatureDirty(false); setDocumentDirty(false); setProfessionalInformationDirty(false); setSettingsDirty(false);
      resetHandoffs(); setWorkspace(selected); setDemoWorkspace(true); setWorkspacePhase("ready"); setSettingsOpen(false); setProductView("candidatures");
    } catch (reason) {
      setWorkspacePhase(workspace ? "ready" : "idle");
      setWorkspaceError(reason instanceof Error ? reason.message : "AAAAT could not create the demo workspace. Choose an empty folder.");
    }
  };

  const openRestoredWorkspace = (restoredWorkspace: WorkspaceInfo) => {
''',
)
replace(
    "src/renderer/App.tsx",
    '      setWorkspace(selectedWorkspace);\n      setWorkspacePhase("ready");\n',
    '      setWorkspace(selectedWorkspace);\n      setDemoWorkspace((await window.aaaat.workspace.status()).demo);\n      setWorkspacePhase("ready");\n',
)
replace(
    "src/renderer/App.tsx",
    '    setWorkspace(restoredWorkspace);\n    setWorkspacePhase("ready");\n',
    '    setWorkspace(restoredWorkspace);\n    setDemoWorkspace(false);\n    setWorkspacePhase("ready");\n',
)
replace(
    "src/renderer/App.tsx",
    '<span>Workspace</span><code>{workspace.rootPath}</code>',
    '<span>{demoWorkspace ? "Demo workspace" : "Workspace"}</span><code>{workspace.rootPath}</code>',
)
replace(
    "src/renderer/App.tsx",
    '                  <button className="secondary-action" type="button" disabled={choosing} onClick={() => void chooseWorkspace("open")}>Open existing workspace</button>\n',
    '                  <button className="secondary-action" type="button" disabled={choosing} onClick={() => void chooseWorkspace("open")}>Open existing workspace</button>\n                  <button className="secondary-action" type="button" disabled={choosing} onClick={() => void createDemoWorkspace()}>Try with demo data</button>\n',
)

# Reset is a workspace-level destructive action in Settings.
replace(
    "src/renderer/SettingsWorkspace.tsx",
    'function WorkspaceLocationPanel({\n',
    '''function ResetWorkspacePanel() {
  const [busy, setBusy] = useState(false);
  return (
    <section className="profile-column destructive-settings" aria-label="Reset workspace">
      <div className="section-heading"><div><p className="eyebrow">Current workspace only</p><h2>Reset workspace</h2></div></div>
      <p>Remove the current workspace data and return this folder to a clean usable AAAAT state. Other workspaces are not affected.</p>
      <button type="button" className="compact-secondary" disabled={busy} onClick={() => {
        if (!window.confirm("Reset this workspace? This permanently removes its candidatures, Sources, Tags, professional information, documents, artifacts and workspace AI settings.")) return;
        setBusy(true);
        void window.aaaat.workspace.reset().then(() => window.location.reload()).catch(() => setBusy(false));
      }}>{busy ? "Resetting…" : "Reset workspace"}</button>
    </section>
  );
}

function WorkspaceLocationPanel({
''',
)
# Add panel in workspace view after recovery panel occurrence.
replace(
    "src/renderer/SettingsWorkspace.tsx",
    '            <WorkspaceRecoveryPanel currentWorkspace={currentWorkspace} editorDirty={protectedWorkDirty} onRestored={onRestored} />\n',
    '            <WorkspaceRecoveryPanel currentWorkspace={currentWorkspace} editorDirty={protectedWorkDirty} onRestored={onRestored} />\n            <ResetWorkspacePanel />\n',
)

# Tests for workspace demo/reset and prompt guidance.
write(
    "test/demo-workspace.test.ts",
    r'''import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDemoWorkspace } from "../src/main/demo-workspace";
import { listCandidatures, listCandidatureSources } from "../src/main/candidature-service";
import { getProfile } from "../src/main/profile-service";
import { listDocuments } from "../src/main/document-service";
import { listCandidatureFields } from "../src/main/candidature-field-service";
import { resetWorkspace, workspaceIsDemo } from "../src/main/workspace";

describe("demo workspace and reset", () => {
  it("creates a clearly marked realistic demo and resets only that workspace to a clean state", () => {
    const root = mkdtempSync(path.join(tmpdir(), "aaaat-demo-"));
    createDemoWorkspace(root);
    expect(workspaceIsDemo(root)).toBe(true);
    const candidatures = listCandidatures(root);
    expect(candidatures).toHaveLength(2);
    expect(listCandidatureSources(root, candidatures[0]!.id)[0]?.sourceText).toContain("<main>");
    expect(getProfile(root).items.length).toBeGreaterThanOrEqual(4);
    expect(listDocuments(root)).toHaveLength(2);
    expect(listCandidatureFields(root).some((field) => field.definition.label === "Languages")).toBe(true);

    resetWorkspace(root);
    expect(workspaceIsDemo(root)).toBe(false);
    expect(listCandidatures(root)).toHaveLength(0);
    expect(getProfile(root).items).toHaveLength(0);
    expect(listDocuments(root)).toHaveLength(0);
  });
});
''',
)
write(
    "test/ai-prompt-service.test.ts",
    r'''import { mkdtempSync } from "node:fs";
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
''',
)

# Minimal styling for readable advanced disclosure and destructive separation.
css = ROOT / "src/renderer/app.css"
if css.exists():
    css.write_text(css.read_text(encoding="utf-8") + r'''

.ai-effective-instruction {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 18rem;
  overflow: auto;
}

.ai-prompt-transparency > summary {
  cursor: pointer;
}

.destructive-settings {
  border-top: 1px solid var(--line, #b7b0a1);
}
''', encoding="utf-8")
