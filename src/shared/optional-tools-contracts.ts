import { z } from "zod";

export const optionalToolsChannels = Object.freeze({
  current: "aaaat:optional-tools-current",
  install: "aaaat:optional-tools-install",
  cancel: "aaaat:optional-tools-cancel",
  dismiss: "aaaat:optional-tools-dismiss",
});

export const optionalToolsChoiceSchema = z.object({ localAi: z.boolean(), pdf: z.boolean() }).strict();
export const optionalToolsStatusSchema = z.object({
  packaged: z.boolean(),
  offered: z.boolean(),
  busy: z.boolean(),
  canCancel: z.boolean(),
  message: z.string(),
  downloadedBytes: z.number().nonnegative(),
  totalBytes: z.number().nonnegative(),
  localAiReady: z.boolean(),
  localAiSupported: z.boolean(),
  pdfReady: z.boolean(),
  pdfLabel: z.string(),
  error: z.string().nullable(),
}).strict();

export type OptionalToolsChoice = z.infer<typeof optionalToolsChoiceSchema>;
export type OptionalToolsStatus = z.infer<typeof optionalToolsStatusSchema>;
export interface OptionalToolsDesktopApi {
  readonly optionalTools: {
    current(): Promise<OptionalToolsStatus>;
    install(choice: OptionalToolsChoice): Promise<OptionalToolsStatus>;
    cancel(): Promise<void>;
    dismiss(): Promise<void>;
  };
}
