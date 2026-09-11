import { z } from "zod";

export const artifactChannels = Object.freeze({
  list: "aaaat:artifact-list",
  capture: "aaaat:artifact-capture",
  captureCombined: "aaaat:artifact-capture-combined",
  open: "aaaat:artifact-open",
} as const);

export const applicationArtifactIdSchema = z.string().uuid();
export const applicationArtifactCandidatureIdSchema = z.string().uuid();

export const applicationArtifactCaptureSchema = z
  .object({
    candidatureId: applicationArtifactCandidatureIdSchema,
    documentId: z.string().uuid(),
  })
  .strict();
export type ApplicationArtifactCapture = z.infer<typeof applicationArtifactCaptureSchema>;

export const combinedApplicationArtifactCaptureSchema = z
  .object({
    candidatureId: applicationArtifactCandidatureIdSchema,
    cvDocumentId: z.string().uuid(),
    coverLetterDocumentId: z.string().uuid(),
  })
  .strict()
  .refine((value) => value.cvDocumentId !== value.coverLetterDocumentId, {
    message: "Combined application material requires two distinct working documents.",
  });
export type CombinedApplicationArtifactCapture = z.infer<
  typeof combinedApplicationArtifactCaptureSchema
>;

const artifactRecordBase = {
  id: applicationArtifactIdSchema,
  candidatureId: applicationArtifactCandidatureIdSchema,
  title: z.string().min(1),
  capturedAt: z.string().min(1),
  projectPath: z.string().min(1),
  sourcePath: z.string().min(1),
  artifactPath: z.string().min(1),
} as const;

export const applicationArtifactRecordSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...artifactRecordBase,
      kind: z.literal("cv"),
      cvDocumentId: z.string().uuid(),
      coverLetterDocumentId: z.null(),
    })
    .strict(),
  z
    .object({
      ...artifactRecordBase,
      kind: z.literal("cover_letter"),
      cvDocumentId: z.null(),
      coverLetterDocumentId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      ...artifactRecordBase,
      kind: z.literal("combined"),
      cvDocumentId: z.string().uuid(),
      coverLetterDocumentId: z.string().uuid(),
    })
    .strict(),
]);
export type ApplicationArtifactRecord = z.infer<typeof applicationArtifactRecordSchema>;
export const applicationArtifactListSchema = z.array(applicationArtifactRecordSchema);

export const applicationArtifactOpenResultSchema = z.object({ opened: z.literal(true) }).strict();
export type ApplicationArtifactOpenResult = z.infer<typeof applicationArtifactOpenResultSchema>;

export interface ArtifactDesktopApi {
  readonly artifacts: {
    readonly list: (candidatureId: string) => Promise<ApplicationArtifactRecord[]>;
    readonly capture: (input: ApplicationArtifactCapture) => Promise<ApplicationArtifactRecord>;
    readonly captureCombined: (
      input: CombinedApplicationArtifactCapture,
    ) => Promise<ApplicationArtifactRecord>;
    readonly open: (artifactId: string) => Promise<ApplicationArtifactOpenResult>;
  };
}
