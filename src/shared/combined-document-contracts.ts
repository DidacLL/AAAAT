import { z } from "zod";

export const combinedDocumentChannels = Object.freeze({
  exportPacket: "aaaat:combined-document-export",
} as const);

export const combinedDocumentExportInputSchema = z
  .object({
    cvDocumentId: z.string().uuid(),
    coverLetterDocumentId: z.string().uuid(),
  })
  .strict()
  .refine((value) => value.cvDocumentId !== value.coverLetterDocumentId, {
    message: "Combined output requires two distinct working documents.",
  });
export type CombinedDocumentExportInput = z.infer<typeof combinedDocumentExportInputSchema>;

export const combinedDocumentExportResultSchema = z
  .object({ exportedPath: z.string().min(1) })
  .strict()
  .nullable();
export type CombinedDocumentExportResult = z.infer<typeof combinedDocumentExportResultSchema>;

export interface CombinedDocumentDesktopApi {
  readonly combinedDocuments: {
    readonly exportPacket: (
      input: CombinedDocumentExportInput,
    ) => Promise<CombinedDocumentExportResult>;
  };
}
