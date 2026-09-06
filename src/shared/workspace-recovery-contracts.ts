import { z } from "zod";

import { workspaceInfoSchema } from "./contracts";

export const workspaceRecoveryChannels = Object.freeze({
  backup: "aaaat:workspace-recovery-backup",
  restore: "aaaat:workspace-recovery-restore",
} as const);

export const workspaceBackupResultSchema = z
  .object({ status: z.enum(["cancelled", "backed_up"]) })
  .strict();
export type WorkspaceBackupResult = z.infer<typeof workspaceBackupResultSchema>;

export const workspaceRestoreResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("cancelled") }).strict(),
  z
    .object({
      status: z.literal("restored"),
      workspace: workspaceInfoSchema,
    })
    .strict(),
]);
export type WorkspaceRestoreResult = z.infer<typeof workspaceRestoreResultSchema>;

export interface WorkspaceRecoveryDesktopApi {
  readonly workspaceRecovery: {
    readonly backup: () => Promise<WorkspaceBackupResult>;
    readonly restore: () => Promise<WorkspaceRestoreResult>;
  };
}
