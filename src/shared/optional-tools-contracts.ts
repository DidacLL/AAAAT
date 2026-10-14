import { z } from "zod";

export const optionalToolsChannels = Object.freeze({
  current: "aaaat:optional-tools-current",
  install: "aaaat:optional-tools-install",
  cancel: "aaaat:optional-tools-cancel",
  dismiss: "aaaat:optional-tools-dismiss",
  startupCurrent: "aaaat:local-ai-startup-current",
  startupSave: "aaaat:local-ai-startup-save",
  locationsSave: "aaaat:tool-locations-save",
  choosePath: "aaaat:tool-path-choose",
});

export const toolLocationsSchema = z.object({
  installDirectory: z.string().trim().min(1),
  downloadDirectory: z.string().trim().min(1),
  pdfLatexExecutable: z.string().trim(),
}).strict();
export type ToolLocations = z.infer<typeof toolLocationsSchema>;
export const toolPathKindSchema = z.enum(["directory", "pdflatex"]);

export const localAiStartupInputSchema = z.object({ enabled: z.boolean(), script: z.string().max(16000) }).strict();
export const localAiStartupSettingsSchema = localAiStartupInputSchema.extend({ defaultScript: z.string(), shell: z.enum(["PowerShell", "Shell"]), error: z.string().nullable() }).strict();
export type LocalAiStartupInput = z.infer<typeof localAiStartupInputSchema>;
export type LocalAiStartupSettings = z.infer<typeof localAiStartupSettingsSchema>;

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
  locations: toolLocationsSchema,
}).strict();

export type OptionalToolsChoice = z.infer<typeof optionalToolsChoiceSchema>;
export type OptionalToolsStatus = z.infer<typeof optionalToolsStatusSchema>;
export interface OptionalToolsDesktopApi {
  readonly optionalTools: {
    current(): Promise<OptionalToolsStatus>;
    install(choice: OptionalToolsChoice): Promise<OptionalToolsStatus>;
    cancel(): Promise<void>;
    dismiss(): Promise<void>;
    startupCurrent(): Promise<LocalAiStartupSettings>;
    startupSave(input: LocalAiStartupInput): Promise<LocalAiStartupSettings>;
    locationsSave(input: ToolLocations): Promise<void>;
    choosePath(kind: "directory" | "pdflatex"): Promise<string | null>;
  };
}
