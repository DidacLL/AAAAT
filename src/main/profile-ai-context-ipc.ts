import { ipcMain, type BrowserWindow } from "electron";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

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
