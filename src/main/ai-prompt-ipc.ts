import path from "node:path";
import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import { aiOperationSchema } from "../shared/ai-connection-contracts";
import { aiPromptChannels, aiPromptDisclosureListSchema, aiPromptUpdateSchema } from "../shared/ai-prompt-contracts";
import { listAiPromptDisclosures, resetAiPromptInstruction, saveAiPromptInstruction } from "./ai-prompt-service";
import { readLastWorkspacePath } from "./workspace";

function trusted(event: IpcMainInvokeEvent, window: BrowserWindow) {
  if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error("Untrusted IPC sender");
}
function root(): string {
  const value = readLastWorkspacePath(path.join(app.getPath("userData"), "workspace-settings.json"));
  if (!value) throw new Error("Choose an AAAAT workspace first.");
  return value;
}
function register(window: BrowserWindow) {
  for (const channel of Object.values(aiPromptChannels)) ipcMain.removeHandler(channel);
  ipcMain.handle(aiPromptChannels.list, (event) => { trusted(event, window); return aiPromptDisclosureListSchema.parse(listAiPromptDisclosures(root())); });
  ipcMain.handle(aiPromptChannels.save, (event, raw: unknown) => {
    trusted(event, window); const input = aiPromptUpdateSchema.parse(raw);
    return aiPromptDisclosureListSchema.parse(saveAiPromptInstruction(root(), input.operation, input.instruction));
  });
  ipcMain.handle(aiPromptChannels.reset, (event, raw: unknown) => {
    trusted(event, window); return aiPromptDisclosureListSchema.parse(resetAiPromptInstruction(root(), aiOperationSchema.parse(raw)));
  });
}
app.on("browser-window-created", (_event, window) => register(window));
