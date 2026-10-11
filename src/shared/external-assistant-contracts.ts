import { z } from "zod";

import {
  operationReferenceSchema,
  providerDiscoveryFieldSchema,
} from "./ai-contracts";
import { partialJobExtractionResultSchema } from "./ai-proposal-outcomes";
import {
  candidatureRuntimeValueSchema,
  candidatureSourceDraftSchema,
} from "./contracts";

const externalCareerContextValueSchema = z
  .string()
  
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
    label: z.string().trim().min(1),
    value: candidatureRuntimeValueSchema,
  })
  .strict();
export const externalOpportunityResearchContextSchema = z
  .object({ information: z.array(externalOpportunityResearchInformationSchema) })
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

export const externalApplicationInformationTaskSchema = z
  .object({
    taskRef: operationReferenceSchema,
    instruction: z.string().trim().min(1),
    context: z.string().trim().min(1),
    fields: z.array(providerDiscoveryFieldSchema).min(1),
  })
  .strict();
export type ExternalApplicationInformationTask = z.infer<
  typeof externalApplicationInformationTaskSchema
>;

export const externalApplicationInformationProposalInputSchema = z
  .object({
    taskRef: operationReferenceSchema,
    proposals: z.array(z.unknown()),
  })
  .strict();
export type ExternalApplicationInformationProposalInput = z.infer<
  typeof externalApplicationInformationProposalInputSchema
>;

export const externalApplicationInformationPendingResultSchema = z
  .object({
    resultRef: operationReferenceSchema,
    taskRef: operationReferenceSchema,
    scopeFieldIds: z.array(z.string().uuid()).min(1),
    result: partialJobExtractionResultSchema,
  })
  .strict();
export type ExternalApplicationInformationPendingResult = z.infer<
  typeof externalApplicationInformationPendingResultSchema
>;

export const externalApplicationInformationPendingResultOptionalSchema =
  externalApplicationInformationPendingResultSchema.nullable();

export const externalInterviewPreparationInformationSchema = z
  .object({
    label: z.string().trim().min(1),
    value: z.string(),
  })
  .strict();

export const externalInterviewPreparationSourceSchema = z
  .object({
    title: z.string(),
    url: z.string(),
    sourceText: z.string(),
  })
  .strict();

export const externalInterviewPreparationContextSchema = z
  .object({
    information: z.array(externalInterviewPreparationInformationSchema),
    sources: z.array(externalInterviewPreparationSourceSchema),
  })
  .strict();
export type ExternalInterviewPreparationContext = z.infer<
  typeof externalInterviewPreparationContextSchema
>;

export const externalInterviewPreparationResultSchema = z
  .object({ text: z.string().trim().min(1) })
  .strict();
export type ExternalInterviewPreparationResult = z.infer<
  typeof externalInterviewPreparationResultSchema
>;
