import { ipcMain, type BrowserWindow } from "electron";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

import {
  setupAssistantAccessSchema,
  setupAssistantAccessUpdateSchema,
  setupAssistantChannels,
  setupRenderingSelfTestResultSchema,
} from "../shared/setup-assistant-contracts";
import {
  getSetupAssistantAccess,
  runRenderingSelfTest,
  updateSetupAssistantAccess,
} from "./setup-assistant-service";

export function registerSetupAssistantIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(setupAssistantChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(setupAssistantChannels.accessCurrent, (event) => {
    assertTrustedSender(event, mainWindow);
    return setupAssistantAccessSchema.parse(getSetupAssistantAccess(requireWorkspaceRoot()));
  });

  ipcMain.handle(setupAssistantChannels.accessUpdate, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return setupAssistantAccessSchema.parse(
      updateSetupAssistantAccess(
        requireWorkspaceRoot(),
        setupAssistantAccessUpdateSchema.parse(input),
      ),
    );
  });

  ipcMain.handle(setupAssistantChannels.renderingSelfTest, async (event) => {
    assertTrustedSender(event, mainWindow);
    return setupRenderingSelfTestResultSchema.parse(
      await runRenderingSelfTest(requireWorkspaceRoot()),
    );
  });

}
