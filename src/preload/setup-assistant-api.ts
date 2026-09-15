import {
  setupAssistantAccessSchema,
  setupAssistantAccessUpdateSchema,
  setupAssistantChannels,
  setupRenderingSelfTestResultSchema,
  type SetupAssistantDesktopApi,
} from "../shared/setup-assistant-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createSetupAssistantDesktopApi(invoke: Invoke): SetupAssistantDesktopApi {
  return Object.freeze({
    setupAssistant: Object.freeze({
      access: async () =>
        setupAssistantAccessSchema.parse(await invoke(setupAssistantChannels.accessCurrent)),
      updateAccess: async (update) =>
        setupAssistantAccessSchema.parse(
          await invoke(
            setupAssistantChannels.accessUpdate,
            setupAssistantAccessUpdateSchema.parse(update),
          ),
        ),
      runRenderingSelfTest: async () =>
        setupRenderingSelfTestResultSchema.parse(
          await invoke(setupAssistantChannels.renderingSelfTest),
        ),
    }),
  });
}
