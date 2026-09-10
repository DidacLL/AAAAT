import { z } from "zod";

import { aiOperationSchema, aiOperations } from "./ai-connection-contracts";

export const setupEnvironmentChannels = Object.freeze({
  current: "aaaat:setup-environment-current",
  connectVscode: "aaaat:setup-environment-connect-vscode",
} as const);

export const vscodeConnectionResultSchema = z
  .object({
    status: z.enum(["configured", "already-configured", "cancelled", "failed"]),
    message: z.string().min(1).max(240),
  })
  .strict();
export type VscodeConnectionResult = z.infer<typeof vscodeConnectionResultSchema>;

export const setupTexCommandSchema = z.enum(["latexmk", "pdflatex"]);
export type SetupTexCommand = z.infer<typeof setupTexCommandSchema>;

export const setupTexCommandStatusSchema = z
  .object({
    command: setupTexCommandSchema,
    available: z.boolean(),
    version: z.string().min(1).max(160).nullable(),
  })
  .strict()
  .superRefine((status, context) => {
    if (!status.available && status.version !== null) {
      context.addIssue({ code: "custom", message: "Unavailable TeX commands cannot report a version." });
    }
  });
export type SetupTexCommandStatus = z.infer<typeof setupTexCommandStatusSchema>;

export const setupAiOperationStatusSchema = z
  .object({
    operation: aiOperationSchema,
    available: z.boolean(),
    connectionName: z.string().min(1).max(120).nullable(),
  })
  .strict()
  .superRefine((status, context) => {
    if (status.available !== (status.connectionName !== null)) {
      context.addIssue({
        code: "custom",
        message: "AI operation availability must agree with its selected connection.",
      });
    }
  });
export type SetupAiOperationStatus = z.infer<typeof setupAiOperationStatusSchema>;

const setupTexCommandListSchema = z
  .array(setupTexCommandStatusSchema)
  .length(setupTexCommandSchema.options.length)
  .superRefine((commands, context) => {
    const names = commands.map((command) => command.command);
    if (new Set(names).size !== setupTexCommandSchema.options.length) {
      context.addIssue({ code: "custom", message: "Setup status must report each required TeX command once." });
    }
  });

const setupAiOperationListSchema = z
  .array(setupAiOperationStatusSchema)
  .length(aiOperations.length)
  .superRefine((operations, context) => {
    const names = operations.map((operation) => operation.operation);
    if (new Set(names).size !== aiOperations.length) {
      context.addIssue({ code: "custom", message: "Setup status must report each AI operation once." });
    }
  });

export const setupEnvironmentSnapshotSchema = z
  .object({
    workspaceReady: z.boolean(),
    tex: z
      .object({
        commands: setupTexCommandListSchema,
        documentRenderingReady: z.boolean(),
      })
      .strict(),
    ai: z
      .object({
        configurationReadable: z.boolean(),
        connectionCount: z.number().int().min(0).max(16),
        operations: setupAiOperationListSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((snapshot, context) => {
    const renderingReady = snapshot.tex.commands.every((command) => command.available);
    if (snapshot.tex.documentRenderingReady !== renderingReady) {
      context.addIssue({
        code: "custom",
        message: "Document-rendering readiness must agree with the required TeX commands.",
      });
    }
    if (!snapshot.ai.configurationReadable && snapshot.ai.connectionCount !== 0) {
      context.addIssue({
        code: "custom",
        message: "Unreadable AI configuration cannot report configured connections.",
      });
    }
  });
export type SetupEnvironmentSnapshot = z.infer<typeof setupEnvironmentSnapshotSchema>;

export interface SetupEnvironmentDesktopApi {
  readonly setupEnvironment: {
    readonly current: () => Promise<SetupEnvironmentSnapshot>;
    readonly connectVscode: () => Promise<VscodeConnectionResult>;
  };
}
