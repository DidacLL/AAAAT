import { z } from "zod";

export const careerContextAiDisclosureChannels = Object.freeze({
  current: "aaaat:career-context-ai-disclosure-current",
  update: "aaaat:career-context-ai-disclosure-update",
} as const);

export const careerContextAiDisclosureKeySchema = z.enum([
  "careerDirection",
  "objectives",
  "constraints",
  "targetRoles",
  "targetMarketsLocations",
  "workPreferences",
  "applicationWritingPreferences",
]);
export type CareerContextAiDisclosureKey = z.infer<typeof careerContextAiDisclosureKeySchema>;

export const careerContextAiDisclosureSchema = z
  .object({
    careerDirection: z.boolean(),
    objectives: z.boolean(),
    constraints: z.boolean(),
    targetRoles: z.boolean(),
    targetMarketsLocations: z.boolean(),
    workPreferences: z.boolean(),
    applicationWritingPreferences: z.boolean(),
  })
  .strict();
export type CareerContextAiDisclosure = z.infer<typeof careerContextAiDisclosureSchema>;

export const careerContextAiDisclosureUpdateSchema = z
  .object({
    key: careerContextAiDisclosureKeySchema,
    share: z.boolean(),
  })
  .strict();
export type CareerContextAiDisclosureUpdate = z.infer<
  typeof careerContextAiDisclosureUpdateSchema
>;

export interface CareerContextAiDisclosureDesktopApi {
  readonly careerContextAiDisclosure: {
    readonly current: () => Promise<CareerContextAiDisclosure>;
    readonly update: (
      input: CareerContextAiDisclosureUpdate,
    ) => Promise<CareerContextAiDisclosure>;
  };
}
