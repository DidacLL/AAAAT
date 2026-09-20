import path from "node:path";

import { app, dialog, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  applicationHandoffChannels,
  applicationHandoffImportResultSchema,
} from "../shared/application-handoff-contracts";
import { importApplicationHandoffFile } from "./application-handoff-service";
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

function registerApplicationHandoffIpc(mainWindow: BrowserWindow): void {
  ipcMain.removeHandler(applicationHandoffChannels.importFile);

  ipcMain.handle(applicationHandoffChannels.importFile, async (event) => {
    assertTrustedSender(event, mainWindow);
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: "Import AAAAT application handoff",
      buttonLabel: "Import handoff",
      filters: [{ name: "AAAAT application handoff", extensions: ["json"] }],
      properties: ["openFile"],
    });
    const filePath = selection.filePaths[0];
    if (selection.canceled || !filePath) {
      return applicationHandoffImportResultSchema.parse({ status: "cancelled" });
    }
    const result = await importApplicationHandoffFile(requireWorkspaceRoot(), filePath);
    return applicationHandoffImportResultSchema.parse({ status: "imported", result });
  });
}

app.on("browser-window-created", (_event, mainWindow) =>
  registerApplicationHandoffIpc(mainWindow),
);
