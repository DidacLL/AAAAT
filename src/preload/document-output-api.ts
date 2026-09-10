import {
  documentOutputChannels,
  documentOutputDocumentIdSchema,
  documentOutputOpenResultSchema,
  type DocumentOutputDesktopApi,
} from "../shared/document-output-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createDocumentOutputDesktopApi(invoke: Invoke): DocumentOutputDesktopApi {
  return Object.freeze({
    documentOutput: Object.freeze({
      open: async (documentId: string) =>
        documentOutputOpenResultSchema.parse(
          await invoke(
            documentOutputChannels.open,
            documentOutputDocumentIdSchema.parse(documentId),
          ),
        ),
    }),
  });
}
