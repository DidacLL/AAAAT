import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentsStartWorkspace } from "../src/renderer/DocumentsStartWorkspace";

const now = "2026-09-27T00:00:00.000Z";
const templateId = "00000000-0000-4000-8000-000000000951";
const sectionId = "00000000-0000-4000-8000-000000000952";
const template = {
  id: templateId,
  name: "Reusable CV",
  language: "en",
  sections: [{
    id: sectionId,
    name: "Skills",
    presentationRole: "main" as const,
    items: [],
  }],
  createdAt: now,
  updatedAt: now,
};
const emptyRest = {
  workingCvs: [],
  renderedCvs: [],
  letters: [],
  renderedLetters: [],
  applicationPackets: [],
};
const updateTemplate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  updateTemplate.mockImplementation(async (input) => ({
    templates: [{ ...template, ...input, updatedAt: "2026-09-27T00:01:00.000Z" }],
    ...emptyRest,
  }));
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      documentDomain: {
        collections: vi.fn(async () => ({ templates: [template], ...emptyRest })),
        updateTemplate,
        createWorkingCv: vi.fn(),
        createLetter: vi.fn(),
        duplicateRenderedCv: vi.fn(),
        openRenderedCv: vi.fn(),
        exportRenderedCv: vi.fn(),
        openRenderedLetter: vi.fn(),
        exportRenderedLetter: vi.fn(),
        openPacket: vi.fn(),
        exportPacket: vi.fn(),
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CV template section roles", () => {
  it("surfaces Working CVs as recognizable documents to continue", async () => {
    const openDocument = vi.fn();
    const workingCv = {
      id: "00000000-0000-4000-8000-000000000960",
      title: "Platform CV",
      language: "en",
      sourceTemplateId: null,
      candidatureId: null,
      sections: [{
        id: "00000000-0000-4000-8000-000000000961",
        name: "Experience",
        presentationRole: "main" as const,
        items: [],
      }],
      createdAt: now,
      updatedAt: now,
    };
    vi.mocked(window.aaaat.documentDomain.collections).mockResolvedValue({
      templates: [template],
      workingCvs: [workingCv],
      renderedCvs: [],
      letters: [],
      renderedLetters: [],
      applicationPackets: [],
    });

    render(<DocumentsStartWorkspace onOpenDocument={openDocument} />);

    const library = await screen.findByRole("region", { name: "Working CVs" });
    const documentButton = within(library).getByRole("button", { name: /Platform CV/ });
    expect(documentButton).toHaveTextContent("Working CV");
    expect(documentButton).toHaveTextContent("Standalone · 1 section");
    expect(screen.queryByText(/Continue editing \(/)).not.toBeInTheDocument();

    await userEvent.setup().click(documentButton);
    expect(openDocument).toHaveBeenCalledWith(workingCv.id);
  });

  it("edits Main/Secondary as template composition without Blueprint terminology", async () => {
    const user = userEvent.setup();
    render(<DocumentsStartWorkspace onOpenDocument={vi.fn()} />);

    await screen.findByText("Reusable CV");
    await user.click(screen.getByText("Section roles"));
    const role = screen.getByRole("combobox", {
      name: "Reusable CV Skills presentation role",
    });
    expect(role).toHaveValue("main");

    await user.selectOptions(role, "secondary");

    await waitFor(() => expect(updateTemplate).toHaveBeenCalledWith({
      id: templateId,
      name: "Reusable CV",
      language: "en",
      sections: [{
        id: sectionId,
        name: "Skills",
        presentationRole: "secondary",
        items: [],
      }],
    }));
    expect(screen.queryByText(/rail|column/i)).not.toBeInTheDocument();
  });
});
