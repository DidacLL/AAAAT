import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  aiConnectionIdSchema,
  aiConnectionManagementChannels,
  namedAiConnectionInputSchema,
  namedAiConnectionListSchema,
} from "../shared/ai-connection-contracts";
import {
  listAiConnections,
  removeAiConnection,
  saveNamedAiConnection,
  setDefaultAiConnection,
} from "./ai-connection-service";
import { readLastWorkspacePath } from "./workspace";

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

function registerAiConnectionManagementIpc(mainWindow: BrowserWindow): void {
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
}

app.on("browser-window-created", (_event, mainWindow) =>
  registerAiConnectionManagementIpc(mainWindow),
);
