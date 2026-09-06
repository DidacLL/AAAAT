import { z } from "zod";

import { aiConnectionInputSchema } from "./ai-contracts";

export const aiOperationSchema = z.enum([
  "fit_assessment",
  "job_extraction",
  "historical_field_discovery",
  "variant_recommendation",
  "cv_tailoring",
  "cover_letter_draft",
  "candidature_comparison",
]);
export type AiOperation = z.infer<typeof aiOperationSchema>;

export const aiOperations = aiOperationSchema.options;

export const aiOperationLabels: Readonly<Record<AiOperation, string>> = Object.freeze({
  fit_assessment: "Fit assessment",
  job_extraction: "Job extraction",
  historical_field_discovery: "Historical field discovery",
  variant_recommendation: "Variant recommendation",
  cv_tailoring: "CV tailoring",
  cover_letter_draft: "Cover-letter drafting",
  candidature_comparison: "Candidature comparison",
});

export const aiConnectionManagementChannels = Object.freeze({
  list: "aaaat:ai-connections-list",
  save: "aaaat:ai-connections-save",
  setDefault: "aaaat:ai-connections-set-default",
  remove: "aaaat:ai-connections-remove",
  validateOperation: "aaaat:ai-connections-validate-operation",
  setOperationDefault: "aaaat:ai-connections-set-operation-default",
  exportPortable: "aaaat:ai-connections-export-portable",
  importPortable: "aaaat:ai-connections-import-portable",
} as const);

export const aiConnectionIdSchema = z.string().uuid();

export const aiConnectionOperationInputSchema = z
  .object({
    connectionId: aiConnectionIdSchema,
    operation: aiOperationSchema,
  })
  .strict();
export type AiConnectionOperationInput = z.infer<typeof aiConnectionOperationInputSchema>;

export const namedAiConnectionInputSchema = aiConnectionInputSchema
  .extend({ id: aiConnectionIdSchema.optional() })
  .strict();
export type NamedAiConnectionInput = z.infer<typeof namedAiConnectionInputSchema>;

export const namedAiConnectionSchema = aiConnectionInputSchema
  .extend({
    id: aiConnectionIdSchema,
    isDefault: z.boolean(),
    validatedOperations: z.array(aiOperationSchema).max(aiOperations.length),
    defaultForOperations: z.array(aiOperationSchema).max(aiOperations.length),
  })
  .strict();
export type NamedAiConnection = z.infer<typeof namedAiConnectionSchema>;

export const namedAiConnectionListSchema = z.array(namedAiConnectionSchema).max(16);
export type NamedAiConnectionList = z.infer<typeof namedAiConnectionListSchema>;

export const portableAiSetupSchema = z
  .object({
    format: z.literal("aaaat-ai-setup"),
    version: z.literal(1),
    connections: z.array(aiConnectionInputSchema).max(16),
    defaultConnectionName: z.string().trim().min(1).max(120).nullable(),
  })
  .strict()
  .superRefine((setup, context) => {
    const names = setup.connections.map((connection) => connection.name.toLocaleLowerCase());
    if (new Set(names).size !== names.length) {
      context.addIssue({ code: "custom", message: "Portable AI connection names must be unique." });
    }
    if (
      setup.defaultConnectionName !== null &&
      !names.includes(setup.defaultConnectionName.toLocaleLowerCase())
    ) {
      context.addIssue({ code: "custom", message: "The portable default AI connection must exist." });
    }
  });
export type PortableAiSetup = z.infer<typeof portableAiSetupSchema>;

export const portableAiSetupExportResultSchema = z.enum(["exported", "cancelled"]);
export type PortableAiSetupExportResult = z.infer<typeof portableAiSetupExportResultSchema>;

export const portableAiSetupImportResultSchema = z
  .object({
    status: z.enum(["imported", "cancelled"]),
    connections: namedAiConnectionListSchema,
  })
  .strict();
export type PortableAiSetupImportResult = z.infer<typeof portableAiSetupImportResultSchema>;

export interface AiConnectionDesktopApi {
  readonly aiConnections: {
    readonly list: () => Promise<NamedAiConnection[]>;
    readonly save: (input: NamedAiConnectionInput) => Promise<NamedAiConnection[]>;
    readonly setDefault: (connectionId: string) => Promise<NamedAiConnection[]>;
    readonly remove: (connectionId: string) => Promise<NamedAiConnection[]>;
    readonly validateOperation: (input: AiConnectionOperationInput) => Promise<NamedAiConnection[]>;
    readonly setOperationDefault: (input: AiConnectionOperationInput) => Promise<NamedAiConnection[]>;
    readonly exportPortable: () => Promise<PortableAiSetupExportResult>;
    readonly importPortable: () => Promise<PortableAiSetupImportResult>;
  };
}
