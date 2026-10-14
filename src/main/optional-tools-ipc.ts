import { dialog, ipcMain, type BrowserWindow } from "electron";

import { optionalToolsChannels, optionalToolsChoiceSchema, optionalToolsStatusSchema, localAiStartupInputSchema, toolLocationsSchema, toolPathKindSchema } from "../shared/optional-tools-contracts";
import { saveToolLocations } from "./installed-tool-paths";
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
      let rootPath: string | null = null;
      try { rootPath = requireWorkspaceRoot(); } catch { /* First-run setup can precede a workspace. */ }
      if (rootPath) prepareInstalledAiConnection(rootPath, true);
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
  ipcMain.handle(optionalToolsChannels.locationsSave, async (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    if ((await optionalToolsStatus()).busy) throw new Error("Wait for the current installation to finish.");
    saveToolLocations(toolLocationsSchema.parse(input));
    try { await refreshSetupEnvironmentSnapshot(requireWorkspaceRoot()); } catch { /* Setup can precede a workspace. */ }
  });
  ipcMain.handle(optionalToolsChannels.choosePath, async (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    const kind = toolPathKindSchema.parse(input);
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: kind === "directory" ? "Choose folder" : "Choose pdfLaTeX",
      properties: kind === "directory" ? ["openDirectory", "createDirectory"] : ["openFile"],
    });
    return selection.canceled ? null : selection.filePaths[0] ?? null;
  });
}
