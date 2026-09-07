import { z } from "zod";

export const cvContentAccessChannels = Object.freeze({
  current: "aaaat:cv-content-access-current",
  update: "aaaat:cv-content-access-update",
  updateRender: "aaaat:cv-content-access-update-render",
} as const);

export const cvContentAccessSchema = z
  .object({
    documentId: z.string().uuid(),
    allowed: z.boolean(),
    renderAllowed: z.boolean(),
  })
  .strict();
export type CvContentAccess = z.infer<typeof cvContentAccessSchema>;

export const cvContentAccessUpdateSchema = z
  .object({
    documentId: z.string().uuid(),
    allowed: z.boolean(),
  })
  .strict();
export type CvContentAccessUpdate = z.infer<typeof cvContentAccessUpdateSchema>;

export const cvRenderAccessUpdateSchema = z
  .object({
    documentId: z.string().uuid(),
    allowed: z.boolean(),
  })
  .strict();
export type CvRenderAccessUpdate = z.infer<typeof cvRenderAccessUpdateSchema>;

export interface CvContentAccessDesktopApi {
  readonly cvContentAccess: {
    readonly current: (documentId: string) => Promise<CvContentAccess>;
    readonly update: (input: CvContentAccessUpdate) => Promise<CvContentAccess>;
    readonly updateRender: (input: CvRenderAccessUpdate) => Promise<CvContentAccess>;
  };
}
