import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureApplicationMaterialPanel } from "../src/renderer/CandidatureApplicationMaterialPanel";
import type {
  ApplicationArtifactRecord,
  ArtifactDesktopApi,
} from "../src/shared/artifact-contracts";
import type { CandidatureRecord, DocumentRecord } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000801";
const workingDocument: DocumentRecord = {
  id: "00000000-0000-4000-8000-000000000802",
  kind: "cv",
  title: "Platform CV",
  variantId: null,
  engine: "pdflatex",
  bodyParagraphs: [],
  mode: "managed",
  rules: [],
  projectPath: "/workspace/documents/platform-cv",
  sourcePath: "/workspace/documents/platform-cv/main.tex",
  artifactPath: "/workspace/documents/platform-cv/build/main.pdf",
};
const otherDocument: DocumentRecord = {
  ...workingDocument,
  id: "00000000-0000-4000-8000-000000000803",
  kind: "cover_letter",
  title: "General letter",
};
const candidature: CandidatureRecord = {
  id: candidatureId,
  archived: false,
  createdAt: "2026-09-11T10:00:00.000Z",
  updatedAt: "2026-09-11T10:00:00.000Z",
  label: "Nimbus Labs",
  sourceSearchText: "",
  values: [],
  documentIds: [workingDocument.id],
  tagIds: [],
};
const artifact: ApplicationArtifactRecord = {
  id: "00000000-0000-4000-8000-000000000804",
  candidatureId,
  cvDocumentId: workingDocument.id,
  coverLetterDocumentId: null,
  kind: "cv",
  title: "Platform CV submitted",
  capturedAt: "2026-09-10T14:30:00.000Z",
  projectPath: "/workspace/artifacts/platform-cv",
  sourcePath: "/workspace/artifacts/platform-cv/main.tex",
  artifactPath: "/workspace/artifacts/platform-cv/main.pdf",
};
const combinedArtifact: ApplicationArtifactRecord = {
  id: "00000000-0000-4000-8000-000000000806",
  candidatureId,
  cvDocumentId: workingDocument.id,
  coverLetterDocumentId: otherDocument.id,
  kind: "combined",
  title: "Combined: General letter + Platform CV",
  capturedAt: "2026-09-10T15:30:00.000Z",
  projectPath: "/workspace/artifacts/combined",
  sourcePath: "/workspace/artifacts/combined/main.tex",
  artifactPath: "/workspace/artifacts/combined/build/main.pdf",
};

const listArtifacts = vi.fn<ArtifactDesktopApi["artifacts"]["list"]>();
const openArtifact = vi.fn<ArtifactDesktopApi["artifacts"]["open"]>();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      artifacts: {
        list: listArtifacts,
        capture: vi.fn(),
        captureCombined: vi.fn(),
        open: openArtifact,
      },
    },
  });
}

function renderPanel(options: {
  readonly record?: CandidatureRecord;
  readonly documents?: readonly DocumentRecord[];
  readonly selectedDocumentIds?: readonly string[];
  readonly documentSelectionDirty?: boolean;
} = {}) {
  const onDocumentSelectionChange = vi.fn();
  const onSaveDocuments = vi.fn();
  const onOpenDocument = vi.fn();
  const rendered = render(
    <CandidatureApplicationMaterialPanel
      candidature={options.record ?? candidature}
      documents={options.documents ?? [workingDocument, otherDocument]}
      selectedDocumentIds={options.selectedDocumentIds ?? [workingDocument.id]}
      documentSelectionDirty={options.documentSelectionDirty ?? false}
      onDocumentSelectionChange={onDocumentSelectionChange}
      onSaveDocuments={onSaveDocuments}
      onOpenDocument={onOpenDocument}
    />,
  );
  return { ...rendered, onDocumentSelectionChange, onSaveDocuments, onOpenDocument };
}

beforeEach(() => {
  vi.clearAllMocks();
  listArtifacts.mockResolvedValue([artifact]);
  openArtifact.mockResolvedValue({ opened: true });
  installApi();
});

afterEach(() => cleanup());

