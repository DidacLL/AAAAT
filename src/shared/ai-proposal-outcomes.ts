import { z } from "zod";

import {
  jobExtractionNewFieldSchema,
  jobExtractionProposalSchema,
  type JobExtractionRequest,
} from "./ai-contracts";
import {
  aiExchangeDiagnosticSchema,
  aiStructuredOutputModeSchema,
  type AiExchangeDiagnostic,
} from "./ai-diagnostics";

export const jobExtractionProposalIssueKindSchema = z.enum([
  "invalid",
  "stale",
  "new_field_invalid",
]);
export type JobExtractionProposalIssueKind = z.infer<
  typeof jobExtractionProposalIssueKindSchema
>;

export const jobExtractionProposalIssueSchema = z
  .object({
    kind: jobExtractionProposalIssueKindSchema,
    fieldId: z.string().uuid().nullable(),
    fieldLabel: z.string().trim().min(1).max(120).nullable(),
    proposedValue: z.unknown(),
    reason: z.string().trim().min(1).max(4000),
  })
  .strict();
export type JobExtractionProposalIssue = z.infer<
  typeof jobExtractionProposalIssueSchema
>;

export const jobExtractionExchangeSchema = z
  .object({
    operation: z.literal("job_extraction"),
    endpoint: z.string().url(),
    model: z.string().min(1),
    systemInstruction: z.string(),
    userPayload: z.string(),
    rawModelResponse: z.string(),
    structuredOutputMode: aiStructuredOutputModeSchema,
    providerValidationError: z.string(),
  })
  .strict();
export type JobExtractionExchange = z.infer<typeof jobExtractionExchangeSchema>;

export const partialJobExtractionResultSchema = z
  .object({
    proposals: z.array(jobExtractionProposalSchema).max(32),
    newFields: z.array(jobExtractionNewFieldSchema).max(8).default([]),
    issues: z.array(jobExtractionProposalIssueSchema).max(40).default([]),
    exchange: jobExtractionExchangeSchema.optional(),
  })
  .strict();
export type PartialJobExtractionResult = z.infer<
  typeof partialJobExtractionResultSchema
>;

export type PartialJobExtractionRequest = JobExtractionRequest;
export type InspectableAiExchange = JobExtractionExchange | AiExchangeDiagnostic;

export function inspectableAiExchangeSchema() {
  return z.union([jobExtractionExchangeSchema, aiExchangeDiagnosticSchema]);
}
