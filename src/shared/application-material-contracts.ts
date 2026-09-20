import { z } from "zod";

export const applicationDocumentOutputSchema = z.enum(["cv", "cover_letter"]);

export const applicationDocumentsIntentSchema = z
  .object({
    sourceText: z
      .string()
      .max(50000)
      .refine((value) => value.trim().length > 0, {
        message: "Application material must contain non-whitespace text.",
      }),
    outputs: z.array(applicationDocumentOutputSchema).min(1).max(2),
  })
  .strict()
  .refine((value) => new Set(value.outputs).size === value.outputs.length, {
    path: ["outputs"],
    message: "Application outputs must be unique.",
  });
export type ApplicationDocumentsIntent = z.infer<typeof applicationDocumentsIntentSchema>;

const applicationCreatedOutputSchema = z
  .object({ created: z.boolean() })
  .strict();

export const applicationDocumentsResultSchema = z
  .object({
    created: z.literal(true),
    cv: applicationCreatedOutputSchema,
    coverLetter: applicationCreatedOutputSchema,
  })
  .strict();
export type ApplicationDocumentsResult = z.infer<typeof applicationDocumentsResultSchema>;
