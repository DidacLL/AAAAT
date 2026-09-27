import { z } from "zod";

import { externalOpportunityResearchInformationSchema } from "./external-assistant-contracts";

export const candidatureOpportunityResearchAccessChannels = Object.freeze({
  current: "aaaat:candidature-opportunity-research-access-current",
  update: "aaaat:candidature-opportunity-research-access-update",
  taskContext: "aaaat:candidature-opportunity-research-task-context",
  taskTemplates: "aaaat:candidature-opportunity-research-task-templates",
  taskTemplateSave: "aaaat:candidature-opportunity-research-task-template-save",
  taskTemplateDelete: "aaaat:candidature-opportunity-research-task-template-delete",
  copyTask: "aaaat:candidature-opportunity-research-copy-task",
  exportTask: "aaaat:candidature-opportunity-research-export-task",
  retainResult: "aaaat:candidature-opportunity-research-retain-result",
  importResult: "aaaat:candidature-opportunity-research-import-result",
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

export const candidatureOpportunityResearchTaskContextSchema = z
  .object({
    information: z.array(externalOpportunityResearchInformationSchema).max(64),
  })
  .strict();
export type CandidatureOpportunityResearchTaskContext = z.infer<
  typeof candidatureOpportunityResearchTaskContextSchema
>;

export const candidatureOpportunityResearchTaskInstructionSchema = z
  .string()
  .trim()
  .min(1)
  .max(20_000);
export type CandidatureOpportunityResearchTaskInstruction = z.infer<
  typeof candidatureOpportunityResearchTaskInstructionSchema
>;

export const candidatureAiTaskTemplateSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(80),
    instruction: candidatureOpportunityResearchTaskInstructionSchema,
  })
  .strict();
export type CandidatureAiTaskTemplate = z.infer<typeof candidatureAiTaskTemplateSchema>;

export const candidatureAiTaskTemplatesSchema = z.array(candidatureAiTaskTemplateSchema).max(50);

export const candidatureAiTaskTemplateSaveSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(80),
    instruction: candidatureOpportunityResearchTaskInstructionSchema,
  })
  .strict();
export type CandidatureAiTaskTemplateSave = z.infer<typeof candidatureAiTaskTemplateSaveSchema>;

export const candidatureAiTaskTemplateDeleteSchema = z.string().uuid();

export const candidatureOpportunityResearchResultTextSchema = z
  .string()
  .max(64 * 1024);

export const candidatureOpportunityResearchTaskCopyResultSchema = z.literal("copied");
export type CandidatureOpportunityResearchTaskCopyResult = z.infer<
  typeof candidatureOpportunityResearchTaskCopyResultSchema
>;

export const candidatureOpportunityResearchTaskExportResultSchema = z.enum([
  "exported",
  "cancelled",
]);
export type CandidatureOpportunityResearchTaskExportResult = z.infer<
  typeof candidatureOpportunityResearchTaskExportResultSchema
>;

export const candidatureOpportunityResearchResultRetainResultSchema = z.literal("retained");
export type CandidatureOpportunityResearchResultRetainResult = z.infer<
  typeof candidatureOpportunityResearchResultRetainResultSchema
>;

export const candidatureOpportunityResearchResultImportResultSchema = z.enum([
  "imported",
  "cancelled",
]);
export type CandidatureOpportunityResearchResultImportResult = z.infer<
  typeof candidatureOpportunityResearchResultImportResultSchema
>;

export interface CandidatureOpportunityResearchAccessDesktopApi {
  readonly candidatureOpportunityResearchAccess: {
    readonly current: (
      candidatureId: string,
    ) => Promise<CandidatureOpportunityResearchAccess>;
    readonly update: (
      input: CandidatureOpportunityResearchAccessUpdate,
    ) => Promise<CandidatureOpportunityResearchAccess>;
    readonly taskContext: () => Promise<CandidatureOpportunityResearchTaskContext>;
    readonly taskTemplates: () => Promise<CandidatureAiTaskTemplate[]>;
    readonly saveTaskTemplate: (
      input: CandidatureAiTaskTemplateSave,
    ) => Promise<CandidatureAiTaskTemplate>;
    readonly deleteTaskTemplate: (id: string) => Promise<"deleted">;
    readonly copyTask: (
      instruction: CandidatureOpportunityResearchTaskInstruction,
    ) => Promise<CandidatureOpportunityResearchTaskCopyResult>;
    readonly exportTask: (
      instruction: CandidatureOpportunityResearchTaskInstruction,
    ) => Promise<CandidatureOpportunityResearchTaskExportResult>;
    readonly retainResult: (
      sourceText: string,
    ) => Promise<CandidatureOpportunityResearchResultRetainResult>;
    readonly importResult: () => Promise<CandidatureOpportunityResearchResultImportResult>;
  };
}
