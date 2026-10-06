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
  applicationInformationResult: "aaaat:candidature-application-information-result",
  copyApplicationInformationTask: "aaaat:candidature-application-information-copy-task",
  exportApplicationInformationTask: "aaaat:candidature-application-information-export-task",
  submitApplicationInformationResult: "aaaat:candidature-application-information-submit-result",
  importApplicationInformationResult: "aaaat:candidature-application-information-import-result",
  interviewContext: "aaaat:candidature-interview-context",
  copyInterviewTask: "aaaat:candidature-interview-copy-task",
  exportInterviewTask: "aaaat:candidature-interview-export-task",
  retainInterviewResult: "aaaat:candidature-interview-retain-result",
  importInterviewResult: "aaaat:candidature-interview-import-result",
} as const);

export const candidatureOpportunityResearchAccessSchema = z
  .object({
    candidatureId: z.string().uuid(),
    allowed: z.boolean(),
  })
  .strict();
export type CandidatureOpportunityResearchAccess = z.infer<
  typeof candidatureOpportunityResearchAccessSchema
>;

export const candidatureOpportunityResearchAccessUpdateSchema =
  candidatureOpportunityResearchAccessSchema;
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
    readonly applicationInformationResult: (
      candidatureId: string,
    ) => Promise<ExternalApplicationInformationPendingResult | null>;
    readonly copyApplicationInformationTask: (
      instruction: CandidatureExternalAiInstruction,
    ) => Promise<CandidatureExternalAiCopyResult>;
    readonly exportApplicationInformationTask: (
      instruction: CandidatureExternalAiInstruction,
    ) => Promise<CandidatureExternalAiExportResult>;
    readonly submitApplicationInformationResult: (
      resultText: string,
    ) => Promise<ExternalApplicationInformationPendingResult>;
    readonly importApplicationInformationResult: (
    ) => Promise<CandidatureApplicationInformationResultImportResult>;
    readonly interviewContext: () => Promise<ExternalInterviewPreparationContext>;
    readonly copyInterviewTask: (
      instruction: CandidatureExternalAiInstruction,
    ) => Promise<CandidatureExternalAiCopyResult>;
    readonly exportInterviewTask: (
      instruction: CandidatureExternalAiInstruction,
    ) => Promise<CandidatureExternalAiExportResult>;
    readonly retainInterviewResult: (
      resultText: string,
    ) => Promise<CandidatureInterviewResultRetainResult>;
    readonly importInterviewResult: () => Promise<CandidatureInterviewResultImportResult>;
  };
}

export {
  externalApplicationInformationPendingResultOptionalSchema,
  externalApplicationInformationPendingResultSchema,
  externalApplicationInformationTaskSchema,
  externalInterviewPreparationContextSchema,
};
