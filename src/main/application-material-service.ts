import {
  applicationDocumentsIntentSchema,
  applicationDocumentsResultSchema,
  type ApplicationDocumentsIntent,
  type ApplicationDocumentsResult,
} from "../shared/external-action-contracts";
import { getAiConnectionForOperation } from "./ai-connection-service";
import { draftCoverLetter, tailorCv } from "./ai-service";
import { setCandidatureFieldValue } from "./candidature-field-service";
import { createCandidature } from "./candidature-service";
import {
  createCoverLetter,
  createWorkingCv,
  updateCoverLetter,
  updateWorkingCv,
} from "./document-domain-service";
import { extractJobWithPartialOutcomes } from "./robust-job-extraction";

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

  let cv = input.outputs.includes("cv")
    ? createWorkingCv(rootPath, {
        title: "Application CV",
        candidatureId: candidature.id,
        source: { kind: "profile" },
      })
    : null;
  let coverLetter = input.outputs.includes("cover_letter")
    ? createCoverLetter(rootPath, {
        candidatureId: candidature.id,
        title: "Application cover letter",
        recipient: "",
        subject: "",
        bodyParagraphs: [],
        closing: "",
      })
    : null;

  if (getAiConnectionForOperation(rootPath, "job_extraction") !== null) {
    try {
      const extraction = await extractJobWithPartialOutcomes(rootPath, {
        sourceTitle: "",
        sourceUrl: "",
        sourceText: input.sourceText,
      });
      for (const proposal of extraction.proposals) {
        try {
          setCandidatureFieldValue(rootPath, {
            candidatureId: candidature.id,
            fieldId: proposal.fieldId,
            value: proposal.value,
          });
        } catch {
          // One optional proposal must not invalidate the retained application.
        }
      }
    } catch {
      // Optional AI failure leaves the manual application complete and editable.
    }
  }

  let cvPrepared = false;
  if (cv && getAiConnectionForOperation(rootPath, "cv_tailoring") !== null) {
    try {
      const tailored = await tailorCv(rootPath, {
        candidatureId: candidature.id,
        workingCvId: cv.id,
      });
      const rank = new Map(tailored.recommendations.map((item, index) => [item.itemId, index]));
      cv = updateWorkingCv(rootPath, {
        id: cv.id,
        title: cv.title,
        ...(cv.language ? { language: cv.language } : {}),
        sections: cv.sections.map((section) => ({
          ...section,
          items: [...section.items].sort(
            (left, right) =>
              (rank.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
              (rank.get(right.id) ?? Number.MAX_SAFE_INTEGER),
          ),
        })),
      });
      cvPrepared = tailored.recommendations.length > 0;
    } catch {
      cvPrepared = false;
    }
  }

  let coverLetterPrepared = false;
  if (coverLetter && getAiConnectionForOperation(rootPath, "cover_letter_draft") !== null) {
    try {
      const draft = await draftCoverLetter(rootPath, { coverLetterId: coverLetter.id });
      coverLetter = updateCoverLetter(rootPath, {
        id: coverLetter.id,
        title: coverLetter.title,
        ...(coverLetter.language ? { language: coverLetter.language } : {}),
        recipient: draft.recipient,
        subject: draft.subject,
        bodyParagraphs: draft.bodyParagraphs,
        closing: draft.closing,
      });
      coverLetterPrepared = true;
    } catch {
      coverLetterPrepared = false;
    }
  }

  return applicationDocumentsResultSchema.parse({
    created: true,
    cv: { created: cv !== null, aiPrepared: cvPrepared },
    coverLetter: { created: coverLetter !== null, aiPrepared: coverLetterPrepared },
  });
}
