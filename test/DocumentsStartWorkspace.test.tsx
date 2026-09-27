import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
