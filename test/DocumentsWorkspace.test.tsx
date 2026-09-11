import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentsWorkspace } from "../src/renderer/DocumentsWorkspace";
import {
  ContextualHandoffContext,
  type ContextualHandoffApi,
} from "../src/renderer/contextual-handoffs";
import type {
  ApplicationArtifactRecord,
  ArtifactDesktopApi,
} from "../src/shared/artifact-contracts";
import type {
  CandidatureRecord,
  DesktopApi,
  DocumentRecord,
  ProfileSnapshot,
  ProfileVariant,
} from "../src/shared/contracts";
import type { CvContentAccessDesktopApi } from "../src/shared/cv-content-access-contracts";
import type { CvDescriptorDesktopApi } from "../src/shared/cv-descriptor-contracts";
import type { DocumentOutputDesktopApi } from "../src/shared/document-output-contracts";

const item = {
  id: "00000000-0000-4000-8000-000000000101",
  kind: "summary" as const,
  title: "Canonical summary",
  description: "General profile text",
  sortOrder: 0,
};
const variant: ProfileVariant = {
  id: "00000000-0000-4000-8000-000000000102",
  name: "Platform focus",
  focus: "Platform",
  targetTags: ["platform"],
  preferredLanguage: "en",
  rules: [],
};
const profile: ProfileSnapshot = { items: [item], variants: [variant] };

function record(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: "00000000-0000-4000-8000-000000000103",
    kind: "cv",
    title: "Platform CV",
    variantId: variant.id,
    engine: "pdflatex",
    bodyParagraphs: [],
    mode: "managed",
    rules: [],
    projectPath: "/tmp/workspace/documents/doc",
    sourcePath: "/tmp/workspace/documents/doc/main.tex",
    artifactPath: "/tmp/workspace/documents/doc/build/main.pdf",
    ...overrides,
  };
}

const candidature: CandidatureRecord = {
  id: "00000000-0000-4000-8000-000000000104",
  archived: false,
  createdAt: "2026-09-06T12:00:00.000Z",
  updatedAt: "2026-09-06T12:00:00.000Z",
  label: "Example opportunity",
  sourceSearchText: "",
  values: [],
  documentIds: [record().id],
  conceptIds: [],
};

const retainedArtifact: ApplicationArtifactRecord = {
  id: "00000000-0000-4000-8000-000000000105",
  candidatureId: candidature.id,
  cvDocumentId: record().id,
  coverLetterDocumentId: null,
  kind: "cv",
  title: "Platform CV",
  capturedAt: "2026-09-06T12:30:00.000Z",
  projectPath: "/tmp/workspace/artifacts/retained",
  sourcePath: "/tmp/workspace/artifacts/retained/main.tex",
  artifactPath: "/tmp/workspace/artifacts/retained/build/main.pdf",
};

const list = vi.fn<DesktopApi["documents"]["list"]>();
const create = vi.fn<DesktopApi["documents"]["create"]>();
const update = vi.fn<DesktopApi["documents"]["update"]>();
const resolve = vi.fn<DesktopApi["documents"]["resolve"]>();
const renderDocument = vi.fn<DesktopApi["documents"]["render"]>();
const regenerate = vi.fn<DesktopApi["documents"]["regenerate"]>();
const exportProject = vi.fn<DesktopApi["documents"]["exportProject"]>();
const listCandidatures = vi.fn<DesktopApi["candidatures"]["list"]>();
const listArtifacts = vi.fn<ArtifactDesktopApi["artifacts"]["list"]>();
const captureArtifact = vi.fn<ArtifactDesktopApi["artifacts"]["capture"]>();
const openDocumentOutput = vi.fn<DocumentOutputDesktopApi["documentOutput"]["open"]>();
const currentCvContentAccess = vi.fn<CvContentAccessDesktopApi["cvContentAccess"]["current"]>();
const updateCvContentAccess = vi.fn<CvContentAccessDesktopApi["cvContentAccess"]["update"]>();
const updateCvRenderAccess = vi.fn<CvContentAccessDesktopApi["cvContentAccess"]["updateRender"]>();
const currentCvDescriptor = vi.fn<CvDescriptorDesktopApi["cvDescriptors"]["current"]>();
const updateCvDescriptor = vi.fn<CvDescriptorDesktopApi["cvDescriptors"]["update"]>();

