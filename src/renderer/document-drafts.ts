import type { CoverLetterRecord, WorkingCvRecord } from "../shared/document-domain-contracts";

const drafts = new Map<string, WorkingCvRecord | CoverLetterRecord>();
const originals = new Map<string, WorkingCvRecord | CoverLetterRecord>();
const needsSave = new Set<string>();
const edited = new Set<string>();
export function rememberDocumentDraft(draft: WorkingCvRecord | CoverLetterRecord, saveNeeded = true, userEdited = false, original: WorkingCvRecord | CoverLetterRecord = draft): void {
  if (!saveNeeded && !userEdited) { forgetDocumentDraft(draft.id); return; }
  if (!originals.has(draft.id)) originals.set(draft.id, original);
  drafts.set(draft.id, draft);
  if (saveNeeded) needsSave.add(draft.id); else needsSave.delete(draft.id);
  if (userEdited) edited.add(draft.id); else edited.delete(draft.id);
}
export function documentDraft(id: string): WorkingCvRecord | CoverLetterRecord | undefined { return drafts.get(id); }
export function documentDraftOriginal(id: string): WorkingCvRecord | CoverLetterRecord | undefined { return originals.get(id); }
export function markDocumentDraftSaved(draft: WorkingCvRecord | CoverLetterRecord): void { originals.set(draft.id, draft); }
export function hasUnsavedDocumentDrafts(): boolean { return edited.size > 0; }
export function unsavedDocumentDrafts(): readonly (WorkingCvRecord | CoverLetterRecord)[] { return [...drafts.values()].filter((draft) => needsSave.has(draft.id)); }
export function forgetDocumentDraft(id: string): void { drafts.delete(id); originals.delete(id); needsSave.delete(id); edited.delete(id); }
export function clearDocumentDrafts(): void { drafts.clear(); originals.clear(); needsSave.clear(); edited.clear(); }
