import {
  channels,
  optionalWorkspaceInfoSchema,
  profileItemInputSchema,
  profileItemSchema,
  profileItemUpdateSchema,
  profileSnapshotSchema,
  profileVariantInputSchema,
  profileVariantItemRuleInputSchema,
  profileVariantReorderSchema,
  profileVariantSchema,
  profileVariantUpdateSchema,
  resolvedProfileSchema,
  systemInfoSchema,
  workspaceChoiceSchema,
  type DesktopApi,
} from "../shared/contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createDesktopApi(invoke: Invoke): DesktopApi {
  const system = Object.freeze({
    info: async () =>
      systemInfoSchema.parse(await invoke(channels.systemInfo)),
  });

  const workspace = Object.freeze({
    current: async () =>
      optionalWorkspaceInfoSchema.parse(
        await invoke(channels.workspaceCurrent),
      ),
    choose: async (choice: "create" | "open") =>
      optionalWorkspaceInfoSchema.parse(
        await invoke(channels.workspaceChoose, workspaceChoiceSchema.parse(choice)),
      ),
  });

  const profile = Object.freeze({
    current: async () =>
      profileSnapshotSchema.parse(await invoke(channels.profileCurrent)),
    addItem: async (item: Parameters<DesktopApi["profile"]["addItem"]>[0]) =>
      profileSnapshotSchema.parse(
        await invoke(channels.profileAddItem, profileItemInputSchema.parse(item)),
      ),
    updateItem: async (
      update: Parameters<DesktopApi["profile"]["updateItem"]>[0],
    ) =>
      profileSnapshotSchema.parse(
        await invoke(
          channels.profileUpdateItem,
          profileItemUpdateSchema.parse(update),
        ),
      ),
    removeItem: async (itemId: string) =>
      profileSnapshotSchema.parse(
        await invoke(
          channels.profileRemoveItem,
          profileItemSchema.shape.id.parse(itemId),
        ),
      ),
    createVariant: async (
      variant: Parameters<DesktopApi["profile"]["createVariant"]>[0],
    ) =>
      profileSnapshotSchema.parse(
        await invoke(
          channels.profileCreateVariant,
          profileVariantInputSchema.parse(variant),
        ),
      ),
    updateVariant: async (
      variant: Parameters<DesktopApi["profile"]["updateVariant"]>[0],
    ) =>
      profileSnapshotSchema.parse(
        await invoke(
          channels.profileUpdateVariant,
          profileVariantUpdateSchema.parse(variant),
        ),
      ),
    removeVariant: async (variantId: string) =>
      profileSnapshotSchema.parse(
        await invoke(
          channels.profileRemoveVariant,
          profileVariantSchema.shape.id.parse(variantId),
        ),
      ),
    configureVariantItem: async (
      rule: Parameters<DesktopApi["profile"]["configureVariantItem"]>[0],
    ) =>
      profileSnapshotSchema.parse(
        await invoke(
          channels.profileConfigureVariantItem,
          profileVariantItemRuleInputSchema.parse(rule),
        ),
      ),
    reorderVariant: async (
      reorder: Parameters<DesktopApi["profile"]["reorderVariant"]>[0],
    ) =>
      profileSnapshotSchema.parse(
        await invoke(
          channels.profileReorderVariant,
          profileVariantReorderSchema.parse(reorder),
        ),
      ),
    resolveVariant: async (variantId: string) =>
      resolvedProfileSchema.parse(
        await invoke(
          channels.profileResolveVariant,
          profileVariantSchema.shape.id.parse(variantId),
        ),
      ),
  });

  return Object.freeze({ system, workspace, profile });
}
