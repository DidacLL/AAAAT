import { z } from "zod";

import {
  jobExtractionProposalSchema,
  tagInferenceNewTagSchema,
  type JobExtractionRequest,
  type TagInferenceRequest,
} from "./ai-contracts";
import {
  aiExchangeDiagnosticSchema,
  aiStructuredOutputModeSchema,
  type AiExchangeDiagnostic,
} from "./ai-diagnostics";

export const jobExtractionProposalIssueKindSchema = z.enum(["invalid", "stale"]);
export type JobExtractionProposalIssueKind = z.infer<typeof jobExtractionProposalIssueKindSchema>;

export const jobExtractionProposalIssueSchema = z
  .object({
    kind: jobExtractionProposalIssueKindSchema,
    fieldId: z.string().uuid().nullable(),
    fieldLabel: z.string().trim().min(1).max(120).nullable(),
    proposedValue: z.unknown(),
    reason: z.string().trim().min(1).max(4000),
  })
  .strict();
export type JobExtractionProposalIssue = z.infer<typeof jobExtractionProposalIssueSchema>;

export const tagInferenceExistingTagSchema = z
  .object({
    tagId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    evidence: z.string().trim().min(1).max(1500).optional(),
  })
  .strict();
export type TagInferenceExistingTag = z.infer<typeof tagInferenceExistingTagSchema>;

export const tagInferenceIssueSchema = z
  .object({
    proposedValue: z.unknown(),
    reason: z.string().trim().min(1).max(4000),
  })
  .strict();
export type TagInferenceIssue = z.infer<typeof tagInferenceIssueSchema>;

const exchangeFields = {
  endpoint: z.string().url(),
  model: z.string().min(1),
  systemInstruction: z.string(),
  userPayload: z.string(),
  rawModelResponse: z.string(),
  structuredOutputMode: aiStructuredOutputModeSchema,
  providerValidationError: z.string(),
} as const;

export const jobExtractionExchangeSchema = z
  .object({ operation: z.literal("job_extraction"), ...exchangeFields })
  .strict();
export type JobExtractionExchange = z.infer<typeof jobExtractionExchangeSchema>;

export const tagInferenceExchangeSchema = z
  .object({ operation: z.literal("tag_inference"), ...exchangeFields })
  .strict();
export type TagInferenceExchange = z.infer<typeof tagInferenceExchangeSchema>;

export const partialJobExtractionResultSchema = z
  .object({
    proposals: z.array(jobExtractionProposalSchema).max(64),
    issues: z.array(jobExtractionProposalIssueSchema).max(100).default([]),
    exchange: jobExtractionExchangeSchema.optional(),
  })
  .strict();
export type PartialJobExtractionResult = z.infer<typeof partialJobExtractionResultSchema>;

export const partialTagInferenceResultSchema = z
  .object({
    existingTags: z.array(tagInferenceExistingTagSchema).max(30),
    newTags: z.array(tagInferenceNewTagSchema).max(5),
    issues: z.array(tagInferenceIssueSchema).max(50).default([]),
    exchange: tagInferenceExchangeSchema.optional(),
  })
  .strict();
export type PartialTagInferenceResult = z.infer<typeof partialTagInferenceResultSchema>;

export type PartialJobExtractionRequest = JobExtractionRequest;
export type PartialTagInferenceRequest = TagInferenceRequest;
export type InspectableAiExchange = JobExtractionExchange | TagInferenceExchange | AiExchangeDiagnostic;

export function inspectableAiExchangeSchema() {
  return z.union([jobExtractionExchangeSchema, tagInferenceExchangeSchema, aiExchangeDiagnosticSchema]);
}
