import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CombinedDocumentExportPanel } from "../src/renderer/CombinedDocumentExportPanel";
import {
  ContextualHandoffContext,
  type ContextualHandoffApi,
} from "../src/renderer/contextual-handoffs";
import type { ArtifactDesktopApi } from "../src/shared/artifact-contracts";
import type { CombinedDocumentDesktopApi } from "../src/shared/combined-document-contracts";
import type { CandidatureRecord, DocumentRecord } from "../src/shared/contracts";

function record(id: string, kind: "cv" | "cover_letter", title: string): DocumentRecord {
  return {
    id,
    kind,
    title,
    variantId: null,
    engine: "pdflatex",
    bodyParagraphs: [],
    mode: "managed",
    rules: [],
    projectPath: `/tmp/${id}`,
    sourcePath: `/tmp/${id}/main.tex`,
    artifactPath: `/tmp/${id}/build/main.pdf`,
  };
}

const cv = record("00000000-0000-4000-8000-000000000801", "cv", "Platform CV");
const coverLetter = record(
  "00000000-0000-4000-8000-000000000802",
  "cover_letter",
  "Platform cover letter",
);
const candidature: CandidatureRecord = {
  id: "00000000-0000-4000-8000-000000000803",
  archived: false,
  createdAt: "2026-09-11T00:00:00.000Z",
  updatedAt: "2026-09-11T00:00:00.000Z",
  label: "Platform role",
  sourceSearchText: "",
  values: [],
  documentIds: [cv.id, coverLetter.id],
  conceptIds: [],
};
const combinedArtifact = {
  id: "00000000-0000-4000-8000-000000000804",
  candidatureId: candidature.id,
  cvDocumentId: cv.id,
  coverLetterDocumentId: coverLetter.id,
  kind: "combined" as const,
  title: "Combined: Platform cover letter + Platform CV",
  capturedAt: "2026-09-11T00:00:00.000Z",
  projectPath: "/tmp/artifact",
  sourcePath: "/tmp/artifact/main.tex",
  artifactPath: "/tmp/artifact/build/main.pdf",
};
const exportPacket = vi.fn<CombinedDocumentDesktopApi["combinedDocuments"]["exportPacket"]>();
const captureCombined = vi.fn<ArtifactDesktopApi["artifacts"]["captureCombined"]>();

function handoffs(candidatureId?: string): ContextualHandoffApi {
  return {
    documentHandoff: candidatureId ? { candidatureId } : null,
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

function installApi(records: readonly CandidatureRecord[] = []) {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      combinedDocuments: { exportPacket },
      candidatures: { list: vi.fn().mockResolvedValue(records) },
      artifacts: { captureCombined },
    },
  });
}

describe("combined document export panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exportPacket.mockResolvedValue({ exportedPath: "/tmp/application-packet" });
    captureCombined.mockResolvedValue(combinedArtifact);
    installApi();
  });

  afterEach(() => cleanup());

  it("exports the selected CV and cover letter through the named desktop operation", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onNotice = vi.fn();
    render(
      <CombinedDocumentExportPanel
        documents={[cv, coverLetter]}
        disabled={false}
        onError={onError}
        onNotice={onNotice}
      />,
    );

    expect(screen.getByLabelText("Combined CV")).toHaveValue(cv.id);
    expect(screen.getByLabelText("Combined cover letter")).toHaveValue(coverLetter.id);
    await user.click(screen.getByRole("button", { name: "Export combined packet" }));

    expect(exportPacket).toHaveBeenCalledWith({
      cvDocumentId: cv.id,
      coverLetterDocumentId: coverLetter.id,
    });
    expect(onNotice).toHaveBeenCalledWith(
      "Combined application packet exported: /tmp/application-packet",
    );
  });

  it("retains the selected pair only when both belong to the candidature context", async () => {
    installApi([candidature]);
    const user = userEvent.setup();
    const onNotice = vi.fn();
    render(
      <ContextualHandoffContext.Provider value={handoffs(candidature.id)}>
        <CombinedDocumentExportPanel
          documents={[cv, coverLetter]}
          disabled={false}
          onError={vi.fn()}
          onNotice={onNotice}
        />
      </ContextualHandoffContext.Provider>,
    );

    const retain = await screen.findByRole("button", {
      name: "Retain combined application artifact",
    });
    expect(retain).toBeEnabled();
    await user.click(retain);

    expect(captureCombined).toHaveBeenCalledWith({
      candidatureId: candidature.id,
      cvDocumentId: cv.id,
      coverLetterDocumentId: coverLetter.id,
    });
    expect(onNotice).toHaveBeenCalledWith(
      `Retained combined application artifact: ${combinedArtifact.artifactPath}`,
    );
  });

  it("does not offer retention for an unassociated selected pair", async () => {
    installApi([{ ...candidature, documentIds: [cv.id] }]);
    render(
      <ContextualHandoffContext.Provider value={handoffs(candidature.id)}>
        <CombinedDocumentExportPanel
          documents={[cv, coverLetter]}
          disabled={false}
          onError={vi.fn()}
          onNotice={vi.fn()}
        />
      </ContextualHandoffContext.Provider>,
    );

    const retain = await screen.findByRole("button", {
      name: "Retain combined application artifact",
    });
    expect(retain).toBeDisabled();
    expect(screen.getByText(/Associate both selected working documents/)).toBeInTheDocument();
  });

  it("requires both working-document kinds", () => {
    render(
      <CombinedDocumentExportPanel
        documents={[cv]}
        disabled={false}
        onError={vi.fn()}
        onNotice={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Create at least one CV and one cover letter/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export combined packet" })).not.toBeInTheDocument();
  });
});
