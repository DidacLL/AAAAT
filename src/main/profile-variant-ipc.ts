import path from "node:path";
import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import { profileVariantChannels, profileVariantInputSchema, profileVariantListSchema, profileVariantRecordSchema, profileVariantUpdateSchema } from "../shared/profile-variant-contracts";
import { createProfileVariant, listProfileVariants, removeProfileVariant, updateProfileVariant } from "./profile-variant-service";
import { readLastWorkspacePath } from "./workspace";
function assertTrustedSender(event: IpcMainInvokeEvent, mainWindow: BrowserWindow): void { if (event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) throw new Error("Untrusted IPC sender"); }
function requireWorkspaceRoot(): string { const rootPath = readLastWorkspacePath(path.join(app.getPath("userData"), "workspace-settings.json")); if (!rootPath) throw new Error("Choose an AAAAT workspace first."); return rootPath; }
function registerProfileVariantIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(profileVariantChannels)) ipcMain.removeHandler(channel);
  ipcMain.handle(profileVariantChannels.list, (event) => { assertTrustedSender(event, mainWindow); return profileVariantListSchema.parse(listProfileVariants(requireWorkspaceRoot())); });
  ipcMain.handle(profileVariantChannels.create, (event, input: unknown) => { assertTrustedSender(event, mainWindow); createProfileVariant(requireWorkspaceRoot(), profileVariantInputSchema.parse(input)); return profileVariantListSchema.parse(listProfileVariants(requireWorkspaceRoot())); });
  ipcMain.handle(profileVariantChannels.update, (event, input: unknown) => { assertTrustedSender(event, mainWindow); updateProfileVariant(requireWorkspaceRoot(), profileVariantUpdateSchema.parse(input)); return profileVariantListSchema.parse(listProfileVariants(requireWorkspaceRoot())); });
  ipcMain.handle(profileVariantChannels.remove, (event, variantId: unknown) => { assertTrustedSender(event, mainWindow); removeProfileVariant(requireWorkspaceRoot(), profileVariantRecordSchema.shape.id.parse(variantId)); return profileVariantListSchema.parse(listProfileVariants(requireWorkspaceRoot())); });
}
app.on("browser-window-created", (_event, mainWindow) => registerProfileVariantIpc(mainWindow));
