import { z } from "zod";

import {
  candidatureRuntimeValueSchema,
  candidatureSourceDraftSchema,
} from "./contracts";
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

export const externalOpportunityResearchContextRequestSchema = z.object({}).strict();

export const externalOpportunityResearchInformationSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    value: candidatureRuntimeValueSchema,
  })
  .strict();

export const externalOpportunityResearchContextSchema = z
  .object({
    information: z.array(externalOpportunityResearchInformationSchema).max(64),
  })
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

export const externalCvContentRequestSchema = z.object({}).strict();

const externalCvItemKindSchema = z.enum([
  "identity",
  "contact",
  "summary",
  "experience",
  "education",
  "project",
  "skill",
  "certification",
  "language",
  "link",
]);

export const externalCvContentItemSchema = z
  .object({
    kind: externalCvItemKindSchema,
    title: z.string().min(1).max(200),
    subtitle: z.string().max(300).optional(),
    description: z.string().max(5000).optional(),
    startDate: z.string().max(40).optional(),
    endDate: z.string().max(40).optional(),
    url: z.string().url().max(2048).optional(),
  })
  .strict();

export const externalCvContentSchema = z
  .object({ items: z.array(externalCvContentItemSchema).max(200) })
  .strict()
  .nullable();
export type ExternalCvContent = z.infer<typeof externalCvContentSchema>;

export const externalCvRenderRequestSchema = z.object({}).strict();
export const externalCvRenderResultSchema = z
  .object({ rendered: z.literal(true) })
  .strict()
  .nullable();
export type ExternalCvRenderResult = z.infer<typeof externalCvRenderResultSchema>;
