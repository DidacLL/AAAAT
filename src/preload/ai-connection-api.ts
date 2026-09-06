import {
  aiConnectionIdSchema,
  aiConnectionManagementChannels,
  namedAiConnectionInputSchema,
  namedAiConnectionListSchema,
  type AiConnectionDesktopApi,
} from "../shared/ai-connection-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createAiConnectionDesktopApi(invoke: Invoke): AiConnectionDesktopApi {
  return Object.freeze({
    aiConnections: Object.freeze({
      list: async () =>
        namedAiConnectionListSchema.parse(await invoke(aiConnectionManagementChannels.list)),
      save: async (input: Parameters<AiConnectionDesktopApi["aiConnections"]["save"]>[0]) =>
        namedAiConnectionListSchema.parse(
          await invoke(
            aiConnectionManagementChannels.save,
            namedAiConnectionInputSchema.parse(input),
          ),
        ),
      setDefault: async (connectionId: string) =>
        namedAiConnectionListSchema.parse(
          await invoke(
            aiConnectionManagementChannels.setDefault,
            aiConnectionIdSchema.parse(connectionId),
          ),
        ),
      remove: async (connectionId: string) =>
        namedAiConnectionListSchema.parse(
          await invoke(
            aiConnectionManagementChannels.remove,
            aiConnectionIdSchema.parse(connectionId),
          ),
        ),
    }),
  });
}
