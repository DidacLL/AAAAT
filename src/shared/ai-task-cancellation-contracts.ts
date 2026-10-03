import { z } from "zod";

import {
  aiConnectionOperationInputSchema,
  namedAiConnectionListSchema,
  type AiConnectionOperationInput,
  type NamedAiConnection,
} from "./ai-connection-contracts";
import { jobExtractionRequestSchema } from "./ai-contracts";
import {
  partialJobExtractionResultSchema,
  type PartialJobExtractionResult,
} from "./ai-proposal-outcomes";

export const aiTaskCancellationChannels = Object.freeze({
  jobExtract: "aaaat:ai-task-job-extract",
  jobExtractCancel: "aaaat:ai-task-job-extract-cancel",
  connectionValidate: "aaaat:ai-task-connection-validate",
  connectionValidateCancel: "aaaat:ai-task-connection-validate-cancel",
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
  };
}
