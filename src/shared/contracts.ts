import { z } from "zod";

export const channels = Object.freeze({
  systemInfo: "aaaat:system-info",
  workspaceInitialize: "aaaat:workspace-initialize",
} as const);

export const systemInfoSchema = z
  .object({
    appVersion: z.string().min(1),
    electronVersion: z.string().min(1),
    nodeVersion: z.string().min(1),
  })
  .strict();

export type SystemInfo = z.infer<typeof systemInfoSchema>;

export const workspaceStatusSchema = z
  .object({
    state: z.literal("ready"),
    schemaVersion: z.number().int().positive(),
    initializedAt: z.string().min(1),
  })
  .strict();

export type WorkspaceStatus = z.infer<typeof workspaceStatusSchema>;

export interface DesktopApi {
  readonly system: {
    readonly info: () => Promise<SystemInfo>;
  };
  readonly workspace: {
    readonly initialize: () => Promise<WorkspaceStatus>;
  };
}
