import { z } from "zod";

export const candidatureExternalAccessChannels = Object.freeze({
  current: "aaaat:candidature-external-access-current",
  update: "aaaat:candidature-external-access-update",
} as const);

export const candidatureExternalAccessSchema = z
  .object({
    candidatureId: z.string().uuid(),
    allowed: z.boolean(),
  })
  .strict();
export type CandidatureExternalAccess = z.infer<typeof candidatureExternalAccessSchema>;

export const candidatureExternalAccessUpdateSchema = candidatureExternalAccessSchema;
export type CandidatureExternalAccessUpdate = z.infer<typeof candidatureExternalAccessUpdateSchema>;

export interface CandidatureExternalAccessDesktopApi {
  readonly candidatureExternalAccess: {
    readonly current: (candidatureId: string) => Promise<CandidatureExternalAccess>;
    readonly update: (input: CandidatureExternalAccessUpdate) => Promise<CandidatureExternalAccess>;
  };
}