function installApi(currentProfile: ProfileSnapshot = profile) {
  const api = {
    profile: {
      current: async () => currentProfile,
      resolveVariant: async () => ({ variant, items: [item] }),
    },
    documents: {
      list,
      create,
      update,
      remove: vi.fn(),
      configureItem: vi.fn(),
      reorder: vi.fn(),
      resolve,
      render: renderDocument,
      regenerate,
      exportProject,
    },
    documentOutput: { open: openDocumentOutput },
    cvContentAccess: {
      current: currentCvContentAccess,
      update: updateCvContentAccess,
      updateRender: updateCvRenderAccess,
    },
    cvDescriptors: { current: currentCvDescriptor, update: updateCvDescriptor },
    candidatures: { list: listCandidatures },
    artifacts: { list: listArtifacts, capture: captureArtifact },
  } as unknown as DesktopApi &
    ArtifactDesktopApi &
    CvContentAccessDesktopApi &
    CvDescriptorDesktopApi &
    DocumentOutputDesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

function candidatureHandoffs(documentId?: string): ContextualHandoffApi {
  return {
    documentHandoff: { candidatureId: candidature.id, documentId },
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

function renderForCandidature(documentId?: string) {
  return render(
    <ContextualHandoffContext.Provider value={candidatureHandoffs(documentId)}>
      <DocumentsWorkspace />
    </ContextualHandoffContext.Provider>,
  );
}

describe("manual CVs and letters workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue([]);
    listCandidatures.mockResolvedValue([]);
    listArtifacts.mockResolvedValue([]);
    captureArtifact.mockResolvedValue(retainedArtifact);
    openDocumentOutput.mockResolvedValue({ opened: true });
    create.mockResolvedValue(record({ variantId: null }));
    update.mockImplementation(async (value) => record({ ...value }));
    resolve.mockResolvedValue({ document: record(), items: [item] });
    renderDocument.mockResolvedValue(record());
    regenerate.mockResolvedValue(record());
    exportProject.mockResolvedValue(null);
    currentCvContentAccess.mockImplementation(async (documentId) => ({
      documentId,
      allowed: false,
      renderAllowed: false,
    }));
    updateCvContentAccess.mockImplementation(async (value) => ({
      documentId: value.documentId,
      allowed: value.allowed,
      renderAllowed: false,
    }));
    updateCvRenderAccess.mockImplementation(async (value) => ({
      documentId: value.documentId,
      allowed: true,
      renderAllowed: value.allowed,
    }));
    currentCvDescriptor.mockImplementation(async (documentId) => ({
      documentId,
      tags: [],
      notes: null,
    }));
    updateCvDescriptor.mockImplementation(async (value) => value);
    installApi();
  });

  afterEach(() => cleanup());

  it("creates a CV from default professional information and makes the rendered result the ordinary output task", async () => {
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);
    await screen.findByRole("heading", { name: "CVs & letters" });
    expect(screen.getByLabelText("Professional information")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Default professional information" })).toBeInTheDocument();
    expect(screen.queryByText("Canonical profile")).not.toBeInTheDocument();
    expect(screen.queryByText("Profile basis")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Title"), "Platform CV");
    await user.click(screen.getByRole("button", { name: "Create CV" }));

    expect(create).toHaveBeenCalledWith({
      kind: "cv",
      title: "Platform CV",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });

    await user.click(screen.getByRole("tab", { name: "Output" }));
    expect(screen.getByRole("region", { name: "Rendered PDF result" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Render PDF" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Export portable project" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Open PDF" })).not.toBeInTheDocument();
    expect(screen.getByText("/tmp/workspace/documents/doc/main.tex")).not.toBeVisible();
    expect(screen.getByText("/tmp/workspace/documents/doc/build/main.pdf")).not.toBeVisible();
    expect(screen.getByRole("heading", { name: "AI-visible CV description" })).not.toBeVisible();
    expect(screen.getByRole("heading", { name: "External CV content access" })).not.toBeVisible();
    expect(screen.queryByRole("heading", { name: "Retained application artifacts" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Render PDF" }));
    expect(renderDocument).toHaveBeenCalledWith(record().id);
    expect(await screen.findByText("PDF rendered successfully. Open the result below.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Open PDF" }));
    expect(openDocumentOutput).toHaveBeenCalledWith(record().id);
    expect(await screen.findByText("Opened the rendered PDF.")).toBeVisible();

    await user.click(screen.getByText("Source & advanced ownership"));
    expect(screen.getByText("/tmp/workspace/documents/doc/main.tex")).toBeVisible();
    expect(screen.getByText("/tmp/workspace/documents/doc/build/main.pdf")).toBeVisible();
    await user.click(screen.getByText("External assistant privacy & integration"));
    expect(await screen.findByRole("heading", { name: "AI-visible CV description" })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "External CV content access" })).toBeVisible();
  });

  it("keeps candidature artifact administration out of standalone output even when candidatures exist", async () => {
    const document = record();
    list.mockResolvedValueOnce([document]);
    listCandidatures.mockResolvedValueOnce([candidature]);
    resolve.mockResolvedValue({ document, items: [item] });
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    await screen.findByRole("heading", { name: "Platform CV" });
    await user.click(screen.getByRole("tab", { name: "Output" }));
    expect(screen.queryByText(`Application artifact for ${candidature.label}`)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Retained application artifacts" })).not.toBeInTheDocument();
    expect(listArtifacts).not.toHaveBeenCalled();
  });

  it("creates from default professional information when no saved variations exist", async () => {
    installApi({ items: [item], variants: [] });
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);
    await screen.findByRole("heading", { name: "CVs & letters" });
    expect(screen.getByLabelText("Professional information")).toHaveValue("");
    await user.type(screen.getByLabelText("Title"), "General CV");
    await user.click(screen.getByRole("button", { name: "Create CV" }));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "General CV", variantId: null }),
    );
  });

  it("can explicitly create a CV from a saved variation", async () => {
    create.mockResolvedValueOnce(record({ variantId: variant.id }));
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);
    await screen.findByRole("heading", { name: "CVs & letters" });
    await user.type(screen.getByLabelText("Title"), "Focused CV");
    await user.selectOptions(screen.getByLabelText("Professional information"), variant.id);
    await user.click(screen.getByRole("button", { name: "Create CV" }));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Focused CV", variantId: variant.id }),
    );
    await user.click(screen.getByRole("tab", { name: "Professional information" }));
    expect(screen.getByText(/saved variation “Platform focus”/)).toBeInTheDocument();
  });

  it("preserves a dirty document while switching local intentions and returning to collection", async () => {
    const document = record();
    list.mockResolvedValueOnce([document]);
    resolve.mockResolvedValue({ document, items: [item] });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    const collectionButton = await screen.findByRole("button", { name: /Platform CV/ });
    const workspace = screen.getByRole("region", { name: "CVs & letters" });
    await user.click(collectionButton);
    expect(workspace).toHaveClass("compact-document-detail");

    const content = screen.getByRole("tabpanel", { name: "Document content" });
    const titleInput = within(content).getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Unsaved platform CV");
    await user.click(screen.getByRole("tab", { name: "Professional information" }));
    await user.click(screen.getByRole("tab", { name: "Output" }));
    await user.click(screen.getByRole("tab", { name: "Content" }));
    expect(within(content).getByLabelText("Title")).toHaveValue("Unsaved platform CV");
    expect(confirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Back to CVs & letters" }));
    expect(workspace).not.toHaveClass("compact-document-detail");
    expect(within(content).getByLabelText("Title")).toHaveValue("Unsaved platform CV");
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("edits cover-letter content through the document service without exposing CV-only controls", async () => {
    const cover = record({
      kind: "cover_letter",
      title: "Cover letter",
      recipient: "Hiring team",
      subject: "Application",
      bodyParagraphs: ["Original paragraph"],
      closing: "Regards",
    });
    list.mockResolvedValueOnce([cover]);
    resolve.mockResolvedValue({ document: cover, items: [item] });
    update.mockResolvedValue({
      ...cover,
      recipient: "Hiring manager",
      bodyParagraphs: ["Edited paragraph"],
    });
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    const saveButton = await screen.findByRole("button", { name: "Save changes" });
    expect(screen.queryByRole("heading", { name: "AI-visible CV description" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "External CV content access" })).not.toBeInTheDocument();
    expect(currentCvDescriptor).not.toHaveBeenCalled();
    expect(currentCvContentAccess).not.toHaveBeenCalled();
    const form = saveButton.closest("form");
    if (!form) throw new Error("Expected document edit form");
    const editor = within(form);
    await user.clear(editor.getByLabelText("Recipient"));
    await user.type(editor.getByLabelText("Recipient"), "Hiring manager");
    await user.clear(editor.getByLabelText("Body paragraphs"));
    await user.type(editor.getByLabelText("Body paragraphs"), "Edited paragraph");
    await user.click(saveButton);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: cover.id,
        recipient: "Hiring manager",
        bodyParagraphs: ["Edited paragraph"],
      }),
    );
  });

  it("keeps direct source preservation explicit before deliberate replacement", async () => {
    const manual = record({ mode: "manual" });
    list.mockResolvedValueOnce([manual]);
    resolve.mockResolvedValue({ document: manual, items: [item] });
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    expect(await screen.findByText(/Direct source edits were detected/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Output" }));
    await user.click(screen.getByRole("button", { name: "Replace manual source from structured data" }));
    expect(regenerate).toHaveBeenCalledWith(manual.id);
  });

  it("retains a working document only in candidature-linked context", async () => {
    const document = record();
    list.mockResolvedValueOnce([document]);
    listCandidatures.mockResolvedValueOnce([candidature]);
    resolve.mockResolvedValue({ document, items: [item] });
    const user = userEvent.setup();
    renderForCandidature(document.id);

    await screen.findByRole("heading", { name: "Platform CV" });
    await user.click(screen.getByRole("tab", { name: "Output" }));
    await user.click(await screen.findByText(`Application artifact for ${candidature.label}`));
    const retain = await screen.findByRole("button", { name: "Retain application artifact" });
    await user.click(retain);

    expect(listArtifacts).toHaveBeenCalledWith(candidature.id);
    expect(captureArtifact).toHaveBeenCalledWith({
      candidatureId: candidature.id,
      documentId: document.id,
    });
    expect(await screen.findByText(retainedArtifact.artifactPath)).toBeVisible();
  });

  it("lists retained candidature artifacts without a surviving working document association only in candidature context", async () => {
    list.mockResolvedValueOnce([]);
    listCandidatures.mockResolvedValueOnce([{ ...candidature, documentIds: [] }]);
    listArtifacts.mockResolvedValueOnce([retainedArtifact]);
    const user = userEvent.setup();
    renderForCandidature();

    await user.click(await screen.findByText(`Application artifact for ${candidature.label}`));
    expect(await screen.findByText(retainedArtifact.artifactPath)).toBeVisible();
    expect(screen.getByText(retainedArtifact.sourcePath)).toBeVisible();
    expect(listArtifacts).toHaveBeenCalledWith(candidature.id);
    expect(screen.queryByRole("button", { name: "Retain application artifact" })).not.toBeInTheDocument();
  });
});
