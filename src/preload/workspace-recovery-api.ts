import {
  workspaceBackupResultSchema,
  workspaceRecoveryChannels,
  workspaceRestoreResultSchema,
  type WorkspaceRecoveryDesktopApi,
} from "../shared/workspace-recovery-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createWorkspaceRecoveryDesktopApi(
  invoke: Invoke,
): WorkspaceRecoveryDesktopApi {
  return Object.freeze({
    workspaceRecovery: Object.freeze({
      backup: async () =>
        workspaceBackupResultSchema.parse(await invoke(workspaceRecoveryChannels.backup)),
      restore: async () =>
        workspaceRestoreResultSchema.parse(await invoke(workspaceRecoveryChannels.restore)),
    }),
  });
}
