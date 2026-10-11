import { z } from "zod";

import { workingCvSectionSchema } from "./document-domain-contracts";

import {
  candidatureChoiceDefinitionSchema,
  candidatureFieldCardinalitySchema,
  candidatureFieldValueTypeSchema,
  candidatureRuntimeValueSchema,
  candidatureSourceDraftSchema,
} from "./contracts";

export const aiChannels = Object.freeze({
  connectionCurrent: "aaaat:ai-connection-current",
  jobExtract: "aaaat:ai-job-extract",
  cvWrite: "aaaat:ai-cv-write",
  coverLetterDraft: "aaaat:ai-cover-letter-draft",
} as const);

export const aiConnectionInputSchema = z
  .object({
    name: z.string().trim().min(1),
    endpoint: z.string().trim().url(),
    model: z.string().trim().min(1),
  })
  .strict();
export type AiConnectionInput = z.infer<typeof aiConnectionInputSchema>;
export const aiConnectionStatusSchema = aiConnectionInputSchema;
export type AiConnectionStatus = z.infer<typeof aiConnectionStatusSchema>;
export const optionalAiConnectionStatusSchema = aiConnectionStatusSchema.nullable();

export const aiDiscoveryFieldSchema = z
  .object({
    id: z.string().uuid(),
    label: z.string().trim().min(1),
    description: z.string(),
    valueType: candidatureFieldValueTypeSchema,
    cardinality: candidatureFieldCardinalitySchema,
    choices: z.array(candidatureChoiceDefinitionSchema),
  })
  .strict();
export type AiDiscoveryField = z.infer<typeof aiDiscoveryFieldSchema>;

export const jobExtractionRequestSchema = z
  .object({
    sourceText: z.string().trim().min(1),
    sourceTitle: z.string().trim().default(""),
    sourceUrl: z.string().trim().default(""),
  })
  .strict();
export type JobExtractionRequest = z.infer<typeof jobExtractionRequestSchema>;
export const jobExtractionProviderRequestSchema = jobExtractionRequestSchema
  .extend({ fields: z.array(aiDiscoveryFieldSchema).min(1) })
  .strict();
export type JobExtractionProviderRequest = z.infer<typeof jobExtractionProviderRequestSchema>;

export const jobExtractionProposalSchema = z
  .object({ fieldId: z.string().uuid(), value: candidatureRuntimeValueSchema })
  .strict();
export type JobExtractionProposal = z.infer<typeof jobExtractionProposalSchema>;

export const tagInferenceNewTagSchema = z
  .object({
    name: z.string().trim().min(1),
    definition: z.string().trim().min(1),
    aliases: z.array(z.string().trim().min(1)).default([]),
    evidence: z.string().trim().min(1).optional(),
  })
  .strict();
export type TagInferenceNewTag = z.infer<typeof tagInferenceNewTagSchema>;

export const jobExtractionResultSchema = z
  .object({
    proposals: z.array(jobExtractionProposalSchema),
  })
  .strict()
  .refine((result) => new Set(result.proposals.map((proposal) => proposal.fieldId)).size === result.proposals.length, { message: "Each discovery field may be proposed only once." });
export type JobExtractionResult = z.infer<typeof jobExtractionResultSchema>;

export const cvWritingFieldSchema = z.enum(["title", "subtitle", "description"]);
export type CvWritingField = z.infer<typeof cvWritingFieldSchema>;
export const cvWritingRequestSchema = z
  .object({
    workingCvId: z.string().uuid(),
    itemId: z.string().uuid(),
    field: cvWritingFieldSchema,
    sections: z.array(workingCvSectionSchema),
  })
  .strict();
export type CvWritingRequest = z.infer<typeof cvWritingRequestSchema>;
export const coverLetterDraftRequestSchema = z.object({ coverLetterId: z.string().uuid() }).strict();
export type CoverLetterDraftRequest = z.infer<typeof coverLetterDraftRequestSchema>;

export const cvWritingResultSchema = z
  .object({
    workingCvId: z.string().uuid(),
    itemId: z.string().uuid(),
    field: cvWritingFieldSchema,
    content: z.string().min(1),
  })
  .strict();
export type CvWritingResult = z.infer<typeof cvWritingResultSchema>;

export const coverLetterDraftSchema = z
  .object({
    recipient: z.string().trim(),
    subject: z.string().trim(),
    bodyParagraphs: z.array(z.string().trim().min(1)).min(1),
    closing: z.string().trim(),
  })
  .strict();
export type CoverLetterDraft = z.infer<typeof coverLetterDraftSchema>;

export const operationReferenceSchema = z.string().min(1).regex(/^aaaat_[a-z0-9_-]+$/);
export type OperationReference = z.infer<typeof operationReferenceSchema>;

export const providerDiscoveryChoiceSchema = z
  .object({ choiceRef: operationReferenceSchema, label: z.string().trim().min(1) })
  .strict();
