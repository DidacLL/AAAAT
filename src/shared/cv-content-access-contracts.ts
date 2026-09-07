import { z } from "zod";

export const cvContentAccessChannels = Object.freeze({
  current: "aaaat:cv-content-access-current",
  update: "aaaat:cv-content-access-update",
} as const);

export const cvContentAccessSchema = z
  .object({
    documentId: z.string().uuid(),
    allowed: z.boolean(),
  })
  .strict();
export type CvContentAccess = z.infer<typeof cvContentAccessSchema>;

export const cvContentAccessUpdateSchema = cvContentAccessSchema;
export type CvContentAccessUpdate = z.infer<typeof cvContentAccessUpdateSchema>;

export interface CvContentAccessDesktopApi {
  readonly cvContentAccess: {
    readonly current: (documentId: string) => Promise<CvContentAccess>;
    readonly update: (input: CvContentAccessUpdate) => Promise<CvContentAccess>;
  };
}
