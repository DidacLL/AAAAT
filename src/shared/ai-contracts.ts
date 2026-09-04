import { z } from "zod";

import {
  candidatureChoiceDefinitionSchema,
  candidatureFieldCardinalitySchema,
  candidatureFieldValueTypeSchema,
  candidatureRuntimeValueSchema,
} from "./contracts";

export const aiChannels = Object.freeze({
  connectionCurrent: "aaaat:ai-connection-current",
  connectionSave: "aaaat:ai-connection-save",
  fitPreview: "aaaat:ai-fit-preview",
  fitAssess: "aaaat:ai-fit-assess",
  jobExtract: "aaaat:ai-job-extract",
  fieldDiscover: "aaaat:ai-field-discover",
  variantRecommend: "aaaat:ai-variant-recommend",
  cvTailor: "aaaat:ai-cv-tailor",
  coverLetterDraft: "aaaat:ai-cover-letter-draft",
} as const);

export const aiConnectionInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    endpoint: z.string().trim().url().max(2048),
    model: z.string().trim().min(1).max(200),
  })
  .strict();
export type AiConnectionInput = z.infer<typeof aiConnectionInputSchema>;
export const aiConnectionStatusSchema = aiConnectionInputSchema;
export type AiConnectionStatus = z.infer<typeof aiConnectionStatusSchema>;
export const optionalAiConnectionStatusSchema = aiConnectionStatusSchema.nullable();

export const privacyModeSchema = z.enum(["expose", "omit", "token"]);
export type PrivacyMode = z.infer<typeof privacyModeSchema>;

export const fitAssessmentRequestSchema = z
  .object({
    candidatureId: z.string().uuid(),
    identityPrivacy: privacyModeSchema,
    contactPrivacy: privacyModeSchema,
  })
  .strict();
export type FitAssessmentRequest = z.infer<typeof fitAssessmentRequestSchema>;

export const projectedCandidatureInformationSchema = z
  .object({
    fieldId: z.string().uuid(),
    label: z.string().min(1),
    value: candidatureRuntimeValueSchema,
  })
  .strict();

export const projectedCandidatureSourceSchema = z
  .object({
    title: z.string(),
    url: z.string(),
    sourceText: z.string().max(12000),
  })
  .strict();

export const fitProjectedCandidatureSchema = z
  .object({
    label: z.string().min(1),
    information: z.array(projectedCandidatureInformationSchema).max(64),
    sources: z.array(projectedCandidatureSourceSchema).max(20),
  })
  .strict();
export type FitProjectedCandidature = z.infer<typeof fitProjectedCandidatureSchema>;

