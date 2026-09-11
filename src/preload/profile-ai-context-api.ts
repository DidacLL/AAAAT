import {
  profileAiContextChannels,
  profileAiContextItemIdSchema,
  profileAiContextPreferenceSchema,
  profileAiContextUpdateSchema,
  type ProfileAiContextDesktopApi,
} from "../shared/profile-ai-context-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createProfileAiContextDesktopApi(invoke: Invoke): ProfileAiContextDesktopApi {
  return Object.freeze({
    profileAiContext: Object.freeze({
      current: async (itemId: string) =>
        profileAiContextPreferenceSchema.parse(
          await invoke(profileAiContextChannels.current, profileAiContextItemIdSchema.parse(itemId)),
        ),
      update: async (input) => {
        const update = profileAiContextUpdateSchema.parse(input);
        return profileAiContextPreferenceSchema.parse(
          await invoke(profileAiContextChannels.update, update),
        );
      },
    }),
  });
}
