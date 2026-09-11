import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  candidatureActivityCandidatureIdSchema,
  candidatureActivityChannels,
  candidatureActivityListSchema,
} from "../shared/candidature-activity-contracts";
import { listCandidatureActivity } from "./candidature-activity-service";
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

function registerCandidatureActivityIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(candidatureActivityChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(candidatureActivityChannels.list, (event, candidatureId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureActivityListSchema.parse(
      listCandidatureActivity(
        requireWorkspaceRoot(),
        candidatureActivityCandidatureIdSchema.parse(candidatureId),
      ),
    );
  });
}

app.on("browser-window-created", (_event, mainWindow) =>
  registerCandidatureActivityIpc(mainWindow),
);
