import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  candidatureExternalAccessChannels,
  candidatureExternalAccessSchema,
  candidatureExternalAccessUpdateSchema,
} from "../shared/candidature-external-access-contracts";
import {
  getCandidatureExternalAccess,
  updateCandidatureExternalAccess,
} from "./candidature-external-access-service";
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

function registerCandidatureExternalAccessIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(candidatureExternalAccessChannels)) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle(candidatureExternalAccessChannels.current, (event, candidatureId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureExternalAccessSchema.parse(
      getCandidatureExternalAccess(
        requireWorkspaceRoot(),
        candidatureExternalAccessSchema.shape.candidatureId.parse(candidatureId),
      ),
    );
  });
  ipcMain.handle(candidatureExternalAccessChannels.update, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureExternalAccessSchema.parse(
      updateCandidatureExternalAccess(
        requireWorkspaceRoot(),
        candidatureExternalAccessUpdateSchema.parse(input),
      ),
    );
  });
}

app.on("browser-window-created", (_event, mainWindow) =>
  registerCandidatureExternalAccessIpc(mainWindow),
);
