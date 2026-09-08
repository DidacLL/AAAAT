export type CandidatureHandoff = {
  readonly candidatureId: string;
  readonly section: "documents";
};

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
  readonly documentId?: string;
  readonly candidatureId?: string;
};
