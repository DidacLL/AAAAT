import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/contextual-handoffs", () => ({
  useContextualHandoffs: () => ({
    documentHandoff: { documentId: "00000000-0000-4000-8000-000000000901" },
    openProfessionalInformationItem: vi.fn(),
    openSettingsFor: vi.fn(),
    returnToCandidature: vi.fn(),
  }),
}));

import { DocumentWork, WorkingCvEditor } from "../src/renderer/DocumentWork";

const letterId = "00000000-0000-4000-8000-000000000901";
const candidatureId = "00000000-0000-4000-8000-000000000902";
const cvId = "00000000-0000-4000-8000-000000000904";
const sectionId = "00000000-0000-4000-8000-000000000906";
const now = "2026-09-18T00:00:00.000Z";
const blueprints = [
  { id: "builtin:default", name: "AAAAT Default" },
  { id: "user:Compact.tex", name: "Compact" },
];

const letter = {
  id: letterId,
  candidatureId,
  title: "Application letter",
  language: "en",
  recipient: "Hiring team",
  subject: "Original subject",
  bodyParagraphs: ["Original body."],
  closing: "Regards",
  createdAt: now,
  updatedAt: now,
};

const workingCv = {
  id: cvId,
  title: "Saved CV",
  language: "en",
  sourceTemplateId: null,
  candidatureId: null,
  sections: [{
    id: sectionId,
    name: "Experience",
    presentationRole: "main" as const,
    items: [],
  }],
  createdAt: now,
  updatedAt: now,
};

const updateLetter = vi.fn();
const renderLetter = vi.fn();
const openRenderedLetter = vi.fn();
const updateWorkingCv = vi.fn();
const renderCv = vi.fn();
const openRenderedCv = vi.fn();
const draftCoverLetter = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  updateLetter.mockImplementation(async (input) => ({
    ...letter,
    ...input,
    candidatureId,
    updatedAt: "2026-09-18T00:01:00.000Z",
  }));
  updateWorkingCv.mockImplementation(async (input) => ({
    ...workingCv,
    ...input,
    updatedAt: "2026-09-18T00:01:00.000Z",
  }));
  draftCoverLetter.mockResolvedValue({
    recipient: "Hiring team",
    subject: "AI subject",
    bodyParagraphs: ["AI body."],
    closing: "Regards",
  });
  renderLetter.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000903",
    coverLetterId: letterId,
    candidatureId,
    title: letter.title,
    language: letter.language,
    snapshot: {
      candidatureId,
      title: letter.title,
      language: letter.language,
      recipient: letter.recipient,
      subject: letter.subject,
      bodyParagraphs: letter.bodyParagraphs,
      closing: letter.closing,
    },
    createdAt: now,
    hasPdf: true,
  });
  renderCv.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000905",
    workingCvId: cvId,
    sourceTemplateId: null,
    candidatureId: null,
    title: workingCv.title,
    language: workingCv.language,
    snapshot: {
      title: workingCv.title,
      language: workingCv.language,
      sourceTemplateId: null,
      candidatureId: null,
      sections: workingCv.sections,
    },
    createdAt: now,
    hasPdf: true,
  });
  openRenderedLetter.mockResolvedValue({ opened: true });
  openRenderedCv.mockResolvedValue({ opened: true });

  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      documentDomain: {
        collections: vi.fn(async () => ({
          templates: [],
          workingCvs: [],
          renderedCvs: [],
          letters: [letter],
          renderedLetters: [],
          applicationPackets: [],
        })),
        blueprints: vi.fn(async () => blueprints),
        updateLetter,
        renderLetter,
        openRenderedLetter,
        exportRenderedLetter: vi.fn(async () => null),
        updateWorkingCv,
        renderCv,
        openRenderedCv,
      },
      profile: {
        current: vi.fn(async () => ({ items: [] })),
      },
      profileVariants: {
        list: vi.fn(async () => []),
      },
      ai: {
        draftCoverLetter,
        tailorCv: vi.fn(),
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("document render Blueprint choice", () => {
  it("persists unsaved letter edits, defaults to the built-in Blueprint and renders explicitly", async () => {
    const user = userEvent.setup();
    render(<DocumentWork />);

    const body = await screen.findByRole("textbox", { name: "Body" });
    await user.clear(body);
    await user.type(body, "User-edited render body.");

    expect(await screen.findByRole("combobox", { name: "Blueprint" })).toHaveValue("builtin:default");
    await user.click(screen.getByRole("button", { name: "Render PDF" }));

    await waitFor(() => expect(renderLetter).toHaveBeenCalledWith({
      letterId,
      blueprintId: "builtin:default",
    }));
    expect(updateLetter).toHaveBeenCalledWith(expect.objectContaining({
      id: letterId,
      bodyParagraphs: ["User-edited render body."],
    }));
    expect(updateLetter.mock.invocationCallOrder[0]).toBeLessThan(
      renderLetter.mock.invocationCallOrder[0]!,
    );
    expect(openRenderedLetter).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000903",
    );
  });

  it("uses an ephemeral alternate Blueprint for a CV render without putting it in save input", async () => {
    const user = userEvent.setup();
    render(
      <WorkingCvEditor
        document={workingCv}
        profile={[]}
        variants={[]}
        collections={{
          templates: [], workingCvs: [workingCv], renderedCvs: [], letters: [],
          renderedLetters: [], applicationPackets: [],
        }}
        onSaved={vi.fn()}
        onCollections={vi.fn()}
      />,
    );

    const selector = await screen.findByRole("combobox", { name: "Blueprint" });
    expect(selector).toHaveValue("builtin:default");
    await user.selectOptions(selector, "user:Compact.tex");
    await user.click(screen.getByRole("button", { name: "Render PDF" }));

    await waitFor(() => expect(renderCv).toHaveBeenCalledWith({
      cvId,
      blueprintId: "user:Compact.tex",
    }));
    expect(updateWorkingCv).not.toHaveBeenCalled();
  });

  it("edits and saves a semantic section role without changing Blueprint selection", async () => {
    const user = userEvent.setup();
    render(
      <WorkingCvEditor
        document={workingCv}
        profile={[]}
        variants={[]}
        collections={{
          templates: [], workingCvs: [workingCv], renderedCvs: [], letters: [],
          renderedLetters: [], applicationPackets: [],
        }}
        onSaved={vi.fn()}
        onCollections={vi.fn()}
      />,
    );

    const role = screen.getByRole("combobox", { name: "Experience presentation role" });
    expect(role).toHaveValue("main");
    await user.selectOptions(role, "secondary");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateWorkingCv).toHaveBeenCalledWith(expect.objectContaining({
      id: cvId,
      sections: [expect.objectContaining({
        id: sectionId,
        presentationRole: "secondary",
      })],
    })));
    expect(screen.getByRole("combobox", { name: "Blueprint" })).toHaveValue("builtin:default");
  });

  it("persists unsaved user edits before asking AI to replace the draft", async () => {
    const user = userEvent.setup();
    render(<DocumentWork />);

    const subject = await screen.findByRole("textbox", { name: "Subject" });
    await user.clear(subject);
    await user.type(subject, "User edited subject");

    await user.click(screen.getByRole("button", { name: "Ask AI to draft" }));

    await waitFor(() => expect(draftCoverLetter).toHaveBeenCalledWith({ coverLetterId: letterId }));
    expect(updateLetter).toHaveBeenCalledWith(expect.objectContaining({
      id: letterId,
      subject: "User edited subject",
    }));
    expect(updateLetter.mock.invocationCallOrder[0]).toBeLessThan(
      draftCoverLetter.mock.invocationCallOrder[0]!,
    );
  });
});
