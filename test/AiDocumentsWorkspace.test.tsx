import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiDocumentsWorkspace } from "../src/renderer/AiDocumentsWorkspace";

const candidatureId = "00000000-0000-4000-8000-000000000001";
const variantId = "00000000-0000-4000-8000-000000000010";
const cvId = "00000000-0000-4000-8000-000000000020";
const coverId = "00000000-0000-4000-8000-000000000021";
const skillId = "00000000-0000-4000-8000-000000000030";

const candidature = {
  id: candidatureId,
  archived: false,
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
  label: "Platform opportunity",
  sourceSearchText: "",
  values: [],
  documentIds: [cvId, coverId],
  conceptIds: [],
};

const cv = {
  id: cvId,
  kind: "cv" as const,
  title: "Platform CV",
  variantId,
  engine: "pdflatex" as const,
  bodyParagraphs: [],
  mode: "managed" as const,
  rules: [],
  projectPath: "/tmp/cv",
  sourcePath: "/tmp/cv/main.tex",
  artifactPath: "/tmp/cv/build/main.pdf",
};

const cover = {
  id: coverId,
  kind: "cover_letter" as const,
  title: "Platform cover letter",
  variantId,
  language: "en",
  engine: "pdflatex" as const,
  recipient: "",
  subject: "",
  bodyParagraphs: [],
  closing: "",
  mode: "manual" as const,
  rules: [],
  projectPath: "/tmp/cover",
  sourcePath: "/tmp/cover/main.tex",
  artifactPath: "/tmp/cover/build/main.pdf",
};

const listCandidatures = vi.fn();
const listDocuments = vi.fn();
const updateDocument = vi.fn();
const profileCurrent = vi.fn();
const tailorCv = vi.fn();
const draftCoverLetter = vi.fn();
const setupEnvironmentCurrent = vi.fn();

function setupEnvironment(operationAvailable = true) {
  return {
    workspaceReady: true,
    tex: {
      commands: [
        { command: "latexmk", available: true, version: "Latexmk" },
        { command: "pdflatex", available: true, version: "pdfTeX" },
      ],
      documentRenderingReady: true,
    },
    ai: {
      configurationReadable: true,
      connectionCount: 1,
      operations: [
        { operation: "fit_assessment", available: true, connectionName: "Local" },
        { operation: "job_extraction", available: true, connectionName: "Local" },
        { operation: "historical_field_discovery", available: true, connectionName: "Local" },
        { operation: "variant_recommendation", available: true, connectionName: "Local" },
        {
          operation: "cv_tailoring",
          available: operationAvailable,
          connectionName: operationAvailable ? "Local" : null,
        },
        { operation: "cover_letter_draft", available: true, connectionName: "Local" },
      ],
    },
  };
}

describe("AI document assistance workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCandidatures.mockResolvedValue([candidature]);
    listDocuments.mockResolvedValue([cv, cover]);
    profileCurrent.mockResolvedValue({
      items: [
        {
          id: skillId,
          kind: "skill",
          title: "TypeScript",
          sortOrder: 0,
        },
      ],
      variants: [],
    });
    tailorCv.mockResolvedValue({
      recommendations: [{ itemId: skillId, rationale: "Directly matches the opportunity." }],
    });
    draftCoverLetter.mockResolvedValue({
      recipient: "Hiring team",
      subject: "Application",
      bodyParagraphs: ["First paragraph.", "Second paragraph."],
      closing: "Regards",
    });
    updateDocument.mockImplementation(async (input) => ({
      ...cover,
      ...input,
      mode: "manual",
    }));
    setupEnvironmentCurrent.mockResolvedValue(setupEnvironment());

    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        candidatures: { list: listCandidatures },
        documents: { list: listDocuments, update: updateDocument },
        profile: { current: profileCurrent },
        ai: { tailorCv, draftCoverLetter },
        setupEnvironment: { current: setupEnvironmentCurrent },
      },
    });
  });

  afterEach(() => cleanup());

  it("shows CV recommendations without mutating documents", async () => {
    const user = userEvent.setup();
    render(<AiDocumentsWorkspace />);

    const button = await screen.findByRole("button", { name: "Recommend CV evidence" });
    await user.click(button);

    expect(tailorCv).toHaveBeenCalledWith({ candidatureId, documentId: cvId });
    expect(await screen.findByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Directly matches the opportunity.")).toBeInTheDocument();
    expect(updateDocument).not.toHaveBeenCalled();
  });

  it("keeps cover-letter drafting editable and applies only after explicit user action", async () => {
    const user = userEvent.setup();
    render(<AiDocumentsWorkspace />);

    const documentSelect = await screen.findByLabelText("Document");
    await user.selectOptions(documentSelect, coverId);
    await user.click(screen.getByRole("button", { name: "Draft cover letter" }));

    expect(draftCoverLetter).toHaveBeenCalledWith({ candidatureId, documentId: coverId });
    expect(updateDocument).not.toHaveBeenCalled();

    const subject = await screen.findByLabelText("Subject");
    await user.clear(subject);
    await user.type(subject, "Edited application subject");
    await user.click(
      screen.getByRole("button", { name: "Apply edited draft to structured document" }),
    );

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
    expect(
      await screen.findByText(
        "Structured cover-letter fields updated. Existing manual TeX source remains protected.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps edited AI cover-letter text when adjacent discard actions are cancelled", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<AiDocumentsWorkspace />);

    const documentSelect = await screen.findByLabelText("Document");
    await user.selectOptions(documentSelect, coverId);
    await user.click(screen.getByRole("button", { name: "Draft cover letter" }));

    const subject = await screen.findByLabelText("Subject");
    await user.clear(subject);
    await user.type(subject, "Unsaved AI draft subject");

    await user.selectOptions(documentSelect, cvId);
    expect(confirm).toHaveBeenCalledWith("Discard unsaved AI cover-letter draft edits?");
    expect(documentSelect).toHaveValue(coverId);
    expect(screen.getByLabelText("Subject")).toHaveValue("Unsaved AI draft subject");

    await user.click(screen.getByRole("button", { name: "Draft cover letter" }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(draftCoverLetter).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Subject")).toHaveValue("Unsaved AI draft subject");
  });

  it("offers AI connections only when the failed operation has no validated route", async () => {
    tailorCv.mockRejectedValueOnce(new Error("No validated route is configured."));
    setupEnvironmentCurrent.mockResolvedValueOnce(setupEnvironment(false));
    const user = userEvent.setup();
    render(<AiDocumentsWorkspace />);

    await user.click(await screen.findByRole("button", { name: "Recommend CV evidence" }));

    expect(await screen.findByRole("button", { name: "Open AI connections settings" })).toBeInTheDocument();
  });

  it("keeps provider/runtime failures local when a validated route still exists", async () => {
    tailorCv.mockRejectedValueOnce(new Error("Provider returned invalid output."));
    setupEnvironmentCurrent.mockResolvedValueOnce(setupEnvironment(true));
    const user = userEvent.setup();
    render(<AiDocumentsWorkspace />);

    await user.click(await screen.findByRole("button", { name: "Recommend CV evidence" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Provider returned invalid output.");
    expect(screen.queryByRole("button", { name: "Open AI connections settings" })).not.toBeInTheDocument();
  });
});
