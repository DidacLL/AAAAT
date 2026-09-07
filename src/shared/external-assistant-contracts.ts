import { z } from "zod";

import { cvAssistantNotesSchema, cvAssistantTagsSchema } from "./cv-descriptor-contracts";

const externalCareerContextValueSchema = z
  .string()
  .max(10000)
  .refine((value) => value.trim().length > 0, {
    message: "External career-context values must contain non-whitespace text.",
  });

export const externalCareerContextRequestSchema = z.object({}).strict();

export const externalCareerContextSchema = z
  .object({
    careerDirection: externalCareerContextValueSchema.optional(),
    objectives: externalCareerContextValueSchema.optional(),
    constraints: externalCareerContextValueSchema.optional(),
    targetRoles: externalCareerContextValueSchema.optional(),
    targetMarketsLocations: externalCareerContextValueSchema.optional(),
    workPreferences: externalCareerContextValueSchema.optional(),
    applicationWritingPreferences: externalCareerContextValueSchema.optional(),
  })
  .strict();

export type ExternalCareerContext = z.infer<typeof externalCareerContextSchema>;

export const externalCvDescriptionsRequestSchema = z.object({}).strict();

export const externalCvDescriptionSchema = z
  .object({
    label: z.string().regex(/^CV [1-9]\d*$/),
    tags: cvAssistantTagsSchema,
    notes: cvAssistantNotesSchema.optional(),
  })
  .strict();

export const externalCvDescriptionsSchema = z
  .object({ cvs: z.array(externalCvDescriptionSchema).max(100) })
  .strict();
export type ExternalCvDescriptions = z.infer<typeof externalCvDescriptionsSchema>;
