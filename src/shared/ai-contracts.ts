import { z } from "zod";

import {
  candidatureChoiceDefinitionSchema,
  candidatureFieldCardinalitySchema,
  candidatureFieldValueTypeSchema,
  candidatureRuntimeValueSchema,
  candidatureSourceDraftSchema,
} from "./contracts";

export const aiChannels = Object.freeze({
  connectionCurrent: "aaaat:ai-connection-current",
  opportunityReviewPreview: "aaaat:ai-opportunity-review-preview",
  opportunityReview: "aaaat:ai-opportunity-review",
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

/**
 * Controls disclosure for one AI operation. It does not change what the
 * operation may persist or define a token-security protocol; local replacement
 * mechanics may evolve.
 */
export const privacyModeSchema = z.enum(["expose", "omit", "token"]);
export type PrivacyMode = z.infer<typeof privacyModeSchema>;

export const opportunityReviewRequestSchema = z
  .object({
    candidatureId: z.string().uuid(),
    identityPrivacy: privacyModeSchema,
    contactPrivacy: privacyModeSchema,
  })
  .strict();
export type OpportunityReviewRequest = z.infer<typeof opportunityReviewRequestSchema>;

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

export const aiProjectedCandidatureSchema = z
  .object({
    label: z.string().min(1),
    information: z.array(projectedCandidatureInformationSchema).max(64),
    sources: z.array(projectedCandidatureSourceSchema).max(20),
  })
  .strict();
export type AiProjectedCandidature = z.infer<typeof aiProjectedCandidatureSchema>;

export const aiProjectedProfileItemSchema = z
  .object({
    kind: z.string().min(1),
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .strict();
export type AiProjectedProfileItem = z.infer<typeof aiProjectedProfileItemSchema>;

export const opportunityReviewProjectedContextSchema = z
  .object({
    candidature: aiProjectedCandidatureSchema,
    profileItems: z.array(aiProjectedProfileItemSchema).max(200),
  })
  .strict();
export type OpportunityReviewProjectedContext = z.infer<
  typeof opportunityReviewProjectedContextSchema
>;

export const opportunityReviewPreviewSchema = z
  .object({ connection: aiConnectionStatusSchema, projectedContext: opportunityReviewProjectedContextSchema })
  .strict();
export type OpportunityReviewPreview = z.infer<typeof opportunityReviewPreviewSchema>;

export const opportunityReviewResultSchema = z
  .object({
    summary: z.string().trim().min(1).max(2000),
    relevantEvidence: z.array(z.string().trim().min(1).max(1000)).max(8),
    uncertainties: z.array(z.string().trim().min(1).max(1000)).max(8),
    questions: z.array(z.string().trim().min(1).max(1000)).max(8),
  })
  .strict()
  .superRefine((result, context) => {
    const prohibited = /\b(?:score|scored|scoring|rating|rated|rank|ranked|ranking|winner)\b|\b(?:you should|next steps?|apply for|pursue this|choose (?:this|the))\b/i;
    for (const [key, values] of Object.entries(result)) {
      const items = Array.isArray(values) ? values : [values];
      if (items.some((value) => prohibited.test(value))) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "Opportunity reviews cannot rate, rank, choose, or prescribe action.",
        });
      }
    }
  });
export type OpportunityReviewResult = z.infer<typeof opportunityReviewResultSchema>;

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
    candidature: aiProjectedCandidatureSchema,
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
    candidature: aiProjectedCandidatureSchema,
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

/**
 * References in an AI or external-host payload are fresh, operation-local
 * handles. They deliberately do not expose the UUIDs AAAAT persists locally.
 */
export const operationReferenceSchema = z.string().min(1).max(200).regex(/^aaaat_[a-z0-9_-]+$/);
export type OperationReference = z.infer<typeof operationReferenceSchema>;

const providerProjectedCandidatureInformationSchema = z
  .object({
    label: z.string().min(1),
    value: candidatureRuntimeValueSchema,
  })
  .strict();

export const providerOpportunityReviewCandidatureSchema = z
  .object({
    label: z.string().min(1),
    information: z.array(providerProjectedCandidatureInformationSchema).max(64),
    sources: z.array(projectedCandidatureSourceSchema).max(20),
  })
  .strict();
export type ProviderOpportunityReviewCandidature = z.infer<
  typeof providerOpportunityReviewCandidatureSchema
>;

export const providerOpportunityReviewContextSchema = z
  .object({
    candidature: providerOpportunityReviewCandidatureSchema,
    profileItems: z.array(aiProjectedProfileItemSchema).max(200),
  })
  .strict();
export type ProviderOpportunityReviewContext = z.infer<
  typeof providerOpportunityReviewContextSchema
>;

export const providerDiscoveryChoiceSchema = z
  .object({ choiceRef: operationReferenceSchema, label: z.string().trim().min(1).max(120) })
  .strict();

export const providerDiscoveryFieldSchema = z
  .object({
    fieldRef: operationReferenceSchema,
    label: z.string().trim().min(1).max(120),
    description: z.string().max(2000),
    valueType: candidatureFieldValueTypeSchema,
    cardinality: candidatureFieldCardinalitySchema,
    choices: z.array(providerDiscoveryChoiceSchema).max(64),
  })
  .strict();

export const providerJobExtractionRequestSchema = jobExtractionRequestSchema
  .extend({ fields: z.array(providerDiscoveryFieldSchema).min(1).max(32) })
  .strict();
export type ProviderJobExtractionRequest = z.infer<typeof providerJobExtractionRequestSchema>;

export const providerJobExtractionResultSchema = z
  .object({
    proposals: z
      .array(
        z
          .object({ fieldRef: operationReferenceSchema, value: candidatureRuntimeValueSchema })
          .strict(),
      )
      .max(32),
  })
  .strict()
  .refine(
    (result) => new Set(result.proposals.map((proposal) => proposal.fieldRef)).size === result.proposals.length,
    { message: "Each discovery field may be proposed only once." },
  );
export type ProviderJobExtractionResult = z.infer<typeof providerJobExtractionResultSchema>;

export const providerVariantRecommendationContextSchema = z
  .object({
    candidature: providerOpportunityReviewCandidatureSchema,
    variants: z
      .array(
        z
          .object({
            variantRef: operationReferenceSchema,
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
export type ProviderVariantRecommendationContext = z.infer<
  typeof providerVariantRecommendationContextSchema
>;

export const providerVariantRecommendationResultSchema = z
  .object({ variantRef: operationReferenceSchema, rationale: z.string().trim().min(1).max(1500) })
  .strict();
export type ProviderVariantRecommendationResult = z.infer<
  typeof providerVariantRecommendationResultSchema
>;

export const providerDocumentAiContextSchema = z
  .object({
    candidature: providerOpportunityReviewCandidatureSchema,
    items: z
      .array(
        z
          .object({
            itemRef: operationReferenceSchema,
            kind: z.string().min(1),
            title: z.string(),
            subtitle: z.string().optional(),
            description: z.string().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();
export type ProviderDocumentAiContext = z.infer<typeof providerDocumentAiContextSchema>;

export const providerCvTailoringResultSchema = z
  .object({
    recommendations: z
      .array(
        z
          .object({ itemRef: operationReferenceSchema, rationale: z.string().trim().min(1).max(1000) })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict()
  .refine(
    (value) => new Set(value.recommendations.map((item) => item.itemRef)).size === value.recommendations.length,
    { message: "Each CV recommendation must reference an item once." },
  );
export type ProviderCvTailoringResult = z.infer<typeof providerCvTailoringResultSchema>;

export const externalCandidatureCreateInputSchema = z
  .object({ source: candidatureSourceDraftSchema })
  .strict()
  .refine(
    ({ source }) => [source.title, source.url, source.sourceText].some((value) => value.trim().length > 0),
    { path: ["source"], message: "Source must include a non-empty title, URL, or source text." },
  );
export type ExternalCandidatureCreateInput = z.infer<typeof externalCandidatureCreateInputSchema>;

export interface AiDesktopApi {
  readonly ai: {
    readonly connection: () => Promise<AiConnectionStatus | null>;
    readonly previewOpportunityReview: (
      request: OpportunityReviewRequest,
    ) => Promise<OpportunityReviewPreview>;
    readonly reviewOpportunity: (
      request: OpportunityReviewRequest,
    ) => Promise<OpportunityReviewResult>;
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
