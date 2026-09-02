import { z } from "zod";

export const channels = Object.freeze({
  systemInfo: "aaaat:system-info",
  workspaceCurrent: "aaaat:workspace-current",
  workspaceChoose: "aaaat:workspace-choose",
} as const);

export const systemInfoSchema = z
  .object({
    appVersion: z.string().min(1),
    electronVersion: z.string().min(1),
    nodeVersion: z.string().min(1),
  })
  .strict();

export type SystemInfo = z.infer<typeof systemInfoSchema>;

export const workspaceChoiceSchema = z.enum(["create", "open"]);
export type WorkspaceChoice = z.infer<typeof workspaceChoiceSchema>;

export const workspaceInfoSchema = z
  .object({
    rootPath: z.string().min(1),
  })
  .strict();

export const optionalWorkspaceInfoSchema = workspaceInfoSchema.nullable();
export type WorkspaceInfo = z.infer<typeof workspaceInfoSchema>;

export interface DesktopApi {
  readonly system: {
    readonly info: () => Promise<SystemInfo>;
  };
  readonly workspace: {
    readonly current: () => Promise<WorkspaceInfo | null>;
    readonly choose: (choice: WorkspaceChoice) => Promise<WorkspaceInfo | null>;
  };
}
