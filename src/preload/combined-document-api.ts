import {
  combinedDocumentChannels,
  combinedDocumentExportInputSchema,
  combinedDocumentExportResultSchema,
  type CombinedDocumentDesktopApi,
} from "../shared/combined-document-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createCombinedDocumentDesktopApi(invoke: Invoke): CombinedDocumentDesktopApi {
  return Object.freeze({
    combinedDocuments: Object.freeze({
      exportPacket: async (
        input: Parameters<CombinedDocumentDesktopApi["combinedDocuments"]["exportPacket"]>[0],
      ) =>
        combinedDocumentExportResultSchema.parse(
          await invoke(
            combinedDocumentChannels.exportPacket,
            combinedDocumentExportInputSchema.parse(input),
          ),
        ),
    }),
  });
}
