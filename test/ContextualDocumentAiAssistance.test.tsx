import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentsWorkspace } from "../src/renderer/DocumentsWorkspace";
import {
  ContextualHandoffContext,
  type ContextualHandoffApi,
} from "../src/renderer/contextual-handoffs";
import type { CandidatureRecord, DocumentRecord } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000001";
const cvId = "00000000-0000-4000-8000-000000000020";
const coverId = "00000000-0000-4000-8000-000000000021";
const skillId = "00000000-0000-4000-8000-000000000030";

const candidature: CandidatureRecord = {
  id: candidatureId,
  archived: false,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z",
  label: "Platform opportunity",
  sourceSearchText: "",
  values: [],
  documentIds: [cvId, coverId],
  conceptIds: [],
};

const cv: DocumentRecord = {
  id: cvId,
  kind: "cv",
  title: "Current CV",
  variantId: null,
  engine: "pdflatex",
  bodyParagraphs: [],
  mode: "managed",
  rules: [],
  projectPath: "/tmp/cv",
  sourcePath: "/tmp/cv/main.tex",
  artifactPath: "/tmp/cv/build/main.pdf",
};

const cover: DocumentRecord = {
  id: coverId,
  kind: "cover_letter",
  title: "Current cover letter",
  variantId: null,
  language: "en",
  engine: "pdflatex",
  recipient: "",
  subject: "",
  bodyParagraphs: [],
  closing: "",
  mode: "manual",
  rules: [],
  projectPath: "/tmp/cover",
  sourcePath: "/tmp/cover/main.tex",
  artifactPath: "/tmp/cover/build/main.pdf",
};

const profile = {
  items: [
    {
      id: skillId,
      kind: "skill" as const,
      title: "TypeScript",
      sortOrder: 0,
    },
  ],
  variants: [],
};

const listDocuments = vi.fn();
const updateDocument = vi.fn();
const resolveDocument = vi.fn();
const listCandidatures = vi.fn();
const setCandidatureDocuments = vi.fn();
const tailorCv = vi.fn();
const draftCoverLetter = vi.fn();
const setupEnvironmentCurrent = vi.fn();
const openSettingsFor = vi.fn();

function environment(cvAvailable = true, coverAvailable = true) {
  return {
    ai: {
      operations: [
        { operation: "cv_tailoring", available: cvAvailable, connectionName: cvAvailable ? "Local" : null },
        {
          operation: "cover_letter_draft",
          available: coverAvailable,
          connectionName: coverAvailable ? "Local" : null,
        },
      ],
    },
  };
}

function installApi(documents: DocumentRecord[] = [cv, cover]) {
  listDocuments.mockResolvedValue(documents);
  updateDocument.mockImplementation(async (input) => ({
    ...(input.id === coverId ? cover : cv),
    ...input,
  }));
  resolveDocument.mockImplementation(async (documentId) => ({
    document: documentId === coverId ? cover : cv,
    items: profile.items,
  }));

  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      profile: {
        current: async () => profile,
        resolveVariant: async () => profile,
      },
      documents: {
        list: listDocuments,
        create: vi.fn(),
        update: updateDocument,
        remove: vi.fn(),
        configureItem: vi.fn(),
        reorder: vi.fn(),
        resolve: resolveDocument,
        render: vi.fn(),
        regenerate: vi.fn(),
        exportProject: vi.fn(),
      },
      documentOutput: { open: vi.fn() },
      candidatures: {
        list: listCandidatures,
        setDocuments: setCandidatureDocuments,
      },
      artifacts: { list: vi.fn().mockResolvedValue([]), capture: vi.fn() },
      cvContentAccess: {
        current: vi.fn().mockImplementation(async (documentId) => ({
          documentId,
          allowed: false,
          renderAllowed: false,
        })),
        update: vi.fn(),
        updateRender: vi.fn(),
      },
      cvDescriptors: {
        current: vi.fn().mockImplementation(async (documentId) => ({
          documentId,
          tags: [],
          notes: null,
        })),
        update: vi.fn(),
      },
      ai: { tailorCv, draftCoverLetter },
      setupEnvironment: { current: setupEnvironmentCurrent },
    },
  });
}

