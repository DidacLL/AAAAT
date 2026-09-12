import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  candidatureSearchChannels,
  candidatureSearchInputSchema,
  candidatureSearchResultSchema,
} from "../shared/candidature-search-contracts";
import { searchCandidatures } from "./candidature-search-service";
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

export function registerCandidatureSearchIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(candidatureSearchChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(candidatureSearchChannels.search, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return candidatureSearchResultSchema.parse(
      searchCandidatures(
        requireWorkspaceRoot(),
        candidatureSearchInputSchema.parse(input),
      ),
    );
  });
}
