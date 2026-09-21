import { app, ipcMain, type BrowserWindow } from "electron";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

import {
  setupEnvironmentChannels,
  setupEnvironmentSnapshotSchema,
  externalAssistantConnectionSchema,
} from "../shared/setup-environment-contracts";
import { getSetupEnvironmentSnapshot } from "./setup-environment-service";

export function registerSetupEnvironmentIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(setupEnvironmentChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(setupEnvironmentChannels.current, async (event) => {
    assertTrustedSender(event, mainWindow);
    return setupEnvironmentSnapshotSchema.parse(
      await getSetupEnvironmentSnapshot(requireWorkspaceRoot()),
    );
  });

  ipcMain.handle(setupEnvironmentChannels.externalConnection, (event) => {
    assertTrustedSender(event, mainWindow);
    return externalAssistantConnectionSchema.parse({
      packaged: app.isPackaged,
      executablePath: process.execPath,
      workspacePath: requireWorkspaceRoot(),
    });
  });
}
