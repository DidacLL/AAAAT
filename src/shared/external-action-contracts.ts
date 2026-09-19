import { z } from "zod";

import { aiConnectionInputSchema } from "./ai-contracts";
import { aiOperationSchema } from "./ai-connection-contracts";

export const externalApplicationOutputSchema = z.enum(["cv", "cover_letter"]);
export const externalApplicationDocumentsInputSchema = z
  .object({
    sourceText: z.string().trim().min(1).max(50000),
    outputs: z.array(externalApplicationOutputSchema).min(1).max(2),
  })
  .strict()
  .refine((value) => new Set(value.outputs).size === value.outputs.length, {
    path: ["outputs"],
    message: "Application outputs must be unique.",
  });
export type ExternalApplicationDocumentsInput = z.infer<
  typeof externalApplicationDocumentsInputSchema
>;

const externalPreparedOutputSchema = z
  .object({ created: z.boolean(), aiPrepared: z.boolean() })
  .strict();
export const externalApplicationDocumentsResultSchema = z
  .object({
    created: z.literal(true),
    cv: externalPreparedOutputSchema,
    coverLetter: externalPreparedOutputSchema,
  })
  .strict();
export type ExternalApplicationDocumentsResult = z.infer<
  typeof externalApplicationDocumentsResultSchema
>;

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
