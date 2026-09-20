import {
  applicationDocumentsIntentSchema,
  applicationDocumentsResultSchema,
  type ApplicationDocumentsIntent,
  type ApplicationDocumentsResult,
} from "../shared/application-material-contracts";
import { localCoverLetterDraft } from "../shared/application-material";
import { createCandidature } from "./candidature-service";
import {
  createCoverLetter,
  createWorkingCv,
} from "./document-domain-service";
import { getProfile } from "./profile-service";

export async function createApplicationDocuments(
  rootPath: string,
  rawInput: ApplicationDocumentsIntent,
): Promise<ApplicationDocumentsResult> {
  const input = applicationDocumentsIntentSchema.parse(rawInput);
  const candidature = createCandidature(rootPath, {
    source: {
      kind: "job_posting",
      title: "",
      url: "",
      sourceText: input.sourceText,
    },
    values: [],
  });

  const cv = input.outputs.includes("cv")
    ? createWorkingCv(rootPath, {
        title: "Application CV",
        candidatureId: candidature.id,
        source: { kind: "profile" },
      })
    : null;

  let coverLetter = null;
  if (input.outputs.includes("cover_letter")) {
    const draft = localCoverLetterDraft(getProfile(rootPath).items, input.sourceText);
    coverLetter = createCoverLetter(rootPath, {
      candidatureId: candidature.id,
      title: "Application cover letter",
      ...draft,
      bodyParagraphs: [...draft.bodyParagraphs],
    });
  }

  return applicationDocumentsResultSchema.parse({
    created: true,
    cv: { created: cv !== null },
    coverLetter: { created: coverLetter !== null },
  });
}
