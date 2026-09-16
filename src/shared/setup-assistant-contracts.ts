import { z } from "zod";

export const setupAssistantChannels = Object.freeze({
  accessCurrent: "aaaat:setup-assistant-access-current",
  accessUpdate: "aaaat:setup-assistant-access-update",
  renderingSelfTest: "aaaat:setup-assistant-rendering-self-test",
} as const);

export const setupAssistantAccessSchema = z
  .object({
    installerActionsAllowed: z.boolean(),
    configuratorActionsAllowed: z.boolean(),
  })
  .strict();
export type SetupAssistantAccess = z.infer<typeof setupAssistantAccessSchema>;

export const setupAssistantAccessUpdateSchema = setupAssistantAccessSchema;
export type SetupAssistantAccessUpdate = z.infer<typeof setupAssistantAccessUpdateSchema>;

export const setupRenderingSelfTestResultSchema = z
  .object({ passed: z.literal(true) })
  .strict();
export type SetupRenderingSelfTestResult = z.infer<typeof setupRenderingSelfTestResultSchema>;


export interface SetupAssistantDesktopApi {
  readonly setupAssistant: {
    readonly access: () => Promise<SetupAssistantAccess>;
    readonly updateAccess: (update: SetupAssistantAccessUpdate) => Promise<SetupAssistantAccess>;
    readonly runRenderingSelfTest: () => Promise<SetupRenderingSelfTestResult>;
  };
}
