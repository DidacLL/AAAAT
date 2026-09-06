import {
  focusChannels,
  focusMaterialPreferencesSchema,
  type FocusDesktopApi,
} from "../shared/focus-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createFocusDesktopApi(invoke: Invoke): FocusDesktopApi {
  return Object.freeze({
    focus: Object.freeze({
      current: async () =>
        focusMaterialPreferencesSchema.parse(await invoke(focusChannels.current)),
      update: async (preferences) =>
        focusMaterialPreferencesSchema.parse(
          await invoke(focusChannels.update, focusMaterialPreferencesSchema.parse(preferences)),
        ),
    }),
  });
}
