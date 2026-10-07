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
    name: z.string().trim().min(1).max(120),
    endpoint: z.string().trim().url().max(2048),
    model: z.string().trim().min(1).max(200),
  })
  .strict();
export type AiConnectionInput = z.infer<typeof aiConnectionInputSchema>;
export const aiConnectionStatusSchema = aiConnectionInputSchema;
export type AiConnectionStatus = z.infer<typeof aiConnectionStatusSchema>;
export const optionalAiConnectionStatusSchema = aiConnectionStatusSchema.nullable();

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
  .extend({ fields: z.array(aiDiscoveryFieldSchema).min(1).max(64) })
  .strict();
export type JobExtractionProviderRequest = z.infer<typeof jobExtractionProviderRequestSchema>;

export const jobExtractionProposalSchema = z
  .object({ fieldId: z.string().uuid(), value: candidatureRuntimeValueSchema })
  .strict();
export type JobExtractionProposal = z.infer<typeof jobExtractionProposalSchema>;

export const tagInferenceNewTagSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    definition: z.string().trim().min(1).max(3000),
    aliases: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
    evidence: z.string().trim().min(1).max(1500).optional(),
  })
  .strict();
export type TagInferenceNewTag = z.infer<typeof tagInferenceNewTagSchema>;

export const jobExtractionResultSchema = z
  .object({
    proposals: z.array(jobExtractionProposalSchema).max(64),
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
    sections: z.array(workingCvSectionSchema).max(40),
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
    content: z.string().min(1).max(5000),
  })
  .strict();
export type CvWritingResult = z.infer<typeof cvWritingResultSchema>;

export const coverLetterDraftSchema = z
  .object({
    recipient: z.string().trim().max(300),
    subject: z.string().trim().max(300),
    bodyParagraphs: z.array(z.string().trim().min(1).max(5000)).min(1).max(20),
    closing: z.string().trim().max(500),
  })
  .strict();
export type CoverLetterDraft = z.infer<typeof coverLetterDraftSchema>;

export const operationReferenceSchema = z.string().min(1).max(200).regex(/^aaaat_[a-z0-9_-]+$/);
export type OperationReference = z.infer<typeof operationReferenceSchema>;

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
export const providerTagGlossaryEntrySchema = z
  .object({
    tagRef: operationReferenceSchema,
    name: z.string().trim().min(1).max(120),
    aliases: z.array(z.string().trim().min(1).max(120)).max(8),
    definition: z.string().trim().max(500),
  })
  .strict();
export const providerJobExtractionRequestSchema = jobExtractionRequestSchema
  .extend({
    fields: z.array(providerDiscoveryFieldSchema).min(1).max(64),
  })
  .strict();
export type ProviderJobExtractionRequest = z.infer<typeof providerJobExtractionRequestSchema>;
export const providerJobExtractionEnvelopeSchema = z
  .object({
    proposals: z.array(z.unknown()).max(64).default([]),
  })
  .strict();
export type ProviderJobExtractionEnvelope = z.infer<typeof providerJobExtractionEnvelopeSchema>;

export const providerJobExtractionResultSchema = z
  .object({
    proposals: z.array(z.object({ fieldRef: operationReferenceSchema, value: candidatureRuntimeValueSchema }).strict()).max(64),
  })
  .strict()
  .refine((result) => new Set(result.proposals.map((proposal) => proposal.fieldRef)).size === result.proposals.length, { message: "Each extraction field may be proposed only once." });
export type ProviderJobExtractionResult = z.infer<typeof providerJobExtractionResultSchema>;

export const tagInferenceRequestSchema = jobExtractionRequestSchema;
export type TagInferenceRequest = z.infer<typeof tagInferenceRequestSchema>;
export const providerTagInferenceRequestSchema = tagInferenceRequestSchema
  .extend({
    fieldTitles: z.array(z.string().trim().min(1).max(120)).max(64),
    tags: z.array(providerTagGlossaryEntrySchema).max(300),
  })
  .strict();
export type ProviderTagInferenceRequest = z.infer<typeof providerTagInferenceRequestSchema>;
export const providerTagInferenceEnvelopeSchema = z
  .object({
    existingTags: z.array(z.unknown()).max(30).default([]),
    newTags: z.array(z.unknown()).max(5).default([]),
  })
  .strict();
export type ProviderTagInferenceEnvelope = z.infer<typeof providerTagInferenceEnvelopeSchema>;
export const providerTagInferenceResultSchema = z
  .object({
    existingTags: z.array(z.object({
      tagRef: operationReferenceSchema,
      evidence: z.string().trim().min(1).max(1500).optional(),
    }).strict()).max(30),
    newTags: z.array(tagInferenceNewTagSchema).max(5),
  })
  .strict()
  .refine((result) => new Set(result.existingTags.map((proposal) => proposal.tagRef)).size === result.existingTags.length, { message: "Each existing Tag may be proposed only once." });
export type ProviderTagInferenceResult = z.infer<typeof providerTagInferenceResultSchema>;

export const providerCvWritingInformationSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    value: z.string().max(1_000_000),
  })
  .strict();
export const providerCvWritingContextSchema = z
  .object({
    target: z.object({
      field: cvWritingFieldSchema,
      title: z.string().trim().min(1).max(500),
      maxLength: z.number().int().min(1).max(5000),
    }).strict(),
    availableInformation: z.array(providerCvWritingInformationSchema).max(30_000),
  })
  .strict();
export type ProviderCvWritingContext = z.infer<typeof providerCvWritingContextSchema>;

export const providerCoverLetterSourceSchema = z
  .object({
    title: z.string().max(200),
    url: z.string().max(2048),
    sourceText: z.string().max(12_000),
  })
  .strict();
export const providerCoverLetterInformationSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    value: z.string().max(1_000_000),
  })
  .strict();
export const providerCoverLetterContextSchema = z
  .object({
    sources: z.array(providerCoverLetterSourceSchema).max(20),
    applicationInformation: z.array(providerCoverLetterInformationSchema).max(64),
    careerContext: z.array(providerCoverLetterInformationSchema).max(7),
    myInformation: z.array(providerCoverLetterInformationSchema).max(1_400),
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
