import {
  externalApplicationDocumentsInputSchema,
  externalApplicationDocumentsResultSchema,
  type ExternalApplicationDocumentsInput,
  type ExternalApplicationDocumentsResult,
} from "../shared/external-action-contracts";
import { cvTailoringSelection } from "../shared/application-material";
import { getAiConnectionForOperation } from "./ai-connection-service";
import { draftCoverLetter, tailorCv } from "./ai-service";
import { setCandidatureFieldValue } from "./candidature-field-service";
import { createCandidature, setCandidatureDocuments } from "./candidature-service";
import {
  configureDocumentItem,
  createDocument,
  reorderDocument,
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
  const cv = input.outputs.includes("cv")
    ? createDocument(rootPath, {
        kind: "cv",
        title: "Application CV",
        variantId: null,
        engine: "pdflatex",
        bodyParagraphs: [],
      })
    : null;
  const coverLetter = input.outputs.includes("cover_letter")
    ? createDocument(rootPath, {
        kind: "cover_letter",
        title: "Application cover letter",
        variantId: null,
        engine: "pdflatex",
        bodyParagraphs: [],
      })
    : null;
  setCandidatureDocuments(rootPath, {
    candidatureId: candidature.id,
    documentIds: [cv?.id, coverLetter?.id].filter((id): id is string => Boolean(id)),
  });

  let extractedValues = 0;
  const profile = getProfile(rootPath);
  const extractionReady = getAiConnectionForOperation(rootPath, "job_extraction") !== null;
  const cvReady = cv !== null && getAiConnectionForOperation(rootPath, "cv_tailoring") !== null;
  const letterReady =
    coverLetter !== null && getAiConnectionForOperation(rootPath, "cover_letter_draft") !== null;

  if (profile.items.length > 0 && extractionReady && (cvReady || letterReady)) {
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
          extractedValues += 1;
        } catch {
          // Independent proposal failure must not hide or invalidate other useful extraction results.
        }
      }
    } catch {
      extractedValues = 0;
    }
  }

  let cvPrepared = false;
  if (cv && cvReady && extractedValues > 0) {
    try {
      const tailored = await tailorCv(rootPath, {
        candidatureId: candidature.id,
        documentId: cv.id,
      });
      const selection = cvTailoringSelection(
        profile.items,
        tailored.recommendations.map((recommendation) => recommendation.itemId),
      );
      const included = new Set(selection.includedItemIds);
      for (const item of profile.items) {
        configureDocumentItem(rootPath, {
          documentId: cv.id,
          itemId: item.id,
          included: included.has(item.id),
          contentPatch: null,
        });
      }
      if (selection.orderedItemIds.length > 0) {
        reorderDocument(rootPath, {
          documentId: cv.id,
          itemIds: [...selection.orderedItemIds],
        });
      }
      cvPrepared = true;
    } catch {
      cvPrepared = false;
    }
  }

  let coverLetterPrepared = false;
  if (coverLetter && letterReady && extractedValues > 0) {
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
