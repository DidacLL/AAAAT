import { z } from "zod";

export const candidatureActivityChannels = Object.freeze({
  list: "aaaat:candidature-activity-list",
} as const);

export const candidatureActivityCandidatureIdSchema = z.string().uuid();

export const candidatureActivityKindSchema = z.enum([
  "created",
  "updated",
  "source_added",
  "source_updated",
  "source_removed",
  "information_set",
  "information_cleared",
  "documents_updated",
  "concepts_updated",
  "artifact_retained",
  "external_research_allowed",
  "external_research_revoked",
  "changed",
]);
export type CandidatureActivityKind = z.infer<typeof candidatureActivityKindSchema>;

export const candidatureActivityRecordSchema = z
  .object({
    occurredAt: z.string().min(1),
    kind: candidatureActivityKindSchema,
  })
  .strict();
export type CandidatureActivityRecord = z.infer<typeof candidatureActivityRecordSchema>;

export const candidatureActivityListSchema = z.array(candidatureActivityRecordSchema);

export interface CandidatureActivityDesktopApi {
  readonly candidatureActivity: {
    readonly list: (candidatureId: string) => Promise<CandidatureActivityRecord[]>;
  };
}
