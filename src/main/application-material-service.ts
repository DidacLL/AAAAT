import {
  externalApplicationDocumentsInputSchema,
  externalApplicationDocumentsResultSchema,
  type ExternalApplicationDocumentsInput,
  type ExternalApplicationDocumentsResult,
} from "../shared/external-action-contracts";
import { cvTailoringSelection, localCoverLetterDraft, localCvSelection } from "../shared/application-material";
import { getAiConnectionForOperation } from "./ai-connection-service";
import { draftCoverLetter, tailorCv } from "./ai-service";
import { setCandidatureFieldValue } from "./candidature-field-service";
import { createCandidature, setCandidatureDocuments } from "./candidature-service";
import {
  applyDocumentSelection,
  createDocument,
  updateDocument,
} from "./document-service";
import { getProfile } from "./profile-service";
import { extractJobWithPartialOutcomes } from "./robust-job-extraction";

export async function createApplicationDocuments(
  rootPath: string,
  rawInput: ExternalApplicationDocumentsInput,
): Promise<ExternalApplicationDocumentsResult> {
  const input = externalApplicationDocumentsInputSchema.parse(rawInput);
  const candidature = createCandidature(rootPath, {
    source: {
      kind: "job_posting",
      title: "",
      url: "",
      sourceText: input.sourceText,
    },
    values: [],
  });
  const profile = getProfile(rootPath);
  const cv = input.outputs.includes("cv")
    ? createDocument(rootPath, {
        kind: "cv",
        title: "Application CV",
        variantId: null,
        engine: "pdflatex",
        bodyParagraphs: [],
      })
    : null;
  const localLetter = localCoverLetterDraft(profile.items, input.sourceText);
  const coverLetter = input.outputs.includes("cover_letter")
    ? createDocument(rootPath, {
        kind: "cover_letter",
        title: "Application cover letter",
        variantId: null,
        engine: "pdflatex",
        ...localLetter,
        bodyParagraphs: [...localLetter.bodyParagraphs],
      })
    : null;
  let selectedCv = cv;
  if (cv && profile.items.length > 0) {
    const selection = localCvSelection(profile.items, input.sourceText);
    selectedCv = applyDocumentSelection(rootPath, {
      documentId: cv.id,
      expectedRules: cv.rules,
      includedItemIds: [...selection.includedItemIds],
      orderedItemIds: [...selection.orderedItemIds],
    });
  }
  setCandidatureDocuments(rootPath, {
    candidatureId: candidature.id,
    documentIds: [cv?.id, coverLetter?.id].filter((id): id is string => Boolean(id)),
  });

  const extractionReady = getAiConnectionForOperation(rootPath, "job_extraction") !== null;
  const hasEvidence = profile.items.some((item) => item.kind !== "identity" && item.kind !== "contact" && item.kind !== "link");
  const cvReady = cv !== null && hasEvidence && getAiConnectionForOperation(rootPath, "cv_tailoring") !== null;
  const letterReady =
    coverLetter !== null && hasEvidence && getAiConnectionForOperation(rootPath, "cover_letter_draft") !== null;

  if (extractionReady) {
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
          // Independent proposal failure must not hide or invalidate other useful extraction results.
        }
      }
    } catch {
      // A failed optional AI exchange does not invalidate the saved application.
    }
  }

  let cvPrepared = false;
  if (cv && cvReady) {
    try {
      const tailored = await tailorCv(rootPath, {
        candidatureId: candidature.id,
        documentId: cv.id,
      });
      const selection = cvTailoringSelection(
        profile.items,
        tailored.recommendations.map((recommendation) => recommendation.itemId),
      );
      applyDocumentSelection(rootPath, {
        documentId: cv.id,
        expectedRules: selectedCv?.rules ?? [],
        includedItemIds: [...selection.includedItemIds],
        orderedItemIds: [...selection.orderedItemIds],
      });
      cvPrepared = true;
    } catch {
      cvPrepared = false;
    }
  }

  let coverLetterPrepared = false;
  if (coverLetter && letterReady) {
    try {
      const draft = await draftCoverLetter(rootPath, {
        candidatureId: candidature.id,
        documentId: coverLetter.id,
      });
      updateDocument(rootPath, {
        id: coverLetter.id,
        title: coverLetter.title,
        language: coverLetter.language,
        engine: coverLetter.engine,
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

  return externalApplicationDocumentsResultSchema.parse({
    created: true,
    cv: { created: cv !== null, aiPrepared: cvPrepared },
    coverLetter: { created: coverLetter !== null, aiPrepared: coverLetterPrepared },
  });
}
