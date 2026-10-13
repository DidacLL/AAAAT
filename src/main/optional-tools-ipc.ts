import { ipcMain, type BrowserWindow } from "electron";

import { optionalToolsChannels, optionalToolsChoiceSchema, optionalToolsStatusSchema, localAiStartupInputSchema } from "../shared/optional-tools-contracts";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";
import { refreshSetupEnvironmentSnapshot } from "./setup-environment-service";
import { localAiStartupSettings, saveLocalAiStartupSettings } from "./local-granite-runtime";
import { cancelOptionalTools, dismissOptionalTools, installOptionalTools, optionalToolsStatus, prepareInstalledAiConnection } from "./optional-tools-service";

export function registerOptionalToolsIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(optionalToolsChannels)) ipcMain.removeHandler(channel);
  ipcMain.handle(optionalToolsChannels.current, async event => {
    assertTrustedSender(event, mainWindow);
    return optionalToolsStatusSchema.parse(await optionalToolsStatus());
  });
  ipcMain.handle(optionalToolsChannels.install, async (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    const choice = optionalToolsChoiceSchema.parse(input);
    const result = await installOptionalTools(choice);
    if (choice.localAi && result.localAiReady) {
      try { prepareInstalledAiConnection(requireWorkspaceRoot()); } catch { /* A first-run workspace may not exist yet. */ }
    }
    if (choice.pdf && result.pdfReady) {
      try { await refreshSetupEnvironmentSnapshot(requireWorkspaceRoot()); } catch { /* First-run setup can precede a workspace. */ }
    }
    return optionalToolsStatusSchema.parse(result);
  });
  ipcMain.handle(optionalToolsChannels.cancel, event => {
    assertTrustedSender(event, mainWindow);
    cancelOptionalTools();
  });
  ipcMain.handle(optionalToolsChannels.dismiss, async event => {
    assertTrustedSender(event, mainWindow);
    await dismissOptionalTools();
  });
  ipcMain.handle(optionalToolsChannels.startupCurrent, event => {
    assertTrustedSender(event, mainWindow);
    return localAiStartupSettings();
  });
  ipcMain.handle(optionalToolsChannels.startupSave, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return saveLocalAiStartupSettings(localAiStartupInputSchema.parse(input));
  });
}
