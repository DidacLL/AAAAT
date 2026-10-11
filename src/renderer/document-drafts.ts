import type { CoverLetterRecord, WorkingCvRecord } from "../shared/document-domain-contracts";

// Unsaved document content belongs to the current renderer workspace, never the document collection.
const drafts = new Map<string, WorkingCvRecord | CoverLetterRecord>();
export function rememberDocumentDraft(draft: WorkingCvRecord | CoverLetterRecord): void { drafts.set(draft.id, draft); }
export function documentDraft(id: string): WorkingCvRecord | CoverLetterRecord | undefined { return drafts.get(id); }
export function forgetDocumentDraft(id: string): void { drafts.delete(id); }
export function clearDocumentDrafts(): void { drafts.clear(); }