export const fitProjectedProfileItemSchema = z
  .object({
    kind: z.string().min(1),
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .strict();
export type FitProjectedProfileItem = z.infer<typeof fitProjectedProfileItemSchema>;

export const fitProjectedContextSchema = z
  .object({
    candidature: fitProjectedCandidatureSchema,
    profileItems: z.array(fitProjectedProfileItemSchema).max(200),
  })
  .strict();
export type FitProjectedContext = z.infer<typeof fitProjectedContextSchema>;

export const fitAssessmentPreviewSchema = z
  .object({ connection: aiConnectionStatusSchema, projectedContext: fitProjectedContextSchema })
  .strict();
export type FitAssessmentPreview = z.infer<typeof fitAssessmentPreviewSchema>;

export const fitAssessmentResultSchema = z
  .object({
    fit: z.enum(["weak", "possible", "strong"]),
    summary: z.string().trim().min(1).max(2000),
    strengths: z.array(z.string().trim().min(1).max(1000)).max(8),
    gaps: z.array(z.string().trim().min(1).max(1000)).max(8),
    focus: z.array(z.string().trim().min(1).max(1000)).max(8),
  })
  .strict();
export type FitAssessmentResult = z.infer<typeof fitAssessmentResultSchema>;

export const aiDiscoveryFieldSchema = z
  .object({
    id: z.string().uuid(),
    label: z.string().trim().min(1).max(120),
    description: z.string().max(2000),
    valueType: candidatureFieldValueTypeSchema,
    cardinality: candidatureFieldCardinalitySchema,
    choices: z.array(candidatureChoiceDefinitionSchema).max(64),
  })
  .strict();
export type AiDiscoveryField = z.infer<typeof aiDiscoveryFieldSchema>;

export const jobExtractionRequestSchema = z
  .object({
    sourceText: z.string().trim().min(1).max(50000),
    sourceTitle: z.string().trim().max(200).default(""),
    sourceUrl: z.string().trim().max(2048).default(""),
  })
  .strict();
export type JobExtractionRequest = z.infer<typeof jobExtractionRequestSchema>;

export const jobExtractionProviderRequestSchema = jobExtractionRequestSchema
  .extend({ fields: z.array(aiDiscoveryFieldSchema).min(1).max(32) })
  .strict();
export type JobExtractionProviderRequest = z.infer<typeof jobExtractionProviderRequestSchema>;

export const jobExtractionProposalSchema = z
  .object({ fieldId: z.string().uuid(), value: candidatureRuntimeValueSchema })
  .strict();
export type JobExtractionProposal = z.infer<typeof jobExtractionProposalSchema>;

export const jobExtractionResultSchema = z
  .object({ proposals: z.array(jobExtractionProposalSchema).max(32) })
  .strict()
  .refine(
    (result) => new Set(result.proposals.map((proposal) => proposal.fieldId)).size === result.proposals.length,
    { message: "Each discovery field may be proposed only once." },
  );
export type JobExtractionResult = z.infer<typeof jobExtractionResultSchema>;

export const historicalFieldDiscoveryRequestSchema = z
  .object({
    candidatureId: z.string().uuid(),
    fieldId: z.string().uuid(),
    sourceIds: z.array(z.string().uuid()).min(1).max(20),
  })
  .strict()
  .refine((value) => new Set(value.sourceIds).size === value.sourceIds.length, {
    message: "Each source may be selected only once.",
  });
export type HistoricalFieldDiscoveryRequest = z.infer<typeof historicalFieldDiscoveryRequestSchema>;

export const historicalFieldDiscoveryResultSchema = z
  .object({
    proposal: jobExtractionProposalSchema.nullable(),
    existingValuePresent: z.boolean(),
  })
  .strict();
export type HistoricalFieldDiscoveryResult = z.infer<typeof historicalFieldDiscoveryResultSchema>;

export const variantRecommendationRequestSchema = z
  .object({ candidatureId: z.string().uuid() })
  .strict();
export type VariantRecommendationRequest = z.infer<typeof variantRecommendationRequestSchema>;

export const variantRecommendationContextSchema = z
  .object({
    candidature: fitProjectedCandidatureSchema,
    variants: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            name: z.string(),
            focus: z.string(),
            targetTags: z.array(z.string()),
            preferredLanguage: z.string().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export type VariantRecommendationContext = z.infer<typeof variantRecommendationContextSchema>;

export const variantRecommendationResultSchema = z
  .object({
    variantId: z.string().uuid(),
    rationale: z.string().trim().min(1).max(1500),
  })
  .strict();
export type VariantRecommendationResult = z.infer<typeof variantRecommendationResultSchema>;

export const documentAiRequestSchema = z
  .object({ candidatureId: z.string().uuid(), documentId: z.string().uuid() })
  .strict();
export type DocumentAiRequest = z.infer<typeof documentAiRequestSchema>;

export const documentEvidenceItemSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.string().min(1),
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();
export type DocumentEvidenceItem = z.infer<typeof documentEvidenceItemSchema>;

export const documentAiContextSchema = z
  .object({
    candidature: fitProjectedCandidatureSchema,
    items: z.array(documentEvidenceItemSchema).min(1).max(200),
  })
  .strict();
export type DocumentAiContext = z.infer<typeof documentAiContextSchema>;

export const cvTailoringResultSchema = z
  .object({
    recommendations: z
      .array(
        z
          .object({
            itemId: z.string().uuid(),
            rationale: z.string().trim().min(1).max(1000),
          })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.recommendations.map((item) => item.itemId)).size === value.recommendations.length,
    { message: "Each CV recommendation must reference an item once." },
  );
export type CvTailoringResult = z.infer<typeof cvTailoringResultSchema>;

export const coverLetterDraftSchema = z
  .object({
    recipient: z.string().trim().max(300),
    subject: z.string().trim().max(300),
    bodyParagraphs: z.array(z.string().trim().min(1).max(5000)).min(1).max(20),
    closing: z.string().trim().max(500),
  })
  .strict();
export type CoverLetterDraft = z.infer<typeof coverLetterDraftSchema>;

export interface AiDesktopApi {
  readonly ai: {
    readonly connection: () => Promise<AiConnectionStatus | null>;
    readonly saveConnection: (input: AiConnectionInput) => Promise<AiConnectionStatus>;
    readonly previewFit: (request: FitAssessmentRequest) => Promise<FitAssessmentPreview>;
    readonly assessFit: (request: FitAssessmentRequest) => Promise<FitAssessmentResult>;
    readonly extractJob: (request: JobExtractionRequest) => Promise<JobExtractionResult>;
    readonly discoverField: (
      request: HistoricalFieldDiscoveryRequest,
    ) => Promise<HistoricalFieldDiscoveryResult>;
    readonly recommendVariant: (
      request: VariantRecommendationRequest,
    ) => Promise<VariantRecommendationResult>;
    readonly tailorCv: (request: DocumentAiRequest) => Promise<CvTailoringResult>;
    readonly draftCoverLetter: (request: DocumentAiRequest) => Promise<CoverLetterDraft>;
  };
}
