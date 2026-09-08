import { createContext, useContext } from "react";

export type DocumentHandoff = {
  readonly documentId?: string;
  readonly candidatureId?: string;
};

export type ProfessionalInformationHandoff = {
  readonly itemId: string;
  readonly documentId: string;
};

export type SettingsHandoff = {
  readonly view: "rendering" | "ai";
  readonly origin: "documents" | "candidatures";
};

export interface ContextualHandoffApi {
  readonly documentHandoff: DocumentHandoff | null;
  readonly professionalInformationHandoff: ProfessionalInformationHandoff | null;
  readonly settingsHandoff: SettingsHandoff | null;
  readonly openDocumentFromCandidature: (candidatureId: string, documentId?: string) => void;
  readonly returnToCandidature: () => void;
  readonly openProfessionalInformationItem: (documentId: string, itemId: string) => void;
  readonly returnToDocument: () => void;
  readonly openSettingsFor: (
    view: SettingsHandoff["view"],
    origin: SettingsHandoff["origin"],
  ) => void;
  readonly returnFromSettings: () => void;
}

export const ContextualHandoffContext = createContext<ContextualHandoffApi | null>(null);

export function useContextualHandoffs(): ContextualHandoffApi {
  const value = useContext(ContextualHandoffContext);
  if (!value) throw new Error("Contextual handoffs require the product shell provider.");
  return value;
}
