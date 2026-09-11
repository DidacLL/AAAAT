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
  conceptIds: [],
};
const artifact: ApplicationArtifactRecord = {
  id: "00000000-0000-4000-8000-000000000804",
  candidatureId,
  documentId: workingDocument.id,
  kind: "cv",
  title: "Platform CV submitted",
  capturedAt: "2026-09-10T14:30:00.000Z",
  projectPath: "/workspace/artifacts/platform-cv",
  sourcePath: "/workspace/artifacts/platform-cv/main.tex",
  artifactPath: "/workspace/artifacts/platform-cv/main.pdf",
};

const listArtifacts = vi.fn<ArtifactDesktopApi["artifacts"]["list"]>();
const openArtifact = vi.fn<ArtifactDesktopApi["artifacts"]["open"]>();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: { artifacts: { list: listArtifacts, capture: vi.fn(), open: openArtifact } },
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

describe("task-first candidature application material", () => {
  it("shows owned working material and opens retained exact artifacts through the artifact API", async () => {
    const user = userEvent.setup();
    const { onOpenDocument } = renderPanel();

    const working = await screen.findByRole("region", { name: "Working application documents" });
    expect(within(working).getByRole("heading", { name: "Platform CV" })).toBeInTheDocument();
    expect(within(working).getByText("Working CV")).toBeInTheDocument();
    expect(within(working).getByText(/not a retained exact application artifact/)).toBeInTheDocument();

    const retained = await screen.findByRole("region", { name: "Retained application artifacts" });
    expect(within(retained).getByRole("heading", { name: "Platform CV submitted" })).toBeInTheDocument();
    expect(within(retained).getByText("Retained exact CV artifact")).toBeInTheDocument();
    await user.click(within(retained).getByRole("button", { name: "Open retained PDF" }));
    expect(openArtifact).toHaveBeenCalledWith(artifact.id);

    const management = screen.getByText("Manage existing document associations", { selector: "summary" });
    expect(screen.getByRole("checkbox", { name: "General letter (cover letter)" })).not.toBeVisible();

    await user.click(within(working).getByRole("button", { name: "Open in CVs & letters" }));
    expect(onOpenDocument).toHaveBeenCalledWith(workingDocument.id);
    await user.click(screen.getByRole("button", { name: "Create CV or letter for this candidature" }));
    expect(onOpenDocument).toHaveBeenCalledWith();

    await user.click(management);
    expect(screen.getByRole("checkbox", { name: "General letter (cover letter)" })).toBeVisible();
  });

  it("refreshes retained artifacts when document return refreshes the document projection", async () => {
    listArtifacts.mockResolvedValueOnce([]).mockResolvedValueOnce([artifact]);
    const documents = [workingDocument, otherDocument];
    const { rerender, onDocumentSelectionChange, onSaveDocuments, onOpenDocument } = renderPanel({
      documents,
    });

    await screen.findByText(/No application material belongs to this candidature yet|Working documents/);
    expect(screen.queryByRole("region", { name: "Retained application artifacts" })).not.toBeInTheDocument();

    rerender(
      <CandidatureApplicationMaterialPanel
        candidature={candidature}
        documents={[...documents]}
        selectedDocumentIds={[workingDocument.id]}
        documentSelectionDirty={false}
        onDocumentSelectionChange={onDocumentSelectionChange}
        onSaveDocuments={onSaveDocuments}
        onOpenDocument={onOpenDocument}
      />,
    );

    const retained = await screen.findByRole("region", { name: "Retained application artifacts" });
    expect(within(retained).getByRole("heading", { name: "Platform CV submitted" })).toBeInTheDocument();
    expect(listArtifacts).toHaveBeenCalledTimes(2);
  });

  it("reports retained artifact open failures without mutating document associations", async () => {
    const user = userEvent.setup();
    openArtifact.mockRejectedValue(new Error("The retained application PDF is missing."));
    const { onDocumentSelectionChange, onSaveDocuments } = renderPanel();

    const retained = await screen.findByRole("region", { name: "Retained application artifacts" });
    await user.click(within(retained).getByRole("button", { name: "Open retained PDF" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The retained application PDF is missing.");
    expect(onDocumentSelectionChange).not.toHaveBeenCalled();
    expect(onSaveDocuments).not.toHaveBeenCalled();
  });

  it("preserves explicit association changes and save as secondary management", async () => {
    const user = userEvent.setup();
    const { rerender, onDocumentSelectionChange, onSaveDocuments, onOpenDocument } = renderPanel();

    await screen.findByRole("region", { name: "Working application documents" });
    await user.click(screen.getByText("Manage existing document associations", { selector: "summary" }));
    await user.click(screen.getByRole("checkbox", { name: "General letter (cover letter)" }));
    expect(onDocumentSelectionChange).toHaveBeenCalledWith([workingDocument.id, otherDocument.id]);
    expect(screen.getByRole("button", { name: "Save document associations" })).toBeDisabled();

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
    await user.click(screen.getByRole("button", { name: "Save document associations" }));
    expect(onSaveDocuments).toHaveBeenCalledTimes(1);
  });

  it("uses a task-first empty state while keeping association management reachable", async () => {
    listArtifacts.mockResolvedValue([]);
    const sparse = { ...candidature, documentIds: [] };
    renderPanel({ record: sparse, selectedDocumentIds: [] });

    expect(
      await screen.findByText(/No application material belongs to this candidature yet/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Working application documents" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Retained application artifacts" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Platform CV (CV)" })).not.toBeVisible();
    expect(screen.getByText("Manage existing document associations", { selector: "summary" })).toBeVisible();
  });
});