function handoffs(documentId?: string): ContextualHandoffApi {
  return {
    documentHandoff: { candidatureId, ...(documentId ? { documentId } : {}) },
    professionalInformationHandoff: null,
    settingsHandoff: null,
    openDocumentFromCandidature: vi.fn(),
    returnToCandidature: vi.fn(),
    openProfessionalInformationItem: vi.fn(),
    returnToDocument: vi.fn(),
    openSettingsFor,
    returnFromSettings: vi.fn(),
  };
}

function renderLinked(documentId: string) {
  return render(
    <ContextualHandoffContext.Provider value={handoffs(documentId)}>
      <DocumentsWorkspace />
    </ContextualHandoffContext.Provider>,
  );
}

async function openAssistance() {
  await userEvent.setup().click(await screen.findByText("AI assistance"));
}

describe("contextual document AI assistance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCandidatures.mockResolvedValue([candidature]);
    tailorCv.mockResolvedValue({
      recommendations: [{ itemId: skillId, rationale: "Directly matches the opportunity." }],
    });
    draftCoverLetter.mockResolvedValue({
      recipient: "Hiring team",
      subject: "Application",
      bodyParagraphs: ["First paragraph.", "Second paragraph."],
      closing: "Regards",
    });
    setupEnvironmentCurrent.mockResolvedValue(environment());
    installApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("binds standalone assistance to the selected document and asks only for missing candidature context", async () => {
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    await screen.findByRole("heading", { name: "Current CV" });
    await openAssistance();

    expect(screen.queryByLabelText("Document")).not.toBeInTheDocument();
    const candidatureSelect = screen.getByLabelText("Candidature for this assistance");
    await user.selectOptions(candidatureSelect, candidatureId);
    await user.click(screen.getByRole("button", { name: "Recommend CV evidence" }));

    expect(tailorCv).toHaveBeenCalledWith({ candidatureId, documentId: cvId });
    expect(updateDocument).not.toHaveBeenCalled();
    expect(setCandidatureDocuments).not.toHaveBeenCalled();
    expect(await screen.findByText("TypeScript")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Current cover letter/ }));
    await openAssistance();
    expect(screen.getByRole("button", { name: "Draft cover letter" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recommend CV evidence" })).not.toBeInTheDocument();
  });

  it("explains genuinely missing candidature context without creating a dead generic workspace", async () => {
    listCandidatures.mockResolvedValue([]);
    render(<DocumentsWorkspace />);

    await screen.findByRole("heading", { name: "Current CV" });
    await openAssistance();

    expect(screen.getByText(/This assistance needs candidature context/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Document")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Candidature for this assistance")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recommend CV evidence" })).toBeDisabled();
  });

  it("reuses candidature-linked context and applies an edited draft to the visible current document", async () => {
    const user = userEvent.setup();
    renderLinked(coverId);

    await screen.findByRole("heading", { name: "Current cover letter" });
    await openAssistance();

    expect(screen.getByText("Using candidature: Platform opportunity")).toBeInTheDocument();
    expect(screen.queryByLabelText("Candidature for this assistance")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Draft cover letter" }));

    expect(draftCoverLetter).toHaveBeenCalledWith({ candidatureId, documentId: coverId });
    expect(setCandidatureDocuments).not.toHaveBeenCalled();

    const draftSubject = await screen.findByLabelText("Draft subject");
    await user.clear(draftSubject);
    await user.type(draftSubject, "Edited application subject");
    await user.click(screen.getByRole("button", { name: "Apply edited draft to current document" }));

    expect(updateDocument).toHaveBeenCalledWith({
      id: coverId,
      title: cover.title,
      language: "en",
      engine: "pdflatex",
      recipient: "Hiring team",
      subject: "Edited application subject",
      bodyParagraphs: ["First paragraph.", "Second paragraph."],
      closing: "Regards",
    });

    const content = screen.getByRole("tabpanel", { name: "Document content" });
    expect(within(content).getByLabelText("Subject")).toHaveValue("Edited application subject");
    expect(
      await screen.findByText(
        "Structured cover-letter fields updated. Existing manual TeX source remains protected.",
      ),
    ).toBeInTheDocument();
  });

  it("does not generate against stale persisted content when current document edits are dirty", async () => {
    installApi([cover]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    await screen.findByRole("heading", { name: "Current cover letter" });
    await openAssistance();
    await user.selectOptions(screen.getByLabelText("Candidature for this assistance"), candidatureId);

    const content = screen.getByRole("tabpanel", { name: "Document content" });
    const subject = within(content).getByLabelText("Subject");
    await user.type(subject, "Unsaved current subject");
    await user.click(screen.getByRole("button", { name: "Draft cover letter" }));

    expect(confirm).toHaveBeenCalledWith("Save current document changes before using AI assistance?");
    expect(draftCoverLetter).not.toHaveBeenCalled();
    expect(subject).toHaveValue("Unsaved current subject");

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Draft cover letter" }));
    await waitFor(() => expect(draftCoverLetter).toHaveBeenCalledTimes(1));
    expect(updateDocument).toHaveBeenCalledWith(
      expect.objectContaining({ id: coverId, subject: "Unsaved current subject" }),
    );
    const saveOrder = updateDocument.mock.invocationCallOrder[0];
    const assistanceOrder = draftCoverLetter.mock.invocationCallOrder[0];
    expect(saveOrder).toBeDefined();
    expect(assistanceOrder).toBeDefined();
    expect(saveOrder ?? Number.MAX_SAFE_INTEGER).toBeLessThan(assistanceOrder ?? 0);
  });

  it("keeps a current document draft when applying an AI proposal would overwrite it", async () => {
    installApi([cover]);
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    await screen.findByRole("heading", { name: "Current cover letter" });
    await openAssistance();
    await user.selectOptions(screen.getByLabelText("Candidature for this assistance"), candidatureId);
    await user.click(screen.getByRole("button", { name: "Draft cover letter" }));
    await screen.findByLabelText("Draft subject");

    const content = screen.getByRole("tabpanel", { name: "Document content" });
    const subject = within(content).getByLabelText("Subject");
    await user.type(subject, "Keep this local draft");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Apply edited draft to current document" }));

    expect(confirm).toHaveBeenCalledWith(
      "Discard current unsaved document edits and apply this AI draft? Cancel to keep editing.",
    );
    expect(updateDocument).not.toHaveBeenCalled();
    expect(subject).toHaveValue("Keep this local draft");
    expect(screen.getByLabelText("Draft subject")).toHaveValue("Application");
  });

  it("keeps manual document work free of dead AI chrome when the selected operation has no route", async () => {
    setupEnvironmentCurrent.mockResolvedValue(environment(false, true));
    render(<DocumentsWorkspace />);

    await screen.findByRole("heading", { name: "Current CV" });
    await waitFor(() => expect(setupEnvironmentCurrent).toHaveBeenCalled());
    expect(screen.queryByText("AI assistance")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("retains the existing failure handoff to AI Settings when a validated route disappears", async () => {
    tailorCv.mockRejectedValueOnce(new Error("No validated route is configured."));
    setupEnvironmentCurrent
      .mockResolvedValueOnce(environment(true, true))
      .mockResolvedValueOnce(environment(false, true));
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    await screen.findByRole("heading", { name: "Current CV" });
    await openAssistance();
    await user.selectOptions(screen.getByLabelText("Candidature for this assistance"), candidatureId);
    await user.click(screen.getByRole("button", { name: "Recommend CV evidence" }));

    const settings = await screen.findByRole("button", { name: "Open AI connections settings" });
    await user.click(settings);
    expect(openSettingsFor).toHaveBeenCalledWith("ai", "documents");
  });

  it("keeps provider/runtime failures local when a validated route still exists", async () => {
    tailorCv.mockRejectedValueOnce(new Error("Provider returned invalid output."));
    setupEnvironmentCurrent
      .mockResolvedValueOnce(environment(true, true))
      .mockResolvedValueOnce(environment(true, true));
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    await screen.findByRole("heading", { name: "Current CV" });
    await openAssistance();
    await user.selectOptions(screen.getByLabelText("Candidature for this assistance"), candidatureId);
    await user.click(screen.getByRole("button", { name: "Recommend CV evidence" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Provider returned invalid output.");
    expect(screen.queryByRole("button", { name: "Open AI connections settings" })).not.toBeInTheDocument();
  });
});
