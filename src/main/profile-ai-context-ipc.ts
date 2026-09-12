import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  profileAiContextChannels,
  profileAiContextItemIdSchema,
  profileAiContextPreferenceSchema,
  profileAiContextUpdateSchema,
} from "../shared/profile-ai-context-contracts";
import {
  getProfileItemAiContextPreference,
  updateProfileItemAiContextPreference,
} from "./profile-ai-context-service";
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

export function registerProfileAiContextIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(profileAiContextChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(profileAiContextChannels.current, (event, itemId: unknown) => {
    assertTrustedSender(event, mainWindow);
    return profileAiContextPreferenceSchema.parse(
      getProfileItemAiContextPreference(
        requireWorkspaceRoot(),
        profileAiContextItemIdSchema.parse(itemId),
      ),
    );
  });

  ipcMain.handle(profileAiContextChannels.update, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return profileAiContextPreferenceSchema.parse(
      updateProfileItemAiContextPreference(
        requireWorkspaceRoot(),
        profileAiContextUpdateSchema.parse(input),
      ),
    );
  });
}
