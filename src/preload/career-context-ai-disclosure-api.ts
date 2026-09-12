import {
  careerContextAiDisclosureChannels,
  careerContextAiDisclosureSchema,
  careerContextAiDisclosureUpdateSchema,
  type CareerContextAiDisclosureDesktopApi,
} from "../shared/career-context-ai-disclosure-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createCareerContextAiDisclosureDesktopApi(
  invoke: Invoke,
): CareerContextAiDisclosureDesktopApi {
  return Object.freeze({
    careerContextAiDisclosure: Object.freeze({
      current: async () =>
        careerContextAiDisclosureSchema.parse(
          await invoke(careerContextAiDisclosureChannels.current),
        ),
      update: async (
        input: Parameters<CareerContextAiDisclosureDesktopApi["careerContextAiDisclosure"]["update"]>[0],
      ) =>
        careerContextAiDisclosureSchema.parse(
          await invoke(
            careerContextAiDisclosureChannels.update,
            careerContextAiDisclosureUpdateSchema.parse(input),
          ),
        ),
    }),
  });
}
