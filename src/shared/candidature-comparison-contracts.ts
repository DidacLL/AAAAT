import { z } from "zod";

import {
  aiConnectionStatusSchema,
  operationReferenceSchema,
} from "./ai-contracts";
import { candidatureRuntimeValueSchema } from "./contracts";

export const candidatureComparisonChannels = Object.freeze({
  preview: "aaaat:candidature-comparison-preview",
  run: "aaaat:candidature-comparison-run",
} as const);

export const candidatureComparisonRequestSchema = z
  .object({
    candidatureIds: z.array(z.string().uuid()).min(2).max(5),
  })
  .strict()
  .refine((value) => new Set(value.candidatureIds).size === value.candidatureIds.length, {
    message: "Select each candidature only once.",
  });
export type CandidatureComparisonRequest = z.infer<typeof candidatureComparisonRequestSchema>;

export const candidatureComparisonInformationSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    value: candidatureRuntimeValueSchema,
  })
  .strict();

export const candidatureComparisonPreviewEntrySchema = z
  .object({
    candidatureId: z.string().uuid(),
    localLabel: z.string().min(1).max(200),
    providerLabel: z.string().min(1).max(80),
    information: z.array(candidatureComparisonInformationSchema).max(64),
  })
  .strict();

export const candidatureComparisonPreviewSchema = z
  .object({
    connection: aiConnectionStatusSchema,
    entries: z.array(candidatureComparisonPreviewEntrySchema).min(2).max(5),
  })
  .strict();
export type CandidatureComparisonPreview = z.infer<typeof candidatureComparisonPreviewSchema>;

export const providerCandidatureComparisonEntrySchema = z
  .object({
    candidatureRef: operationReferenceSchema,
    label: z.string().min(1).max(80),
    information: z.array(candidatureComparisonInformationSchema).max(64),
  })
  .strict();

export const providerCandidatureComparisonContextSchema = z
  .object({
    candidatures: z.array(providerCandidatureComparisonEntrySchema).min(2).max(5),
  })
  .strict();
export type ProviderCandidatureComparisonContext = z.infer<
  typeof providerCandidatureComparisonContextSchema
>;

const comparisonPointsSchema = z.array(z.string().trim().min(1).max(1000)).max(8);

export const providerCandidatureComparisonAnalysisSchema = z
  .object({
    candidatureRef: operationReferenceSchema,
    strengths: comparisonPointsSchema,
    concerns: comparisonPointsSchema,
    questions: comparisonPointsSchema,
  })
  .strict();

export const providerCandidatureComparisonResultSchema = z
  .object({
    analyses: z.array(providerCandidatureComparisonAnalysisSchema).min(2).max(5),
    considerations: z.array(z.string().trim().min(1).max(1000)).max(12),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.analyses.map((analysis) => analysis.candidatureRef)).size ===
      value.analyses.length,
    { message: "Each compared candidature may appear only once." },
  );
export type ProviderCandidatureComparisonResult = z.infer<
  typeof providerCandidatureComparisonResultSchema
>;

export const candidatureComparisonAnalysisSchema = z
  .object({
    candidatureId: z.string().uuid(),
    strengths: comparisonPointsSchema,
    concerns: comparisonPointsSchema,
    questions: comparisonPointsSchema,
  })
  .strict();

export const candidatureComparisonResultSchema = z
  .object({
    analyses: z.array(candidatureComparisonAnalysisSchema).min(2).max(5),
    considerations: z.array(z.string().trim().min(1).max(1000)).max(12),
  })
  .strict();
export type CandidatureComparisonResult = z.infer<typeof candidatureComparisonResultSchema>;

export interface CandidatureComparisonDesktopApi {
  readonly candidatureComparison: {
    readonly preview: (
      request: CandidatureComparisonRequest,
    ) => Promise<CandidatureComparisonPreview>;
    readonly run: (
      request: CandidatureComparisonRequest,
    ) => Promise<CandidatureComparisonResult>;
  };
}
