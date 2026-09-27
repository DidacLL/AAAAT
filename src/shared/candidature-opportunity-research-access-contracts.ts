import { z } from "zod";

export const candidatureOpportunityResearchAccessChannels = Object.freeze({
  current: "aaaat:candidature-opportunity-research-access-current",
  update: "aaaat:candidature-opportunity-research-access-update",
  exportTask: "aaaat:candidature-opportunity-research-export-task",
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

export const candidatureOpportunityResearchTaskExportResultSchema = z.enum([
  "exported",
  "cancelled",
]);
export type CandidatureOpportunityResearchTaskExportResult = z.infer<
  typeof candidatureOpportunityResearchTaskExportResultSchema
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
    readonly exportTask: () => Promise<CandidatureOpportunityResearchTaskExportResult>;
    readonly importResult: () => Promise<CandidatureOpportunityResearchResultImportResult>;
  };
}
