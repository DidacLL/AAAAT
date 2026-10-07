import { z } from "zod";

import {
  coverLetterDraftSchema,
  cvWritingFieldSchema,
  operationReferenceSchema,
  providerCvWritingContextSchema,
} from "./ai-contracts";

export const externalApplicationDocumentTargetSchema = z
  .object({ applicationRef: operationReferenceSchema })
  .strict()
  .nullable();
export type ExternalApplicationDocumentTarget = z.infer<
  typeof externalApplicationDocumentTargetSchema
>;

export const externalReusableCvChoiceSchema = z
  .object({
    cvRef: operationReferenceSchema,
    name: z.string().trim().min(1).max(200),
  })
  .strict();
export const externalReusableCvChoicesSchema = z
  .array(externalReusableCvChoiceSchema)
  .max(200);
export type ExternalReusableCvChoice = z.infer<typeof externalReusableCvChoiceSchema>;

export const externalReusableCvReadInputSchema = z
  .object({ cvRef: operationReferenceSchema })
  .strict();

export const externalPrivatePlaceholderSchema = z
  .string()
  .regex(/^\[USERPRIVATE:[^\]\r\n]{1,500}\]$/u);

const externalCvVisibleBlockSchema = z
  .object({
    kind: z.string().trim().min(1).max(80),
    title: z.string().max(200),
    subtitle: z.string().max(300).optional(),
    description: z.string().max(5000).optional(),
    startDate: z.string().max(40).optional(),
    endDate: z.string().max(40).optional(),
    url: z.string().max(2048).optional(),
  })
  .strict();

const externalCvPrivateBlockSchema = z
  .object({
    placeholders: z.array(externalPrivatePlaceholderSchema).min(1).max(6),
  })
  .strict();

export const externalReusableCvBlockSchema = z.union([
  externalCvVisibleBlockSchema,
  externalCvPrivateBlockSchema,
]);
export type ExternalReusableCvBlock = z.infer<typeof externalReusableCvBlockSchema>;

export const externalReusableCvContentSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    sections: z.array(
      z.object({
        name: z.string().trim().min(1).max(120),
        blocks: z.array(externalReusableCvBlockSchema).max(100),
      }).strict(),
    ).max(40),
  })
  .strict();
export type ExternalReusableCvContent = z.infer<typeof externalReusableCvContentSchema>;

export const externalApplicationCvCreateInputSchema = z
  .object({
    applicationRef: operationReferenceSchema,
    reusableCvRef: operationReferenceSchema,
  })
  .strict();

export const externalCvEditableFieldSchema = z
  .object({
    fieldRef: operationReferenceSchema,
    title: z.string().trim().min(1).max(500),
    field: cvWritingFieldSchema,
  })
  .strict();

export const externalApplicationCvCreateResultSchema = z
  .object({
    created: z.literal(true),
    cvRef: operationReferenceSchema,
    editableFields: z.array(externalCvEditableFieldSchema).max(12_000),
  })
  .strict();
export type ExternalApplicationCvCreateResult = z.infer<
  typeof externalApplicationCvCreateResultSchema
>;

export const externalCvFieldContextInputSchema = z
  .object({
    cvRef: operationReferenceSchema,
    fieldRef: operationReferenceSchema,
  })
  .strict();

export const externalCvFieldContextSchema = providerCvWritingContextSchema;
export type ExternalCvFieldContext = z.infer<typeof externalCvFieldContextSchema>;

export const externalCvFieldWriteInputSchema = z
  .object({
    cvRef: operationReferenceSchema,
    fieldRef: operationReferenceSchema,
    content: z.string().trim().min(1).max(5000),
  })
  .strict();

export const externalDocumentAppliedResultSchema = z
  .object({ applied: z.literal(true) })
  .strict();

export const externalApplicationCoverLetterCreateInputSchema = z
  .object({ applicationRef: operationReferenceSchema })
  .strict();

export const externalApplicationCoverLetterCreateResultSchema = z
  .object({
    created: z.literal(true),
    letterRef: operationReferenceSchema,
  })
  .strict();

export const externalCoverLetterWriteInputSchema = z
  .object({
    letterRef: operationReferenceSchema,
    draft: coverLetterDraftSchema,
  })
  .strict();

export const externalDocumentRenderingStatusSchema = z
  .object({ available: z.boolean() })
  .strict();

export const externalDocumentRenderInputSchema = z
  .object({ documentRef: operationReferenceSchema })
  .strict();

export const externalDocumentRenderResultSchema = z
  .object({ rendered: z.boolean() })
  .strict();
