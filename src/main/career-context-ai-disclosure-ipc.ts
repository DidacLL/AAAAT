import { ipcMain, type BrowserWindow } from "electron";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";

import {
  careerContextAiDisclosureChannels,
  careerContextAiDisclosureSchema,
  careerContextAiDisclosureUpdateSchema,
} from "../shared/career-context-ai-disclosure-contracts";
import {
  getCareerContextAiDisclosure,
  updateCareerContextAiDisclosure,
} from "./career-context-ai-disclosure-service";

export function registerCareerContextAiDisclosureIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(careerContextAiDisclosureChannels)) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle(careerContextAiDisclosureChannels.current, (event) => {
    assertTrustedSender(event, mainWindow);
    return careerContextAiDisclosureSchema.parse(
      getCareerContextAiDisclosure(requireWorkspaceRoot()),
    );
  });

  ipcMain.handle(careerContextAiDisclosureChannels.update, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    return careerContextAiDisclosureSchema.parse(
      updateCareerContextAiDisclosure(
        requireWorkspaceRoot(),
        careerContextAiDisclosureUpdateSchema.parse(input),
      ),
    );
  });
}
