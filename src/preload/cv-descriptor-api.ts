import {
  cvDescriptorChannels,
  cvDescriptorSchema,
  cvDescriptorUpdateSchema,
  type CvDescriptorDesktopApi,
} from "../shared/cv-descriptor-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createCvDescriptorDesktopApi(invoke: Invoke): CvDescriptorDesktopApi {
  const cvDescriptors = Object.freeze({
    current: async (documentId: string) =>
      cvDescriptorSchema.parse(
        await invoke(cvDescriptorChannels.current, cvDescriptorSchema.shape.documentId.parse(documentId)),
      ),
    update: async (input: Parameters<CvDescriptorDesktopApi["cvDescriptors"]["update"]>[0]) =>
      cvDescriptorSchema.parse(
        await invoke(cvDescriptorChannels.update, cvDescriptorUpdateSchema.parse(input)),
      ),
  });

  return Object.freeze({ cvDescriptors });
}
