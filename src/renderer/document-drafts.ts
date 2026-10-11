import type { CoverLetterRecord, WorkingCvRecord } from "../shared/document-domain-contracts";

// Unsaved document content belongs to the current renderer workspace, never the document collection.
const drafts = new Map<string, WorkingCvRecord | CoverLetterRecord>();
const unsaved = new Set<string>();
export function rememberDocumentDraft(draft: WorkingCvRecord | CoverLetterRecord, dirty = true): void {
  drafts.set(draft.id, draft);
  if (dirty) unsaved.add(draft.id); else unsaved.delete(draft.id);
}
export function documentDraft(id: string): WorkingCvRecord | CoverLetterRecord | undefined { return drafts.get(id); }
export function hasUnsavedDocumentDrafts(): boolean { return unsaved.size > 0; }
export function forgetDocumentDraft(id: string): void { drafts.delete(id); unsaved.delete(id); }
export function clearDocumentDrafts(): void { drafts.clear(); unsaved.clear(); }
