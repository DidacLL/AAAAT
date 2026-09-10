import path from "node:path";

import { app, ipcMain, shell, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  documentOutputChannels,
  documentOutputDocumentIdSchema,
  documentOutputOpenResultSchema,
} from "../shared/document-output-contracts";
import { openDocumentOutput } from "./document-output-service";
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

function registerDocumentOutputIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(documentOutputChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(documentOutputChannels.open, async (event, documentId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return documentOutputOpenResultSchema.parse(
      await openDocumentOutput(
        requireWorkspaceRoot(),
        documentOutputDocumentIdSchema.parse(documentId),
        (outputPath) => shell.openPath(outputPath),
      ),
    );
  });
}

app.on("browser-window-created", (_event, mainWindow) => registerDocumentOutputIpc(mainWindow));
