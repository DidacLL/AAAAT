import { aiOperationSchema, type AiOperation } from "../shared/ai-connection-contracts";
import { aiPromptChannels, aiPromptDisclosureListSchema, aiPromptUpdateSchema, type AiPromptDesktopApi, type AiPromptUpdate } from "../shared/ai-prompt-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;
export function createAiPromptDesktopApi(invoke: Invoke): AiPromptDesktopApi {
  return Object.freeze({ aiPrompts: Object.freeze({
    list: async () => aiPromptDisclosureListSchema.parse(await invoke(aiPromptChannels.list)),
    save: async (input: AiPromptUpdate) => aiPromptDisclosureListSchema.parse(await invoke(aiPromptChannels.save, aiPromptUpdateSchema.parse(input))),
    reset: async (operation: AiOperation) => aiPromptDisclosureListSchema.parse(await invoke(aiPromptChannels.reset, aiOperationSchema.parse(operation))),
  }) });
}
