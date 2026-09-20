import { z } from "zod";

import {
  applicationDocumentsIntentSchema,
  applicationDocumentsResultSchema,
} from "./application-material-contracts";

export const applicationHandoffSchema = z
  .object({
    format: z.literal("aaaat-application-handoff"),
    version: z.literal(1),
    intention: applicationDocumentsIntentSchema,
  })
  .strict();
export type ApplicationHandoff = z.infer<typeof applicationHandoffSchema>;

export const applicationHandoffImportResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("cancelled") }).strict(),
  z
    .object({
      status: z.literal("imported"),
      result: applicationDocumentsResultSchema,
    })
    .strict(),
]);
export type ApplicationHandoffImportResult = z.infer<
  typeof applicationHandoffImportResultSchema
>;

export const applicationHandoffChannels = Object.freeze({
  importFile: "aaaat:application-handoff-import-file",
} as const);

export interface ApplicationHandoffDesktopApi {
  readonly applicationHandoff: {
    readonly importFile: () => Promise<ApplicationHandoffImportResult>;
  };
}
