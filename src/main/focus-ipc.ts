import path from "node:path";

import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

import {
  focusChannels,
  focusMaterialPreferencesSchema,
} from "../shared/focus-contracts";
import {
  getFocusMaterialPreferences,
  updateFocusMaterialPreferences,
} from "./focus-service";
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

export function registerFocusIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(focusChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(focusChannels.current, (event) => {
    assertTrustedSender(event, mainWindow);
    return focusMaterialPreferencesSchema.parse(getFocusMaterialPreferences(requireWorkspaceRoot()));
  });
  ipcMain.handle(focusChannels.update, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return focusMaterialPreferencesSchema.parse(
      updateFocusMaterialPreferences(
        requireWorkspaceRoot(),
        focusMaterialPreferencesSchema.parse(input),
      ),
    );
  });
}
