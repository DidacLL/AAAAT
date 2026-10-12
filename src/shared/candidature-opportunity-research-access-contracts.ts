import { z } from "zod";

import {
  externalApplicationInformationPendingResultOptionalSchema,
  externalApplicationInformationPendingResultSchema,
  externalApplicationInformationTaskSchema,
  externalInterviewPreparationContextSchema,
  type ExternalApplicationInformationPendingResult,
  type ExternalApplicationInformationTask,
  type ExternalInterviewPreparationContext,
} from "./external-assistant-contracts";

export const candidatureOpportunityResearchAccessChannels = Object.freeze({
  current: "aaaat:candidature-external-ai-current",
  update: "aaaat:candidature-external-ai-update",
  applicationInformationTask: "aaaat:candidature-application-information-task",
  privateApplicationInformationTask: "aaaat:candidature-application-information-private-task",
  useConnectedApplicationInformationTask: "aaaat:candidature-application-information-connect-task",
  takeApplicationInformationResult: "aaaat:candidature-application-information-take-result",
  copyApplicationInformationTask: "aaaat:candidature-application-information-copy-task",
  exportApplicationInformationTask: "aaaat:candidature-application-information-export-task",
  submitApplicationInformationResult: "aaaat:candidature-application-information-submit-result",
  importApplicationInformationResult: "aaaat:candidature-application-information-import-result",
  interviewContext: "aaaat:candidature-interview-context",
  privateInterviewContext: "aaaat:candidature-interview-private-context",
  disableConnectedTaskAccess: "aaaat:candidature-external-task-disable-access",
  closePrivateTask: "aaaat:candidature-external-task-close",
  interviewTaskText: "aaaat:candidature-interview-task-text",
  useConnectedInterviewTask: "aaaat:candidature-interview-connect-task",
  copyInterviewTask: "aaaat:candidature-interview-copy-task",
  exportInterviewTask: "aaaat:candidature-interview-export-task",
  retainInterviewResult: "aaaat:candidature-interview-retain-result",
  importInterviewResult: "aaaat:candidature-interview-import-result",
} as const);

export const candidatureOpportunityResearchAccessSchema = z
  .object({
    candidatureId: z.string().uuid(),
    allowed: z.boolean(),
    taskAvailable: z.boolean(),
  })
  .strict();
export type CandidatureOpportunityResearchAccess = z.infer<
  typeof candidatureOpportunityResearchAccessSchema
>;

export const candidatureOpportunityResearchAccessUpdateSchema =
  candidatureOpportunityResearchAccessSchema.omit({ taskAvailable: true });
export type CandidatureOpportunityResearchAccessUpdate = z.infer<
  typeof candidatureOpportunityResearchAccessUpdateSchema
>;

export const candidatureExternalAiInstructionSchema = z
  .string()
  .trim()
  .min(1)
  .max(20_000);
export type CandidatureExternalAiInstruction = z.infer<
  typeof candidatureExternalAiInstructionSchema
>;

export const candidatureExternalAiTaskTextSchema = externalApplicationInformationTaskSchema.shape.taskText;
export type CandidatureExternalAiTaskText = z.infer<typeof candidatureExternalAiTaskTextSchema>;

export const candidaturePreparedTaskTargetSchema = z.object({
  candidatureId: z.string().uuid(),
  taskRef: externalApplicationInformationTaskSchema.shape.taskRef,
}).strict();
export type CandidaturePreparedTaskTarget = z.infer<typeof candidaturePreparedTaskTargetSchema>;
export const candidaturePreparedTaskSchema = externalApplicationInformationTaskSchema.extend({
  candidatureId: z.string().uuid(),
});
export type CandidaturePreparedTask = z.infer<typeof candidaturePreparedTaskSchema>;

export const candidatureExternalAiResultTextSchema = z
  .string()
  .max(64 * 1024);

export const candidatureExternalAiCopyResultSchema = z.literal("copied");
export type CandidatureExternalAiCopyResult = z.infer<
  typeof candidatureExternalAiCopyResultSchema
>;

