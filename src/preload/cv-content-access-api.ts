import {
  cvContentAccessChannels,
  cvContentAccessSchema,
  cvContentAccessUpdateSchema,
  type CvContentAccessDesktopApi,
} from "../shared/cv-content-access-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createCvContentAccessDesktopApi(invoke: Invoke): CvContentAccessDesktopApi {
  const cvContentAccess = Object.freeze({
    current: async (documentId: string) =>
      cvContentAccessSchema.parse(
        await invoke(cvContentAccessChannels.current, cvContentAccessSchema.shape.documentId.parse(documentId)),
      ),
    update: async (input: Parameters<CvContentAccessDesktopApi["cvContentAccess"]["update"]>[0]) =>
      cvContentAccessSchema.parse(
        await invoke(cvContentAccessChannels.update, cvContentAccessUpdateSchema.parse(input)),
      ),
  });
  return Object.freeze({ cvContentAccess });
}
