import { createContext, useContext } from "react";
import type { CoverLetterRecord, WorkingCvRecord } from "../shared/document-domain-contracts";

export type DocumentDraft = { readonly kind: "cv"; readonly document: WorkingCvRecord } | { readonly kind: "letter"; readonly document: CoverLetterRecord };

export type DocumentHandoff = {
  readonly documentId?: string;
  readonly candidatureId?: string;
  readonly draft?: DocumentDraft;
};

export type ProfessionalInformationHandoff = {
  readonly itemId: string;
  readonly documentId: string;
};

export type SettingsHandoff = {
  readonly view: "documents" | "ai";
  readonly origin: "documents" | "candidatures";
};

export interface ContextualHandoffApi {
  readonly documentHandoff: DocumentHandoff | null;
  readonly professionalInformationHandoff: ProfessionalInformationHandoff | null;
  readonly settingsHandoff: SettingsHandoff | null;
  readonly openDocumentFromCandidature: (candidatureId: string, documentId?: string) => void;
  readonly openDocumentDraft: (draft: DocumentDraft) => void;
  readonly completeDocumentDraft: (documentId: string) => void;
  readonly documentRemoved: (documentId: string) => void;
  readonly returnToCandidature: () => void;
  readonly returnToDocuments: () => void;
  readonly openProfessionalInformationItem: (documentId: string, itemId: string) => void;
  readonly returnToDocument: () => void;
  readonly openSettingsFor: (
    view: SettingsHandoff["view"],
    origin: SettingsHandoff["origin"],
  ) => void;
  readonly returnFromSettings: () => void;
}

const noHandoffs: ContextualHandoffApi = {
  documentHandoff: null,
  professionalInformationHandoff: null,
  settingsHandoff: null,
  openDocumentFromCandidature: () => undefined,
  openDocumentDraft: () => undefined,
  completeDocumentDraft: () => undefined,
  documentRemoved: () => undefined,
  returnToCandidature: () => undefined,
  returnToDocuments: () => undefined,
  openProfessionalInformationItem: () => undefined,
  returnToDocument: () => undefined,
  openSettingsFor: () => undefined,
  returnFromSettings: () => undefined,
};

export const ContextualHandoffContext = createContext<ContextualHandoffApi>(noHandoffs);

export function useContextualHandoffs(): ContextualHandoffApi {
  return useContext(ContextualHandoffContext);
}
