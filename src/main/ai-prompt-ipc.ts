import { ipcMain, type BrowserWindow } from "electron";

import { aiOperationSchema } from "../shared/ai-connection-contracts";
import {
  aiPromptChannels,
  aiPromptDisclosureListSchema,
  aiPromptUpdateSchema,
} from "../shared/ai-prompt-contracts";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";
import {
  listAiPromptDisclosures,
  resetAiPromptInstruction,
  saveAiPromptInstruction,
} from "./ai-prompt-service";

export function registerAiPromptIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(aiPromptChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(aiPromptChannels.list, (event) => {
    assertTrustedSender(event, mainWindow);
    return aiPromptDisclosureListSchema.parse(
      listAiPromptDisclosures(requireWorkspaceRoot()),
    );
  });

  ipcMain.handle(aiPromptChannels.save, (event, raw: unknown) => {
    assertTrustedSender(event, mainWindow);
    const input = aiPromptUpdateSchema.parse(raw);
    return aiPromptDisclosureListSchema.parse(
      saveAiPromptInstruction(
        requireWorkspaceRoot(),
        input.operation,
        input.instruction,
      ),
    );
  });

  ipcMain.handle(aiPromptChannels.reset, (event, raw: unknown) => {
    assertTrustedSender(event, mainWindow);
    return aiPromptDisclosureListSchema.parse(
      resetAiPromptInstruction(
        requireWorkspaceRoot(),
        aiOperationSchema.parse(raw),
      ),
    );
  });
}
