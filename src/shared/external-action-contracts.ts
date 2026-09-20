import { z } from "zod";

import { aiConnectionInputSchema } from "./ai-contracts";
import { aiOperationSchema } from "./ai-connection-contracts";

export const applicationDocumentOutputSchema = z.enum(["cv", "cover_letter"]);
export const applicationDocumentsIntentSchema = z
  .object({
    sourceText: z
      .string()
      .max(50000)
      .refine((value) => value.trim().length > 0, {
        message: "Application material must contain non-whitespace text.",
      }),
    outputs: z.array(applicationDocumentOutputSchema).min(1).max(2),
  })
  .strict()
  .refine((value) => new Set(value.outputs).size === value.outputs.length, {
    path: ["outputs"],
    message: "Application outputs must be unique.",
  });
export type ApplicationDocumentsIntent = z.infer<typeof applicationDocumentsIntentSchema>;

export const externalApplicationOutputSchema = applicationDocumentOutputSchema;
export const externalApplicationDocumentsInputSchema = applicationDocumentsIntentSchema;
export type ExternalApplicationDocumentsInput = ApplicationDocumentsIntent;

const applicationPreparedOutputSchema = z
  .object({ created: z.boolean(), aiPrepared: z.boolean() })
  .strict();
export const applicationDocumentsResultSchema = z
  .object({
    created: z.literal(true),
    cv: applicationPreparedOutputSchema,
    coverLetter: applicationPreparedOutputSchema,
  })
  .strict();
export type ApplicationDocumentsResult = z.infer<typeof applicationDocumentsResultSchema>;

export const externalApplicationDocumentsResultSchema = applicationDocumentsResultSchema;
export type ExternalApplicationDocumentsResult = ApplicationDocumentsResult;

export const externalConfiguratorConnectionInputSchema = aiConnectionInputSchema;
export type ExternalConfiguratorConnectionInput = z.infer<
  typeof externalConfiguratorConnectionInputSchema
>;

export const externalConfiguratorOperationInputSchema = z
  .object({
    connectionName: z.string().trim().min(1).max(120),
    operation: aiOperationSchema,
  })
  .strict();
export type ExternalConfiguratorOperationInput = z.infer<
  typeof externalConfiguratorOperationInputSchema
>;

export const externalConfiguratorConnectionResultSchema = z
  .object({ saved: z.literal(true) })
  .strict();
export const externalConfiguratorValidationResultSchema = z
  .object({ validated: z.literal(true), operation: aiOperationSchema })
  .strict();
export const externalConfiguratorDefaultResultSchema = z
  .object({ defaulted: z.literal(true), operation: aiOperationSchema })
  .strict();
