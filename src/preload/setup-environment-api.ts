import {
  externalAssistantConnectionSchema,
  externalAssistantGuidanceCopyResultSchema,
  externalAssistantGuidanceExportResultSchema,
  externalAssistantGuidanceSchema,
  setupEnvironmentChannels,
  setupEnvironmentSnapshotSchema,
  type SetupEnvironmentDesktopApi,
} from "../shared/setup-environment-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createSetupEnvironmentDesktopApi(invoke: Invoke): SetupEnvironmentDesktopApi {
  return Object.freeze({
    setupEnvironment: Object.freeze({
      current: async () =>
        setupEnvironmentSnapshotSchema.parse(
          await invoke(setupEnvironmentChannels.current),
        ),
      refresh: async () =>
        setupEnvironmentSnapshotSchema.parse(
          await invoke(setupEnvironmentChannels.refresh),
        ),
      externalConnection: async () =>
        externalAssistantConnectionSchema.parse(
          await invoke(setupEnvironmentChannels.externalConnection),
        ),
      externalGuidance: async () =>
        externalAssistantGuidanceSchema.parse(
          await invoke(setupEnvironmentChannels.externalGuidance),
        ),
      copyExternalGuidance: async () =>
        externalAssistantGuidanceCopyResultSchema.parse(
          await invoke(setupEnvironmentChannels.externalGuidanceCopy),
        ),
      exportExternalGuidance: async () =>
        externalAssistantGuidanceExportResultSchema.parse(
          await invoke(setupEnvironmentChannels.externalGuidanceExport),
        ),
    }),
  });
}
