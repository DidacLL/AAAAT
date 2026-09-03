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
  company: "Example Corp",
  role: "Platform Engineer",
  location: "Madrid",
  workMode: "hybrid",
  salaryText: "",
  source: "Careers",
  sourceUrl: "",
  sourceText: "Build TypeScript services.",
  status: "saved" as const,
  applicationDate: "",
  nextAction: "",
  nextActionDate: "",
  notes: "",
  archived: false,
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

describe("AI document assistance workspace", () => {
  beforeEach(() => {
    listCandidatures.mockReset();
    listDocuments.mockReset();
    updateDocument.mockReset();
    profileCurrent.mockReset();
    tailorCv.mockReset();
    draftCoverLetter.mockReset();

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
      recommendations: [{ itemId: skillId, rationale: "Directly matches the role." }],
    });
    draftCoverLetter.mockResolvedValue({
      recipient: "Hiring team",
      subject: "Platform Engineer application",
      bodyParagraphs: ["First paragraph.", "Second paragraph."],
      closing: "Regards",
    });
    updateDocument.mockImplementation(async (input) => ({
      ...cover,
      ...input,
      mode: "manual",
    }));

    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        candidatures: { list: listCandidatures },
        documents: { list: listDocuments, update: updateDocument },
        profile: { current: profileCurrent },
        ai: { tailorCv, draftCoverLetter },
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
    expect(screen.getByText("Directly matches the role.")).toBeInTheDocument();
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
});
