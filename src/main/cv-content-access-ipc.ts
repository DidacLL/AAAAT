import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  cvContentAccessChannels,
  cvContentAccessSchema,
  cvContentAccessUpdateSchema,
} from "../shared/cv-content-access-contracts";
import { getCvContentAccess, updateCvContentAccess } from "./cv-content-access-service";
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

function registerCvContentAccessIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(cvContentAccessChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(cvContentAccessChannels.current, (event, documentId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return cvContentAccessSchema.parse(
      getCvContentAccess(requireWorkspaceRoot(), cvContentAccessSchema.shape.documentId.parse(documentId)),
    );
  });
  ipcMain.handle(cvContentAccessChannels.update, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return cvContentAccessSchema.parse(
      updateCvContentAccess(requireWorkspaceRoot(), cvContentAccessUpdateSchema.parse(input)),
    );
  });
}

app.on("browser-window-created", (_event, mainWindow) => registerCvContentAccessIpc(mainWindow));
