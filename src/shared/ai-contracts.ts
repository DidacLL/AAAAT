import { z } from "zod";

export const aiChannels = Object.freeze({
  connectionCurrent: "aaaat:ai-connection-current",
  connectionSave: "aaaat:ai-connection-save",
  fitPreview: "aaaat:ai-fit-preview",
  fitAssess: "aaaat:ai-fit-assess",
  jobExtract: "aaaat:ai-job-extract",
  variantRecommend: "aaaat:ai-variant-recommend",
} as const);

export const aiConnectionInputSchema = z.object({
  name: z.string().trim().min(1).max(120), endpoint: z.string().trim().url().max(2048), model: z.string().trim().min(1).max(200),
}).strict();
export type AiConnectionInput = z.infer<typeof aiConnectionInputSchema>;
export const aiConnectionStatusSchema = aiConnectionInputSchema;
export type AiConnectionStatus = z.infer<typeof aiConnectionStatusSchema>;
export const optionalAiConnectionStatusSchema = aiConnectionStatusSchema.nullable();

export const privacyModeSchema = z.enum(["expose", "omit", "token"]);
export type PrivacyMode = z.infer<typeof privacyModeSchema>;
export const fitAssessmentRequestSchema = z.object({ candidatureId: z.string().uuid(), identityPrivacy: privacyModeSchema, contactPrivacy: privacyModeSchema }).strict();
export type FitAssessmentRequest = z.infer<typeof fitAssessmentRequestSchema>;
export const fitProjectedCandidatureSchema = z.object({
  company: z.string(), role: z.string(), location: z.string(), workMode: z.string(), salaryText: z.string(), source: z.string(), sourceText: z.string(),
}).strict();
export type FitProjectedCandidature = z.infer<typeof fitProjectedCandidatureSchema>;
export const fitProjectedProfileItemSchema = z.object({
  kind: z.string().min(1), title: z.string(), subtitle: z.string().optional(), description: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional(),
}).strict();
export type FitProjectedProfileItem = z.infer<typeof fitProjectedProfileItemSchema>;
export const fitProjectedContextSchema = z.object({ candidature: fitProjectedCandidatureSchema, profileItems: z.array(fitProjectedProfileItemSchema).max(200) }).strict();
export type FitProjectedContext = z.infer<typeof fitProjectedContextSchema>;
export const fitAssessmentPreviewSchema = z.object({ connection: aiConnectionStatusSchema, projectedContext: fitProjectedContextSchema }).strict();
export type FitAssessmentPreview = z.infer<typeof fitAssessmentPreviewSchema>;
export const fitAssessmentResultSchema = z.object({
  fit: z.enum(["weak", "possible", "strong"]), summary: z.string().trim().min(1).max(2000), strengths: z.array(z.string().trim().min(1).max(1000)).max(8), gaps: z.array(z.string().trim().min(1).max(1000)).max(8), focus: z.array(z.string().trim().min(1).max(1000)).max(8),
}).strict();
export type FitAssessmentResult = z.infer<typeof fitAssessmentResultSchema>;

export const jobExtractionRequestSchema = z.object({ sourceText: z.string().trim().min(1).max(50_000), source: z.string().trim().max(200).default(""), sourceUrl: z.string().trim().max(2048).default("") }).strict();
export type JobExtractionRequest = z.infer<typeof jobExtractionRequestSchema>;
export const jobExtractionResultSchema = z.object({ company: z.string().trim().max(200), role: z.string().trim().max(200), location: z.string().trim().max(200), workMode: z.string().trim().max(80), salaryText: z.string().trim().max(300) }).strict();
export type JobExtractionResult = z.infer<typeof jobExtractionResultSchema>;

export const variantRecommendationRequestSchema = z.object({ candidatureId: z.string().uuid() }).strict();
export type VariantRecommendationRequest = z.infer<typeof variantRecommendationRequestSchema>;
export const variantRecommendationContextSchema = z.object({
  candidature: fitProjectedCandidatureSchema,
  variants: z.array(z.object({
    id: z.string().uuid(), name: z.string(), focus: z.string(), targetTags: z.array(z.string()), preferredLanguage: z.string().optional(),
  }).strict()).min(1).max(100),
}).strict();
export type VariantRecommendationContext = z.infer<typeof variantRecommendationContextSchema>;
export const variantRecommendationResultSchema = z.object({ variantId: z.string().uuid(), rationale: z.string().trim().min(1).max(1500) }).strict();
export type VariantRecommendationResult = z.infer<typeof variantRecommendationResultSchema>;

export interface AiDesktopApi {
  readonly ai: {
    readonly connection: () => Promise<AiConnectionStatus | null>;
    readonly saveConnection: (input: AiConnectionInput) => Promise<AiConnectionStatus>;
    readonly previewFit: (request: FitAssessmentRequest) => Promise<FitAssessmentPreview>;
    readonly assessFit: (request: FitAssessmentRequest) => Promise<FitAssessmentResult>;
    readonly extractJob: (request: JobExtractionRequest) => Promise<JobExtractionResult>;
    readonly recommendVariant: (request: VariantRecommendationRequest) => Promise<VariantRecommendationResult>;
  };
}
