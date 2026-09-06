import {
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
    }),
  });
}
