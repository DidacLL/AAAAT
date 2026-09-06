import {
  aiConnectionIdSchema,
  aiConnectionManagementChannels,
  aiConnectionOperationInputSchema,
  namedAiConnectionInputSchema,
  namedAiConnectionListSchema,
  portableAiSetupExportResultSchema,
  portableAiSetupImportResultSchema,
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
      validateOperation: async (
        input: Parameters<AiConnectionDesktopApi["aiConnections"]["validateOperation"]>[0],
      ) =>
        namedAiConnectionListSchema.parse(
          await invoke(
            aiConnectionManagementChannels.validateOperation,
            aiConnectionOperationInputSchema.parse(input),
          ),
        ),
      setOperationDefault: async (
        input: Parameters<AiConnectionDesktopApi["aiConnections"]["setOperationDefault"]>[0],
      ) =>
        namedAiConnectionListSchema.parse(
          await invoke(
            aiConnectionManagementChannels.setOperationDefault,
            aiConnectionOperationInputSchema.parse(input),
          ),
        ),
      exportPortable: async () =>
        portableAiSetupExportResultSchema.parse(
          await invoke(aiConnectionManagementChannels.exportPortable),
        ),
      importPortable: async () =>
        portableAiSetupImportResultSchema.parse(
          await invoke(aiConnectionManagementChannels.importPortable),
        ),
    }),
  });
}
