import { z } from "zod";

import { aiConnectionInputSchema } from "./ai-contracts";
import { aiOperationSchema } from "./ai-connection-contracts";

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
