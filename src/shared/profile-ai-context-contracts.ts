import { z } from "zod";

import { aiContextModeSchema } from "./contracts";

export const profileAiContextChannels = Object.freeze({
  current: "aaaat:profile-ai-context-current",
  update: "aaaat:profile-ai-context-update",
} as const);

export const profileAiContextItemIdSchema = z.string().uuid();

export const profileAiContextPreferenceSchema = z
  .object({
    itemId: profileAiContextItemIdSchema,
    aiContextMode: aiContextModeSchema,
  })
  .strict();
export type ProfileAiContextPreference = z.infer<typeof profileAiContextPreferenceSchema>;

export const profileAiContextUpdateSchema = profileAiContextPreferenceSchema;
export type ProfileAiContextUpdate = z.infer<typeof profileAiContextUpdateSchema>;

export interface ProfileAiContextDesktopApi {
  readonly profileAiContext: {
    readonly current: (itemId: string) => Promise<ProfileAiContextPreference>;
    readonly update: (input: ProfileAiContextUpdate) => Promise<ProfileAiContextPreference>;
  };
}
