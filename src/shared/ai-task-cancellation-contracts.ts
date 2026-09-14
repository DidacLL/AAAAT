import { z } from "zod";

import {
  jobExtractionRequestSchema,
  jobExtractionResultSchema,
  type JobExtractionRequest,
  type JobExtractionResult,
} from "./ai-contracts";

export const aiTaskCancellationChannels = Object.freeze({
  jobExtract: "aaaat:ai-task-job-extract",
  jobExtractCancel: "aaaat:ai-task-job-extract-cancel",
} as const);

export const aiTaskIdSchema = z.string().trim().min(1).max(200);

export const cancellableJobExtractionRequestSchema = z
  .object({
    taskId: aiTaskIdSchema,
    request: jobExtractionRequestSchema,
  })
  .strict();

export const cancellableJobExtractionResultSchema = jobExtractionResultSchema;
export const aiTaskCancellationResultSchema = z.boolean();

export interface AiTaskCancellationDesktopApi {
  readonly aiTasks: {
    readonly extractJob: (
      taskId: string,
      request: JobExtractionRequest,
    ) => Promise<JobExtractionResult>;
    readonly cancelJobExtraction: (taskId: string) => Promise<boolean>;
  };
}
