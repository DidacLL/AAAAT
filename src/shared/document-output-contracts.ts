import { z } from "zod";

export const documentOutputChannels = Object.freeze({
  open: "aaaat:document-output-open",
  openProject: "aaaat:document-output-open-project",
} as const);

export const documentOutputDocumentIdSchema = z.string().uuid();
export const documentOutputOpenResultSchema = z.object({ opened: z.literal(true) }).strict();
export type DocumentOutputOpenResult = z.infer<typeof documentOutputOpenResultSchema>;

export interface DocumentOutputDesktopApi {
  readonly documentOutput: {
    readonly open: (documentId: string) => Promise<DocumentOutputOpenResult>;
    readonly openProject: (documentId: string) => Promise<DocumentOutputOpenResult>;
  };
}