export const candidatureExternalAiExportResultSchema = z.enum([
  "exported",
  "cancelled",
]);
export type CandidatureExternalAiExportResult = z.infer<
  typeof candidatureExternalAiExportResultSchema
>;

export const candidatureInterviewResultRetainResultSchema = z.literal("retained");
export type CandidatureInterviewResultRetainResult = z.infer<
  typeof candidatureInterviewResultRetainResultSchema
>;

export const candidatureInterviewResultImportResultSchema = z.enum([
  "imported",
  "cancelled",
]);
export type CandidatureInterviewResultImportResult = z.infer<
  typeof candidatureInterviewResultImportResultSchema
>;

export const candidatureApplicationInformationResultImportResultSchema = z.union([
  externalApplicationInformationPendingResultSchema,
  z.literal("cancelled"),
]);
export type CandidatureApplicationInformationResultImportResult = z.infer<
  typeof candidatureApplicationInformationResultImportResultSchema
>;

export interface CandidatureOpportunityResearchAccessDesktopApi {
  readonly candidatureOpportunityResearchAccess: {
    readonly current: (
      candidatureId: string,
    ) => Promise<CandidatureOpportunityResearchAccess>;
    readonly update: (
      input: CandidatureOpportunityResearchAccessUpdate,
    ) => Promise<CandidatureOpportunityResearchAccess>;
    readonly applicationInformationTask: (
      instruction: CandidatureExternalAiInstruction,
    ) => Promise<ExternalApplicationInformationTask>;
    readonly privateApplicationInformationTask: (candidatureId: string, instruction: CandidatureExternalAiInstruction) => Promise<CandidaturePreparedTask>;
    readonly useConnectedApplicationInformationTask: (target: CandidaturePreparedTaskTarget, taskText: CandidatureExternalAiTaskText) => Promise<ExternalApplicationInformationTask>;
    readonly takeApplicationInformationResult: (
      target: CandidaturePreparedTaskTarget,
    ) => Promise<ExternalApplicationInformationPendingResult | null>;
    readonly copyApplicationInformationTask: (
      taskText: CandidatureExternalAiTaskText,
    ) => Promise<CandidatureExternalAiCopyResult>;
    readonly exportApplicationInformationTask: (
      taskText: CandidatureExternalAiTaskText,
    ) => Promise<CandidatureExternalAiExportResult>;
    readonly submitApplicationInformationResult: (
      target: CandidaturePreparedTaskTarget,
      resultText: string,
    ) => Promise<ExternalApplicationInformationPendingResult>;
    readonly importApplicationInformationResult: (
      target: CandidaturePreparedTaskTarget,
    ) => Promise<CandidatureApplicationInformationResultImportResult>;
    readonly interviewContext: () => Promise<ExternalInterviewPreparationContext>;
    readonly privateInterviewContext: (candidatureId: string) => Promise<CandidaturePreparedTask>;
    readonly closePrivateTask: (target: CandidaturePreparedTaskTarget) => Promise<void>;
    readonly disableConnectedTaskAccess: (candidatureId: string) => Promise<CandidatureOpportunityResearchAccess>;
    readonly interviewTaskText: () => Promise<CandidatureExternalAiTaskText>;
    readonly useConnectedInterviewTask: (target: CandidaturePreparedTaskTarget, taskText: CandidatureExternalAiTaskText) => Promise<CandidatureExternalAiTaskText>;
    readonly copyInterviewTask: (
      taskText: CandidatureExternalAiTaskText,
    ) => Promise<CandidatureExternalAiCopyResult>;
    readonly exportInterviewTask: (
      taskText: CandidatureExternalAiTaskText,
    ) => Promise<CandidatureExternalAiExportResult>;
    readonly retainInterviewResult: (
      target: CandidaturePreparedTaskTarget,
      resultText: string,
    ) => Promise<CandidatureInterviewResultRetainResult>;
    readonly importInterviewResult: (target: CandidaturePreparedTaskTarget) => Promise<CandidatureInterviewResultImportResult>;
  };
}

export {
  externalApplicationInformationPendingResultOptionalSchema,
  externalApplicationInformationPendingResultSchema,
  externalApplicationInformationTaskSchema,
  externalInterviewPreparationContextSchema,
};
