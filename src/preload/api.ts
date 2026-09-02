import {
  channels,
  optionalWorkspaceInfoSchema,
  systemInfoSchema,
  workspaceChoiceSchema,
  type DesktopApi,
} from "../shared/contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createDesktopApi(invoke: Invoke): DesktopApi {
  const system = Object.freeze({
    info: async () =>
      systemInfoSchema.parse(await invoke(channels.systemInfo)),
  });

  const workspace = Object.freeze({
    current: async () =>
      optionalWorkspaceInfoSchema.parse(
        await invoke(channels.workspaceCurrent),
      ),
    choose: async (choice: "create" | "open") =>
      optionalWorkspaceInfoSchema.parse(
        await invoke(channels.workspaceChoose, workspaceChoiceSchema.parse(choice)),
      ),
  });

  return Object.freeze({ system, workspace });
}