export const providerDiscoveryFieldSchema = z
  .object({
    fieldRef: operationReferenceSchema,
    label: z.string().trim().min(1),
    description: z.string(),
    valueType: candidatureFieldValueTypeSchema,
    cardinality: candidatureFieldCardinalitySchema,
    choices: z.array(providerDiscoveryChoiceSchema),
  })
  .strict();
export const providerTagGlossaryEntrySchema = z
  .object({
    tagRef: operationReferenceSchema,
    name: z.string().trim().min(1),
    aliases: z.array(z.string().trim().min(1)),
    definition: z.string().trim(),
  })
  .strict();
export const providerJobExtractionRequestSchema = jobExtractionRequestSchema
  .extend({
    fields: z.array(providerDiscoveryFieldSchema).min(1),
  })
  .strict();
export type ProviderJobExtractionRequest = z.infer<typeof providerJobExtractionRequestSchema>;
export const providerJobExtractionEnvelopeSchema = z
  .object({
    proposals: z.array(z.unknown()).default([]),
  })
  .strict();
export type ProviderJobExtractionEnvelope = z.infer<typeof providerJobExtractionEnvelopeSchema>;

export const providerJobExtractionResultSchema = z
  .object({
    proposals: z.array(z.object({ fieldRef: operationReferenceSchema, value: candidatureRuntimeValueSchema }).strict()),
  })
  .strict()
  .refine((result) => new Set(result.proposals.map((proposal) => proposal.fieldRef)).size === result.proposals.length, { message: "Each extraction field may be proposed only once." });
export type ProviderJobExtractionResult = z.infer<typeof providerJobExtractionResultSchema>;

export const tagInferenceRequestSchema = jobExtractionRequestSchema;
export type TagInferenceRequest = z.infer<typeof tagInferenceRequestSchema>;
export const providerTagInferenceRequestSchema = tagInferenceRequestSchema
  .extend({
    fieldTitles: z.array(z.string().trim().min(1)),
    tags: z.array(providerTagGlossaryEntrySchema),
  })
  .strict();
export type ProviderTagInferenceRequest = z.infer<typeof providerTagInferenceRequestSchema>;
export const providerTagInferenceEnvelopeSchema = z
  .object({
    existingTags: z.array(z.unknown()).default([]),
    newTags: z.array(z.unknown()).default([]),
  })
  .strict();
export type ProviderTagInferenceEnvelope = z.infer<typeof providerTagInferenceEnvelopeSchema>;
export const providerTagInferenceResultSchema = z
  .object({
    existingTags: z.array(z.object({
      tagRef: operationReferenceSchema,
      evidence: z.string().trim().min(1).optional(),
    }).strict()),
    newTags: z.array(tagInferenceNewTagSchema),
  })
  .strict()
  .refine((result) => new Set(result.existingTags.map((proposal) => proposal.tagRef)).size === result.existingTags.length, { message: "Each existing Tag may be proposed only once." });
export type ProviderTagInferenceResult = z.infer<typeof providerTagInferenceResultSchema>;

export const providerCvWritingInformationSchema = z
  .object({
    title: z.string().trim().min(1),
    value: z.string(),
  })
  .strict();
export const providerCvWritingContextSchema = z
  .object({
    target: z.object({
      field: cvWritingFieldSchema,
      title: z.string().trim().min(1),
    }).strict(),
    availableInformation: z.array(providerCvWritingInformationSchema),
  })
  .strict();
export type ProviderCvWritingContext = z.infer<typeof providerCvWritingContextSchema>;

export const providerCoverLetterSourceSchema = z
  .object({
    title: z.string(),
    url: z.string(),
    sourceText: z.string(),
  })
  .strict();
export const providerCoverLetterInformationSchema = z
  .object({
    title: z.string().trim().min(1),
    value: z.string(),
  })
  .strict();
export const providerCoverLetterContextSchema = z
  .object({
    sources: z.array(providerCoverLetterSourceSchema),
    applicationInformation: z.array(providerCoverLetterInformationSchema),
    careerContext: z.array(providerCoverLetterInformationSchema),
    myInformation: z.array(providerCoverLetterInformationSchema),
  })
  .strict();
export type ProviderCoverLetterContext = z.infer<typeof providerCoverLetterContextSchema>;

export const externalCandidatureCreateInputSchema = z
  .object({ source: candidatureSourceDraftSchema })
  .strict()
  .refine(({ source }) => [source.title, source.url, source.sourceText].some((value) => value.trim().length > 0), {
    path: ["source"],
    message: "Source must include a non-empty title, URL, or source text.",
  });
export type ExternalCandidatureCreateInput = z.infer<typeof externalCandidatureCreateInputSchema>;

export interface AiDesktopApi {
  readonly ai: {
    readonly connection: () => Promise<AiConnectionStatus | null>;
    readonly extractJob: (request: JobExtractionRequest) => Promise<JobExtractionResult>;
    readonly writeCvField: (request: CvWritingRequest) => Promise<CvWritingResult>;
    readonly draftCoverLetter: (request: CoverLetterDraftRequest) => Promise<CoverLetterDraft>;
  };
}
