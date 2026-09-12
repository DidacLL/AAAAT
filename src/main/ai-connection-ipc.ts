import { lstatSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { app, dialog, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  aiConnectionIdSchema,
  aiConnectionManagementChannels,
  aiConnectionOperationInputSchema,
  namedAiConnectionInputSchema,
  namedAiConnectionListSchema,
  portableAiSetupExportResultSchema,
  portableAiSetupImportResultSchema,
  portableAiSetupSchema,
} from "../shared/ai-connection-contracts";
import {
  buildPortableAiSetup,
  listAiConnections,
  removeAiConnection,
  replaceAiConnectionsFromPortableSetup,
  saveNamedAiConnection,
  setAiOperationDefault,
  setDefaultAiConnection,
  validateAiConnectionOperation,
} from "./ai-connection-service";
import { readLastWorkspacePath } from "./workspace";

const maxPortableAiSetupBytes = 64 * 1024;

function assertTrustedSender(event: IpcMainInvokeEvent, mainWindow: BrowserWindow): void {
  if (event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error("Untrusted IPC sender");
  }
}

function requireWorkspaceRoot(): string {
  const rootPath = readLastWorkspacePath(
    path.join(app.getPath("userData"), "workspace-settings.json"),
  );
  if (!rootPath) throw new Error("Choose an AAAAT workspace first.");
  return rootPath;
}

function readPortableAiSetupFile(filePath: string) {
  const stat = lstatSync(filePath);
  if (!stat.isFile() || stat.size > maxPortableAiSetupBytes) {
    throw new Error("The selected portable AI setup file is invalid or too large.");
  }
  try {
    return portableAiSetupSchema.parse(JSON.parse(readFileSync(filePath, "utf8")));
  } catch {
    throw new Error("The selected portable AI setup file is invalid.");
  }
}

async function exportPortableAiSetup(mainWindow: BrowserWindow) {
  const selection = await dialog.showSaveDialog(mainWindow, {
    title: "Export portable AI setup",
    defaultPath: "aaaat-ai-setup.json",
    filters: [{ name: "AAAAT AI setup", extensions: ["json"] }],
  });
  if (selection.canceled || !selection.filePath) return "cancelled" as const;
  const setup = buildPortableAiSetup(requireWorkspaceRoot());
  writeFileSync(selection.filePath, `${JSON.stringify(setup, null, 2)}\n`, "utf8");
  return "exported" as const;
}

async function importPortableAiSetup(mainWindow: BrowserWindow) {
  const rootPath = requireWorkspaceRoot();
  const selection = await dialog.showOpenDialog(mainWindow, {
    title: "Import portable AI setup",
    buttonLabel: "Import setup",
    filters: [{ name: "AAAAT AI setup", extensions: ["json"] }],
    properties: ["openFile"],
  });
  if (selection.canceled || !selection.filePaths[0]) {
    return { status: "cancelled" as const, connections: listAiConnections(rootPath) };
  }
  return {
    status: "imported" as const,
    connections: replaceAiConnectionsFromPortableSetup(
      rootPath,
      readPortableAiSetupFile(selection.filePaths[0]),
    ),
  };
}

export function registerAiConnectionManagementIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(aiConnectionManagementChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(aiConnectionManagementChannels.list, (event) => {
    assertTrustedSender(event, mainWindow);
    return namedAiConnectionListSchema.parse(listAiConnections(requireWorkspaceRoot()));
  });

  ipcMain.handle(aiConnectionManagementChannels.save, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return namedAiConnectionListSchema.parse(
      saveNamedAiConnection(requireWorkspaceRoot(), namedAiConnectionInputSchema.parse(input)),
    );
  });

  ipcMain.handle(aiConnectionManagementChannels.setDefault, (event, connectionId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return namedAiConnectionListSchema.parse(
      setDefaultAiConnection(requireWorkspaceRoot(), aiConnectionIdSchema.parse(connectionId)),
    );
  });

  ipcMain.handle(aiConnectionManagementChannels.remove, (event, connectionId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return namedAiConnectionListSchema.parse(
      removeAiConnection(requireWorkspaceRoot(), aiConnectionIdSchema.parse(connectionId)),
    );
  });

  ipcMain.handle(aiConnectionManagementChannels.validateOperation, async (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return namedAiConnectionListSchema.parse(
      await validateAiConnectionOperation(
        requireWorkspaceRoot(),
        aiConnectionOperationInputSchema.parse(input),
      ),
    );
  });

  ipcMain.handle(aiConnectionManagementChannels.setOperationDefault, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return namedAiConnectionListSchema.parse(
      setAiOperationDefault(
        requireWorkspaceRoot(),
        aiConnectionOperationInputSchema.parse(input),
      ),
    );
  });

  ipcMain.handle(aiConnectionManagementChannels.exportPortable, async (event) => {
    assertTrustedSender(event, mainWindow);
    return portableAiSetupExportResultSchema.parse(await exportPortableAiSetup(mainWindow));
  });

  ipcMain.handle(aiConnectionManagementChannels.importPortable, async (event) => {
    assertTrustedSender(event, mainWindow);
    return portableAiSetupImportResultSchema.parse(await importPortableAiSetup(mainWindow));
  });
}
