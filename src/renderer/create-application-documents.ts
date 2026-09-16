import type { DocumentRecord } from "../shared/contracts";
import { localCoverLetterDraft, localCvSelection } from "../shared/application-material";

export async function createApplicationDocuments(input: {
  readonly candidatureId: string;
  readonly sourceText: string;
  readonly cv: boolean;
  readonly coverLetter: boolean;
  readonly existingDocumentIds?: readonly string[];
}): Promise<DocumentRecord[]> {
  const profile = await window.aaaat.profile.current();
  const documents: DocumentRecord[] = [];
  try {
    if (input.cv) {
      const cv = await window.aaaat.documents.create({
        kind: "cv",
        title: "Application CV",
        variantId: null,
        engine: "pdflatex",
        bodyParagraphs: [],
      });
      documents.push(cv);
      const selection = localCvSelection(profile.items, input.sourceText);
      documents[documents.length - 1] = profile.items.length > 0
        ? await window.aaaat.documents.applySelection({
            documentId: cv.id,
            expectedRules: cv.rules,
            includedItemIds: [...selection.includedItemIds],
            orderedItemIds: [...selection.orderedItemIds],
          })
        : cv;
    }
    if (input.coverLetter) {
      const draft = localCoverLetterDraft(profile.items, input.sourceText);
      documents.push(await window.aaaat.documents.create({
        kind: "cover_letter",
        title: "Application cover letter",
        variantId: null,
        engine: "pdflatex",
        ...draft,
        bodyParagraphs: [...draft.bodyParagraphs],
      }));
    }
  } finally {
    if (documents.length > 0) {
      await window.aaaat.candidatures.setDocuments({
        candidatureId: input.candidatureId,
        documentIds: [...new Set([
          ...(input.existingDocumentIds ?? []),
          ...documents.map((document) => document.id),
        ])],
      });
    }
  }
  return documents;
}
