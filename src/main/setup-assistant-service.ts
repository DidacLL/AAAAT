import {
  setupAssistantAccessSchema,
  setupAssistantAccessUpdateSchema,
  setupRenderingSelfTestResultSchema,
  type SetupAssistantAccess,
  type SetupAssistantAccessUpdate,
  type SetupRenderingSelfTestResult,
} from "../shared/setup-assistant-contracts";
import { createDocument, removeDocument, renderDocument } from "./document-service";
import { withWorkspaceDatabase } from "./workspace";

const installerKey = "assistant.setup.installer_actions_allowed";
const configuratorKey = "assistant.setup.configurator_actions_allowed";

function enabled(value: string | undefined): boolean {
  return value === "1";
}

export function getSetupAssistantAccess(rootPath: string): SetupAssistantAccess {
  return withWorkspaceDatabase(rootPath, (database) => {
    const read = database.prepare("SELECT value FROM workspace_metadata WHERE key = ?");
    const installer = read.get(installerKey) as { value: string } | undefined;
    const configurator = read.get(configuratorKey) as { value: string } | undefined;
    return setupAssistantAccessSchema.parse({
      installerActionsAllowed: enabled(installer?.value),
      configuratorActionsAllowed: enabled(configurator?.value),
    });
  });
}

export function updateSetupAssistantAccess(
  rootPath: string,
  rawUpdate: SetupAssistantAccessUpdate,
): SetupAssistantAccess {
  const update = setupAssistantAccessUpdateSchema.parse(rawUpdate);
  return withWorkspaceDatabase(rootPath, (database) => {
    const write = database.prepare(
      `INSERT INTO workspace_metadata(key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    );
    database.exec("BEGIN IMMEDIATE");
    try {
      write.run(installerKey, update.installerActionsAllowed ? "1" : "0");
      write.run(configuratorKey, update.configuratorActionsAllowed ? "1" : "0");
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
    return setupAssistantAccessSchema.parse(update);
  });
}

export function requireInstallerActionsAllowed(rootPath: string): void {
  if (!getSetupAssistantAccess(rootPath).installerActionsAllowed) {
    throw new Error(
      "Installer actions are disabled. Enable bounded installer.ai actions in AAAAT Settings first.",
    );
  }
}

export function requireConfiguratorActionsAllowed(rootPath: string): void {
  if (!getSetupAssistantAccess(rootPath).configuratorActionsAllowed) {
    throw new Error(
      "Configurator actions are disabled. Enable bounded configurator.ai actions in AAAAT Settings first.",
    );
  }
}

export async function runRenderingSelfTest(rootPath: string): Promise<SetupRenderingSelfTestResult> {
  const temporary = createDocument(rootPath, {
    kind: "cover_letter",
    title: "AAAAT rendering self-test",
    variantId: null,
    engine: "pdflatex",
    bodyParagraphs: ["AAAAT rendering self-test."],
  });
  try {
    await renderDocument(rootPath, temporary.id);
    return setupRenderingSelfTestResultSchema.parse({ passed: true });
  } finally {
    removeDocument(rootPath, temporary.id);
  }
}
