import { z } from "zod";

export const cvDescriptorChannels = Object.freeze({
  current: "aaaat:cv-descriptor-current",
  update: "aaaat:cv-descriptor-update",
} as const);

export const cvAssistantTagSchema = z.string().trim().min(1).max(80);
export const cvAssistantTagsSchema = z
  .array(cvAssistantTagSchema)
  .max(20)
  .refine(
    (tags) => new Set(tags.map((tag) => tag.toLowerCase())).size === tags.length,
    { message: "AI-visible CV tags must be unique ignoring case." },
  );

export const cvAssistantNotesSchema = z
  .string()
  .max(5000)
  .refine((value) => value.trim().length > 0, {
    message: "AI-visible CV notes must contain non-whitespace text.",
  });

export const cvDescriptorSchema = z
  .object({
    documentId: z.string().uuid(),
    tags: cvAssistantTagsSchema,
    notes: cvAssistantNotesSchema.nullable(),
  })
  .strict();
export type CvDescriptor = z.infer<typeof cvDescriptorSchema>;

export const cvDescriptorUpdateSchema = cvDescriptorSchema;
export type CvDescriptorUpdate = z.infer<typeof cvDescriptorUpdateSchema>;

export interface CvDescriptorDesktopApi {
  readonly cvDescriptors: {
    readonly current: (documentId: string) => Promise<CvDescriptor>;
    readonly update: (input: CvDescriptorUpdate) => Promise<CvDescriptor>;
  };
}
