import {
  channels,
  systemInfoSchema,
  workspaceStatusSchema,
  type DesktopApi,
} from "../shared/contracts";

type Invoke = (channel: string) => Promise<unknown>;

export function createDesktopApi(invoke: Invoke): DesktopApi {
  const system = Object.freeze({
    info: async () =>
      systemInfoSchema.parse(await invoke(channels.systemInfo)),
  });

  const workspace = Object.freeze({
    initialize: async () =>
      workspaceStatusSchema.parse(
        await invoke(channels.workspaceInitialize),
      ),
  });

  return Object.freeze({ system, workspace });
}
