import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureApplicationMaterialPanel } from "../src/renderer/CandidatureApplicationMaterialPanel";
import {
  ContextualHandoffContext,
  type ContextualHandoffApi,
  type DocumentHandoff,
} from "../src/renderer/contextual-handoffs";
import type { ApplicationArtifactRecord } from "../src/shared/artifact-contracts";
import type { CandidatureRecord } from "../src/shared/contracts";

const candidature: CandidatureRecord = {
  id: "00000000-0000-4000-8000-000000000301",
  archived: false,
  createdAt: "2026-09-11T12:00:00.000Z",
  updatedAt: "2026-09-11T12:00:00.000Z",
  label: "Refresh opportunity",
  sourceSearchText: "",
  values: [],
  documentIds: [],
  conceptIds: [],
};

const combinedArtifact: ApplicationArtifactRecord = {
  id: "00000000-0000-4000-8000-000000000302",
  candidatureId: candidature.id,
  cvDocumentId: "00000000-0000-4000-8000-000000000303",
  coverLetterDocumentId: "00000000-0000-4000-8000-000000000304",
  kind: "combined",
  title: "Combined: Handoff letter + Second Handoff CV",
  capturedAt: "2026-09-11T12:30:00.000Z",
  projectPath: "/tmp/artifacts/combined",
  sourcePath: "/tmp/artifacts/combined/main.tex",
  artifactPath: "/tmp/artifacts/combined/build/main.pdf",
};

const listArtifacts = vi.fn();

function handoffs(documentHandoff: DocumentHandoff | null): ContextualHandoffApi {
  return {
    documentHandoff,
    professionalInformationHandoff: null,
    settingsHandoff: null,
    openDocumentFromCandidature: vi.fn(),
    returnToCandidature: vi.fn(),
    openProfessionalInformationItem: vi.fn(),
    returnToDocument: vi.fn(),
    openSettingsFor: vi.fn(),
    returnFromSettings: vi.fn(),
  };
}

function panel(documentHandoff: DocumentHandoff | null) {
  return (
    <ContextualHandoffContext.Provider value={handoffs(documentHandoff)}>
      <CandidatureApplicationMaterialPanel
        candidature={candidature}
        documents={[]}
        selectedDocumentIds={[]}
        documentSelectionDirty={false}
        onDocumentSelectionChange={vi.fn()}
        onSaveDocuments={vi.fn()}
        onOpenDocument={vi.fn()}
      />
    </ContextualHandoffContext.Provider>
  );
}

describe("candidature application material refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listArtifacts.mockResolvedValueOnce([]).mockResolvedValueOnce([combinedArtifact]);
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        artifacts: {
          list: listArtifacts,
          capture: vi.fn(),
          captureCombined: vi.fn(),
          open: vi.fn(),
        },
      },
    });
  });

  afterEach(() => cleanup());

  it("re-lists retained artifacts when returning from contextual document work", async () => {
    const { rerender } = render(
      panel({ candidatureId: candidature.id, documentId: combinedArtifact.coverLetterDocumentId }),
    );

    await waitFor(() => expect(listArtifacts).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("heading", { name: combinedArtifact.title })).not.toBeInTheDocument();

    rerender(panel(null));

    expect(await screen.findByRole("heading", { name: combinedArtifact.title })).toBeVisible();
    expect(screen.getByText("Retained exact combined CV + cover letter artifact")).toBeVisible();
    expect(listArtifacts).toHaveBeenCalledTimes(2);
  });
});
