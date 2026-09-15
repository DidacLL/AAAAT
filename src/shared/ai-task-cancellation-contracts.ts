import { z } from "zod";

import { jobExtractionRequestSchema } from "./ai-contracts";
import {
  partialJobExtractionResultSchema,
  type PartialJobExtractionResult,
} from "./ai-proposal-outcomes";

export const aiTaskCancellationChannels = Object.freeze({
  jobExtract: "aaaat:ai-task-job-extract",
  jobExtractCancel: "aaaat:ai-task-job-extract-cancel",
} as const);

export const aiTaskIdSchema = z.string().trim().min(1).max(200);

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
    readonly extractJob: (
      taskId: string,
      request: CancellableJobExtractionTaskRequest,
    ) => Promise<PartialJobExtractionResult>;
    readonly cancelJobExtraction: (taskId: string) => Promise<boolean>;
  };
}
