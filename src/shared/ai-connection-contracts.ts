import { z } from "zod";

import { aiConnectionInputSchema } from "./ai-contracts";

export const aiOperationSchema = z.enum([
  "fit_assessment",
  "job_extraction",
  "historical_field_discovery",
  "variant_recommendation",
  "cv_tailoring",
  "cover_letter_draft",
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
});

export const aiConnectionManagementChannels = Object.freeze({
  list: "aaaat:ai-connections-list",
  save: "aaaat:ai-connections-save",
  setDefault: "aaaat:ai-connections-set-default",
  remove: "aaaat:ai-connections-remove",
  validateOperation: "aaaat:ai-connections-validate-operation",
  setOperationDefault: "aaaat:ai-connections-set-operation-default",
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

export interface AiConnectionDesktopApi {
  readonly aiConnections: {
    readonly list: () => Promise<NamedAiConnection[]>;
    readonly save: (input: NamedAiConnectionInput) => Promise<NamedAiConnection[]>;
    readonly setDefault: (connectionId: string) => Promise<NamedAiConnection[]>;
    readonly remove: (connectionId: string) => Promise<NamedAiConnection[]>;
    readonly validateOperation: (input: AiConnectionOperationInput) => Promise<NamedAiConnection[]>;
    readonly setOperationDefault: (input: AiConnectionOperationInput) => Promise<NamedAiConnection[]>;
  };
}
