import path from "node:path";

import { app, dialog, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  combinedDocumentChannels,
  combinedDocumentExportInputSchema,
  combinedDocumentExportResultSchema,
} from "../shared/combined-document-contracts";
import { exportCombinedDocumentProject } from "./combined-document-service";
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

export function registerCombinedDocumentIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(combinedDocumentChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(combinedDocumentChannels.exportPacket, async (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    const validated = combinedDocumentExportInputSchema.parse(input);
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: "Export combined CV and cover-letter packet",
      buttonLabel: "Export here",
      properties: ["openDirectory", "createDirectory"],
    });
    if (selection.canceled || !selection.filePaths[0]) {
      return combinedDocumentExportResultSchema.parse(null);
    }
    return combinedDocumentExportResultSchema.parse({
      exportedPath: await exportCombinedDocumentProject(
        requireWorkspaceRoot(),
        validated,
        selection.filePaths[0],
      ),
    });
  });
}
