import { localCoverLetterDraft } from "../shared/application-material";

export type ApplicationDocumentRef = Readonly<{
  id: string;
  kind: "cv" | "cover_letter";
}>;

export async function createApplicationDocuments(input: {
  readonly candidatureId: string;
  readonly sourceText: string;
  readonly cv: boolean;
  readonly coverLetter: boolean;
}): Promise<ApplicationDocumentRef[]> {
  const created: ApplicationDocumentRef[] = [];
  if (input.cv) {
    const cv = await window.aaaat.documentDomain.createWorkingCv({
      title: "Application CV",
      candidatureId: input.candidatureId,
      source: { kind: "profile" },
    });
    created.push({ id: cv.id, kind: "cv" });
  }
  if (input.coverLetter) {
    const profile = await window.aaaat.profile.current();
    const draft = localCoverLetterDraft(profile.items, input.sourceText);
    const letter = await window.aaaat.documentDomain.createLetter({
      candidatureId: input.candidatureId,
      title: "Application cover letter",
      ...draft,
      bodyParagraphs: [...draft.bodyParagraphs],
    });
    created.push({ id: letter.id, kind: "cover_letter" });
  }
  return created;
}
