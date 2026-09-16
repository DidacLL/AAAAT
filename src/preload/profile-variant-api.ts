import {
  profileVariantChannels,
  profileVariantInputSchema,
  profileVariantListSchema,
  profileVariantRecordSchema,
  profileVariantUpdateSchema,
  type ProfileVariantDesktopApi,
  type ProfileVariantInput,
  type ProfileVariantUpdate,
} from "../shared/profile-variant-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createProfileVariantDesktopApi(invoke: Invoke): ProfileVariantDesktopApi {
  return Object.freeze({
    profileVariants: Object.freeze({
      list: async () => profileVariantListSchema.parse(await invoke(profileVariantChannels.list)),
      create: async (input: ProfileVariantInput) =>
        profileVariantListSchema.parse(
          await invoke(profileVariantChannels.create, profileVariantInputSchema.parse(input)),
        ),
      update: async (input: ProfileVariantUpdate) =>
        profileVariantListSchema.parse(
          await invoke(profileVariantChannels.update, profileVariantUpdateSchema.parse(input)),
        ),
      remove: async (variantId: string) =>
        profileVariantListSchema.parse(
          await invoke(profileVariantChannels.remove, profileVariantRecordSchema.shape.id.parse(variantId)),
        ),
    }),
  });
}
