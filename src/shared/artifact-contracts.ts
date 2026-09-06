import { z } from "zod";

export const artifactChannels = Object.freeze({
  list: "aaaat:artifact-list",
  capture: "aaaat:artifact-capture",
} as const);

export const applicationArtifactCaptureSchema = z
  .object({
    candidatureId: z.string().uuid(),
    documentId: z.string().uuid(),
  })
  .strict();
export type ApplicationArtifactCapture = z.infer<typeof applicationArtifactCaptureSchema>;

export const applicationArtifactRecordSchema = z
  .object({
    id: z.string().uuid(),
    candidatureId: z.string().uuid(),
    documentId: z.string().uuid().nullable(),
    kind: z.enum(["cv", "cover_letter"]),
    title: z.string().min(1),
    capturedAt: z.string().min(1),
    projectPath: z.string().min(1),
    sourcePath: z.string().min(1),
    artifactPath: z.string().min(1),
  })
  .strict();
export type ApplicationArtifactRecord = z.infer<typeof applicationArtifactRecordSchema>;
export const applicationArtifactListSchema = z.array(applicationArtifactRecordSchema);

export interface ArtifactDesktopApi {
  readonly artifacts: {
    readonly list: (candidatureId: string) => Promise<ApplicationArtifactRecord[]>;
    readonly capture: (input: ApplicationArtifactCapture) => Promise<ApplicationArtifactRecord>;
  };
}