describe("candidature Documents", () => {
  it("shows linked editable documents and opens saved PDFs through the artifact API", async () => {
    const user = userEvent.setup();
    const { onOpenDocument } = renderPanel();

    const linked = await screen.findByRole("region", { name: "CVs and letters for this candidature" });
    expect(within(linked).getByRole("heading", { name: "Platform CV" })).toBeInTheDocument();
    expect(within(linked).getByText("CV")).toBeInTheDocument();
    expect(within(linked).getByText("Editable document")).toBeInTheDocument();

    const saved = await screen.findByRole("region", { name: "Saved application PDFs" });
    expect(within(saved).getByRole("heading", { name: "Platform CV submitted" })).toBeInTheDocument();
    expect(within(saved).getByText("Saved CV")).toBeInTheDocument();
    await user.click(within(saved).getByRole("button", { name: "Open PDF" }));
    expect(openArtifact).toHaveBeenCalledWith(artifact.id);

    const linking = screen.getByText("Link an existing CV or letter", { selector: "summary" });
    expect(screen.getByRole("checkbox", { name: "General letter (cover letter)" })).not.toBeVisible();

    await user.click(within(linked).getByRole("button", { name: "Open document" }));
    expect(onOpenDocument).toHaveBeenCalledWith(workingDocument.id);
    await user.click(screen.getByRole("button", { name: "Create CV or letter" }));
    expect(onOpenDocument).toHaveBeenCalledWith();

    await user.click(linking);
    expect(screen.getByRole("checkbox", { name: "General letter (cover letter)" })).toBeVisible();
  });

  it("identifies a combined saved PDF without exposing artifact jargon", async () => {
    listArtifacts.mockResolvedValue([combinedArtifact]);
    renderPanel();

    const saved = await screen.findByRole("region", { name: "Saved application PDFs" });
    expect(within(saved).getByText("Saved CV + cover letter")).toBeInTheDocument();
    expect(
      within(saved).getByRole("heading", { name: "Combined: General letter + Platform CV" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/artifact/i)).not.toBeInTheDocument();
  });

  it("reports saved-PDF open failures without mutating document links", async () => {
    const user = userEvent.setup();
    openArtifact.mockRejectedValue(new Error("The saved application PDF is missing."));
    const { rerender, onDocumentSelectionChange, onSaveDocuments, onOpenDocument } = renderPanel();

    const saved = await screen.findByRole("region", { name: "Saved application PDFs" });
    await user.click(within(saved).getByRole("button", { name: "Open PDF" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The saved application PDF is missing.");
    expect(onDocumentSelectionChange).not.toHaveBeenCalled();
    expect(onSaveDocuments).not.toHaveBeenCalled();

    rerender(
      <CandidatureApplicationMaterialPanel
        candidature={{ ...candidature, id: "00000000-0000-4000-8000-000000000805", label: "Other role" }}
        documents={[workingDocument, otherDocument]}
        selectedDocumentIds={[workingDocument.id]}
        documentSelectionDirty={false}
        onDocumentSelectionChange={onDocumentSelectionChange}
        onSaveDocuments={onSaveDocuments}
        onOpenDocument={onOpenDocument}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("preserves explicit linking changes and save as secondary management", async () => {
    const user = userEvent.setup();
    const { rerender, onDocumentSelectionChange, onSaveDocuments, onOpenDocument } = renderPanel();

    await screen.findByRole("region", { name: "CVs and letters for this candidature" });
    await user.click(screen.getByText("Link an existing CV or letter", { selector: "summary" }));
    await user.click(screen.getByRole("checkbox", { name: "General letter (cover letter)" }));
    expect(onDocumentSelectionChange).toHaveBeenCalledWith([workingDocument.id, otherDocument.id]);
    expect(screen.getByRole("button", { name: "Save links" })).toBeDisabled();

    rerender(
      <CandidatureApplicationMaterialPanel
        candidature={candidature}
        documents={[workingDocument, otherDocument]}
        selectedDocumentIds={[workingDocument.id, otherDocument.id]}
        documentSelectionDirty
        onDocumentSelectionChange={onDocumentSelectionChange}
        onSaveDocuments={onSaveDocuments}
        onOpenDocument={onOpenDocument}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Save links" }));
    expect(onSaveDocuments).toHaveBeenCalledTimes(1);
  });

  it("uses a simple empty state while keeping linking reachable", async () => {
    listArtifacts.mockResolvedValue([]);
    const sparse = { ...candidature, documentIds: [] };
    renderPanel({ record: sparse, selectedDocumentIds: [] });

    expect(await screen.findByText("No documents are linked to this candidature yet.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "CVs and letters for this candidature" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Saved application PDFs" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Platform CV (CV)" })).not.toBeVisible();
    expect(screen.getByText("Link an existing CV or letter", { selector: "summary" })).toBeVisible();
  });
});
