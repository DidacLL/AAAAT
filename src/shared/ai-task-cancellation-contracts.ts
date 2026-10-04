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
  cvTailoringRequestSchema,
  cvTailoringResultSchema,
  jobExtractionRequestSchema,
  type CoverLetterDraft,
  type CoverLetterDraftRequest,
  type CvTailoringRequest,
  type CvTailoringResult,
} from "./ai-contracts";
import {
  partialJobExtractionResultSchema,
  type PartialJobExtractionResult,
} from "./ai-proposal-outcomes";

export const aiTaskCancellationChannels = Object.freeze({
  jobExtract: "aaaat:ai-task-job-extract",
  jobExtractCancel: "aaaat:ai-task-job-extract-cancel",
  connectionValidate: "aaaat:ai-task-connection-validate",
  connectionValidateCancel: "aaaat:ai-task-connection-validate-cancel",
  cvTailor: "aaaat:ai-task-cv-tailor",
  cvTailorCancel: "aaaat:ai-task-cv-tailor-cancel",
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
export const cancellableCvTailoringRequestSchema = z
  .object({
    taskId: aiTaskIdSchema,
    request: cvTailoringRequestSchema,
  })
  .strict();
export const cancellableCvTailoringResultSchema = cvTailoringResultSchema;

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
    readonly tailorCv: (
      taskId: string,
      request: CvTailoringRequest,
    ) => Promise<CvTailoringResult>;
    readonly cancelCvTailoring: (taskId: string) => Promise<boolean>;
    readonly draftCoverLetter: (
      taskId: string,
      request: CoverLetterDraftRequest,
    ) => Promise<CoverLetterDraft>;
    readonly cancelCoverLetterDraft: (taskId: string) => Promise<boolean>;
  };
}
