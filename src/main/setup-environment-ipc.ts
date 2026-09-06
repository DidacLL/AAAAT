import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  setupEnvironmentChannels,
  setupEnvironmentSnapshotSchema,
} from "../shared/setup-environment-contracts";
import { getSetupEnvironmentSnapshot } from "./setup-environment-service";
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

function registerSetupEnvironmentIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(setupEnvironmentChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(setupEnvironmentChannels.current, async (event) => {
    assertTrustedSender(event, mainWindow);
    return setupEnvironmentSnapshotSchema.parse(
      await getSetupEnvironmentSnapshot(requireWorkspaceRoot()),
    );
  });
}

app.on("browser-window-created", (_event, mainWindow) =>
  registerSetupEnvironmentIpc(mainWindow),
);
