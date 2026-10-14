import { z } from "zod";

import { aiConnectionInputSchema } from "./ai-contracts";

export const externalConfiguratorConnectionInputSchema = aiConnectionInputSchema;
export type ExternalConfiguratorConnectionInput = z.infer<
  typeof externalConfiguratorConnectionInputSchema
>;

export const externalConfiguratorSelectionInputSchema = z
  .object({
    connectionName: z.string().trim().min(1).max(120),
  })
  .strict();
export type ExternalConfiguratorSelectionInput = z.infer<
  typeof externalConfiguratorSelectionInputSchema
>;

export const externalConfiguratorConnectionResultSchema = z
  .object({ saved: z.literal(true) })
  .strict();
export const externalConfiguratorDefaultResultSchema = z.object({ defaulted: z.literal(true) }).strict();
