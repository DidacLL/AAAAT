import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentsWorkspace } from "../src/renderer/DocumentsWorkspace";
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
  documentId: record().id,
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
const currentCvContentAccess = vi.fn<CvContentAccessDesktopApi["cvContentAccess"]["current"]>();
const updateCvContentAccess = vi.fn<CvContentAccessDesktopApi["cvContentAccess"]["update"]>();
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
    cvContentAccess: { current: currentCvContentAccess, update: updateCvContentAccess },
    cvDescriptors: { current: currentCvDescriptor, update: updateCvDescriptor },
    candidatures: { list: listCandidatures },
    artifacts: { list: listArtifacts, capture: captureArtifact },
  } as unknown as DesktopApi & ArtifactDesktopApi & CvContentAccessDesktopApi & CvDescriptorDesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

describe("manual Documents workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue([]);
    listCandidatures.mockResolvedValue([]);
    listArtifacts.mockResolvedValue([]);
    captureArtifact.mockResolvedValue(retainedArtifact);
    create.mockResolvedValue(record({ variantId: null }));
    update.mockImplementation(async (value) => record({ ...value }));
    resolve.mockResolvedValue({ document: record(), items: [item] });
    renderDocument.mockResolvedValue(record());
    regenerate.mockResolvedValue(record());
    exportProject.mockResolvedValue(null);
    currentCvContentAccess.mockImplementation(async (documentId) => ({
      documentId,
      allowed: false,
    }));
    updateCvContentAccess.mockImplementation(async (value) => value);
    currentCvDescriptor.mockImplementation(async (documentId) => ({
      documentId,
      tags: [],
      notes: null,
    }));
    updateCvDescriptor.mockImplementation(async (value) => value);
    installApi();
  });

  afterEach(() => cleanup());

  it("creates a CV from the canonical profile by default", async () => {
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);
    await screen.findByRole("heading", { name: "Documents" });
    expect(screen.getByLabelText("Profile basis")).toHaveValue("");
    await user.type(screen.getByLabelText("Title"), "Platform CV");
    await user.click(screen.getByRole("button", { name: "Create document" }));

    expect(create).toHaveBeenCalledWith({
      kind: "cv",
      title: "Platform CV",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    expect(await screen.findByText("/tmp/workspace/documents/doc/main.tex")).toBeInTheDocument();
    expect(screen.getByText("/tmp/workspace/documents/doc/build/main.pdf")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "AI-visible CV description" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "External CV content access" })).toBeInTheDocument();
  });

  it("creates from the canonical profile when no variants exist", async () => {
    installApi({ items: [item], variants: [] });
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);
    await screen.findByRole("heading", { name: "Documents" });
    expect(screen.getByLabelText("Profile basis")).toHaveValue("");
    await user.type(screen.getByLabelText("Title"), "Canonical CV");
    await user.click(screen.getByRole("button", { name: "Create document" }));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Canonical CV", variantId: null }),
    );
  });

  it("can explicitly create a CV from a named profile variant", async () => {
    create.mockResolvedValueOnce(record({ variantId: variant.id }));
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);
    await screen.findByRole("heading", { name: "Documents" });
    await user.type(screen.getByLabelText("Title"), "Focused CV");
    await user.selectOptions(screen.getByLabelText("Profile basis"), variant.id);
    await user.click(screen.getByRole("button", { name: "Create document" }));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Focused CV", variantId: variant.id }),
    );
  });

  it("edits structured cover-letter content through the document service without exposing CV external controls", async () => {
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
    update.mockResolvedValue({ ...cover, recipient: "Hiring manager", bodyParagraphs: ["Edited paragraph"] });
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    const saveButton = await screen.findByRole("button", { name: "Save structured content" });
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

  it("keeps manual TeX preservation explicit before overwrite", async () => {
    const manual = record({ mode: "manual" });
    list.mockResolvedValueOnce([manual]);
    resolve.mockResolvedValue({ document: manual, items: [item] });
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    expect(await screen.findByText(/Direct TeX edits were detected/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Replace manual source from structured data" }));
    expect(regenerate).toHaveBeenCalledWith(manual.id);
  });

  it("retains a working document only for an associated candidature", async () => {
    const document = record();
    list.mockResolvedValueOnce([document]);
    listCandidatures.mockResolvedValueOnce([candidature]);
    resolve.mockResolvedValue({ document, items: [item] });
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    const retain = await screen.findByRole("button", { name: "Retain application artifact" });
    expect(screen.getByLabelText("Candidature")).toHaveValue(candidature.id);
    await user.click(retain);

    expect(captureArtifact).toHaveBeenCalledWith({
      candidatureId: candidature.id,
      documentId: document.id,
    });
    expect(await screen.findByText(retainedArtifact.artifactPath)).toBeInTheDocument();
  });

  it("lists retained candidature artifacts without a surviving working document association", async () => {
    list.mockResolvedValueOnce([]);
    listCandidatures.mockResolvedValueOnce([{ ...candidature, documentIds: [] }]);
    listArtifacts.mockResolvedValueOnce([retainedArtifact]);
    render(<DocumentsWorkspace />);

    expect(await screen.findByText(retainedArtifact.artifactPath)).toBeInTheDocument();
    expect(screen.getByText(retainedArtifact.sourcePath)).toBeInTheDocument();
    expect(screen.getByLabelText("Candidature")).toHaveValue(candidature.id);
    expect(listArtifacts).toHaveBeenCalledWith(candidature.id);
    expect(screen.queryByRole("button", { name: "Retain application artifact" })).not.toBeInTheDocument();
  });
});