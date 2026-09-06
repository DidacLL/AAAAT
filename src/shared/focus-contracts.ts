import { z } from "zod";

export const focusChannels = Object.freeze({
  current: "aaaat:focus-material-current",
  update: "aaaat:focus-material-update",
} as const);

export const focusMaterialPreferencesSchema = z
  .object({
    sources: z.boolean(),
    concepts: z.boolean(),
    todos: z.boolean(),
    documents: z.boolean(),
  })
  .strict();
export type FocusMaterialPreferences = z.infer<typeof focusMaterialPreferencesSchema>;

export interface FocusDesktopApi {
  readonly focus: {
    readonly current: () => Promise<FocusMaterialPreferences>;
    readonly update: (preferences: FocusMaterialPreferences) => Promise<FocusMaterialPreferences>;
  };
}
