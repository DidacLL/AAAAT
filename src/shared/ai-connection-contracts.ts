import { z } from "zod";

import { aiConnectionInputSchema } from "./ai-contracts";

export const aiConnectionManagementChannels = Object.freeze({
  list: "aaaat:ai-connections-list",
  save: "aaaat:ai-connections-save",
  setDefault: "aaaat:ai-connections-set-default",
  remove: "aaaat:ai-connections-remove",
} as const);

export const aiConnectionIdSchema = z.string().uuid();

export const namedAiConnectionInputSchema = aiConnectionInputSchema
  .extend({ id: aiConnectionIdSchema.optional() })
  .strict();
export type NamedAiConnectionInput = z.infer<typeof namedAiConnectionInputSchema>;

export const namedAiConnectionSchema = aiConnectionInputSchema
  .extend({
    id: aiConnectionIdSchema,
    isDefault: z.boolean(),
  })
  .strict();
export type NamedAiConnection = z.infer<typeof namedAiConnectionSchema>;

export const namedAiConnectionListSchema = z.array(namedAiConnectionSchema).max(16);
export type NamedAiConnectionList = z.infer<typeof namedAiConnectionListSchema>;

export interface AiConnectionDesktopApi {
  readonly aiConnections: {
    readonly list: () => Promise<NamedAiConnection[]>;
    readonly save: (input: NamedAiConnectionInput) => Promise<NamedAiConnection[]>;
    readonly setDefault: (connectionId: string) => Promise<NamedAiConnection[]>;
    readonly remove: (connectionId: string) => Promise<NamedAiConnection[]>;
  };
}
