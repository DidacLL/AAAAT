import { z } from "zod";

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
