import { z } from "zod";

import {
  aiConnectionOperationInputSchema,
  namedAiConnectionListSchema,
  type AiConnectionOperationInput,
  type NamedAiConnection,
} from "./ai-connection-contracts";
import {
  coverLetterDraftRequestSchema,
  coverLetterDraftSchema,
  cvWritingRequestSchema,
  cvWritingResultSchema,
  jobExtractionRequestSchema,
  tagInferenceRequestSchema,
  type CoverLetterDraft,
  type CoverLetterDraftRequest,
  type CvWritingRequest,
  type CvWritingResult,
  type TagInferenceRequest,
} from "./ai-contracts";
import {
  partialJobExtractionResultSchema,
  partialTagInferenceResultSchema,
  type PartialJobExtractionResult,
  type PartialTagInferenceResult,
} from "./ai-proposal-outcomes";

export const aiTaskCancellationChannels = Object.freeze({
  jobExtract: "aaaat:ai-task-job-extract",
  jobExtractCancel: "aaaat:ai-task-job-extract-cancel",
  tagInfer: "aaaat:ai-task-tag-infer",
  tagInferCancel: "aaaat:ai-task-tag-infer-cancel",
  connectionValidate: "aaaat:ai-task-connection-validate",
  connectionValidateCancel: "aaaat:ai-task-connection-validate-cancel",
  cvWrite: "aaaat:ai-task-cv-write",
  cvWriteCancel: "aaaat:ai-task-cv-write-cancel",
  coverLetterDraft: "aaaat:ai-task-cover-letter-draft",
  coverLetterDraftCancel: "aaaat:ai-task-cover-letter-draft-cancel",
} as const);

export const aiTaskIdSchema = z.string().trim().min(1).max(200);

export const cancellableAiConnectionValidationRequestSchema = z
  .object({
    taskId: aiTaskIdSchema,
    request: aiConnectionOperationInputSchema,
  })
  .strict();
export const cancellableAiConnectionValidationResultSchema = namedAiConnectionListSchema;

export const cancellableJobExtractionTaskRequestSchema = jobExtractionRequestSchema
  .extend({
    targetFieldIds: z.array(z.string().uuid()).min(1).max(32).optional(),
  })
  .strict();
export type CancellableJobExtractionTaskRequest = z.infer<
  typeof cancellableJobExtractionTaskRequestSchema
>;

export const cancellableJobExtractionRequestSchema = z
  .object({
    taskId: aiTaskIdSchema,
    request: cancellableJobExtractionTaskRequestSchema,
  })
  .strict();

export const cancellableJobExtractionResultSchema = partialJobExtractionResultSchema;
export const cancellableTagInferenceRequestSchema = z
  .object({ taskId: aiTaskIdSchema, request: tagInferenceRequestSchema })
  .strict();
export const cancellableTagInferenceResultSchema = partialTagInferenceResultSchema;
export const cancellableCvWritingRequestSchema = z
  .object({
    taskId: aiTaskIdSchema,
    request: cvWritingRequestSchema,
  })
  .strict();
export const cancellableCvWritingResultSchema = cvWritingResultSchema;

export const cancellableCoverLetterDraftRequestSchema = z
  .object({
    taskId: aiTaskIdSchema,
    request: coverLetterDraftRequestSchema,
  })
  .strict();
export const cancellableCoverLetterDraftResultSchema = coverLetterDraftSchema;

export const aiTaskCancellationResultSchema = z.boolean();

export interface AiTaskCancellationDesktopApi {
  readonly aiTasks: {
    readonly validateConnection: (
      taskId: string,
      request: AiConnectionOperationInput,
    ) => Promise<NamedAiConnection[]>;
    readonly cancelConnectionValidation: (taskId: string) => Promise<boolean>;
    readonly extractJob: (
      taskId: string,
      request: CancellableJobExtractionTaskRequest,
    ) => Promise<PartialJobExtractionResult>;
    readonly cancelJobExtraction: (taskId: string) => Promise<boolean>;
    readonly inferTags: (
      taskId: string,
      request: TagInferenceRequest,
    ) => Promise<PartialTagInferenceResult>;
    readonly cancelTagInference: (taskId: string) => Promise<boolean>;
    readonly writeCvField: (
      taskId: string,
      request: CvWritingRequest,
    ) => Promise<CvWritingResult>;
    readonly cancelCvWriting: (taskId: string) => Promise<boolean>;
    readonly draftCoverLetter: (
      taskId: string,
      request: CoverLetterDraftRequest,
    ) => Promise<CoverLetterDraft>;
    readonly cancelCoverLetterDraft: (taskId: string) => Promise<boolean>;
  };
}
