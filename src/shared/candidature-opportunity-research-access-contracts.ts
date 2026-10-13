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
  takeApplicationInformationResult: "aaaat:candidature-application-information-take-result",
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
    kind: z.enum(["application-information", "interview"]).nullable(),
  })
  .strict();
export type CandidatureOpportunityResearchAccess = z.infer<
  typeof candidatureOpportunityResearchAccessSchema
>;

export const candidatureOpportunityResearchAccessUpdateSchema =
  z.discriminatedUnion("allowed", [
    z.object({ candidatureId: z.string().uuid(), allowed: z.literal(false) }).strict(),
    z.object({
      candidatureId: z.string().uuid(),
      allowed: z.literal(true),
      kind: z.enum(["application-information", "interview"]),
      text: z.string().min(1).max(128 * 1024),
    }).strict(),
  ]);
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

export const candidatureExternalAiRequestTextSchema = z.object({
  candidatureId: z.string().uuid(),
  text: z.string().min(1).max(128 * 1024),
}).strict();
export const candidatureExternalAiResultInputSchema = z.object({
  candidatureId: z.string().uuid(),
  text: candidatureExternalAiResultTextSchema,
}).strict();

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
      candidatureId: string,
    ) => Promise<ExternalApplicationInformationTask>;
    readonly takeApplicationInformationResult: (
      candidatureId: string,
    ) => Promise<ExternalApplicationInformationPendingResult | null>;
    readonly copyApplicationInformationTask: (
      input: z.infer<typeof candidatureExternalAiRequestTextSchema>,
    ) => Promise<CandidatureExternalAiCopyResult>;
    readonly exportApplicationInformationTask: (
      input: z.infer<typeof candidatureExternalAiRequestTextSchema>,
    ) => Promise<CandidatureExternalAiExportResult>;
    readonly submitApplicationInformationResult: (
      input: z.infer<typeof candidatureExternalAiResultInputSchema>,
    ) => Promise<ExternalApplicationInformationPendingResult>;
    readonly importApplicationInformationResult: (
      candidatureId: string,
    ) => Promise<CandidatureApplicationInformationResultImportResult>;
    readonly interviewContext: (candidatureId: string) => Promise<ExternalInterviewPreparationContext>;
    readonly copyInterviewTask: (
      input: z.infer<typeof candidatureExternalAiRequestTextSchema>,
    ) => Promise<CandidatureExternalAiCopyResult>;
    readonly exportInterviewTask: (
      input: z.infer<typeof candidatureExternalAiRequestTextSchema>,
    ) => Promise<CandidatureExternalAiExportResult>;
    readonly retainInterviewResult: (
      input: z.infer<typeof candidatureExternalAiResultInputSchema>,
    ) => Promise<CandidatureInterviewResultRetainResult>;
    readonly importInterviewResult: (candidatureId: string) => Promise<CandidatureInterviewResultImportResult>;
  };
}

export {
  externalApplicationInformationPendingResultOptionalSchema,
  externalApplicationInformationPendingResultSchema,
  externalApplicationInformationTaskSchema,
  externalInterviewPreparationContextSchema,
};
