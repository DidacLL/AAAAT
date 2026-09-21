import { ipcMain, type BrowserWindow } from "electron";

import {
  profileVariantChannels,
  profileVariantInputSchema,
  profileVariantListSchema,
  profileVariantRecordSchema,
  profileVariantUpdateSchema,
} from "../shared/profile-variant-contracts";
import { assertTrustedSender, requireWorkspaceRoot } from "./desktop-ipc-context";
import {
  createProfileVariant,
  listProfileVariants,
  removeProfileVariant,
  updateProfileVariant,
} from "./profile-variant-service";

export function registerProfileVariantIpc(mainWindow: BrowserWindow): void {
  for (const channel of Object.values(profileVariantChannels)) ipcMain.removeHandler(channel);

  ipcMain.handle(profileVariantChannels.list, (event) => {
    assertTrustedSender(event, mainWindow);
    return profileVariantListSchema.parse(
      listProfileVariants(requireWorkspaceRoot()),
    );
  });

  ipcMain.handle(profileVariantChannels.create, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    createProfileVariant(
      requireWorkspaceRoot(),
      profileVariantInputSchema.parse(input),
    );
    return profileVariantListSchema.parse(
      listProfileVariants(requireWorkspaceRoot()),
    );
  });

  ipcMain.handle(profileVariantChannels.update, (event, input: unknown) => {
    assertTrustedSender(event, mainWindow);
    updateProfileVariant(
      requireWorkspaceRoot(),
      profileVariantUpdateSchema.parse(input),
    );
    return profileVariantListSchema.parse(
      listProfileVariants(requireWorkspaceRoot()),
    );
  });

  ipcMain.handle(profileVariantChannels.remove, (event, variantId: unknown) => {
    assertTrustedSender(event, mainWindow);
    removeProfileVariant(
      requireWorkspaceRoot(),
      profileVariantRecordSchema.shape.id.parse(variantId),
    );
    return profileVariantListSchema.parse(
      listProfileVariants(requireWorkspaceRoot()),
    );
  });
}
