import { z } from "zod";

import {
  candidatureRuntimeValueSchema,
  candidatureSourceDraftSchema,
} from "./contracts";

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

export const externalOpportunityResearchContextRequestSchema = z.object({}).strict();
export const externalOpportunityResearchInformationSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    value: candidatureRuntimeValueSchema,
  })
  .strict();
export const externalOpportunityResearchContextSchema = z
  .object({ information: z.array(externalOpportunityResearchInformationSchema).max(64) })
  .strict()
  .nullable();
export type ExternalOpportunityResearchContext = z.infer<
  typeof externalOpportunityResearchContextSchema
>;

export const externalCandidatureSourceAddInputSchema = z
  .object({ source: candidatureSourceDraftSchema })
  .strict()
  .refine(
    ({ source }) => [source.title, source.url, source.sourceText].some((value) => value.trim().length > 0),
    { path: ["source"], message: "Source must include a non-empty title, URL, or source text." },
  );
export type ExternalCandidatureSourceAddInput = z.infer<
  typeof externalCandidatureSourceAddInputSchema
>;
export const externalCandidatureSourceAddResultSchema = z
  .object({ retained: z.literal(true) })
  .strict()
  .nullable();
export type ExternalCandidatureSourceAddResult = z.infer<
  typeof externalCandidatureSourceAddResultSchema
>;
