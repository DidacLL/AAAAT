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

import { DocumentWork } from "../src/renderer/DocumentWork";

const letterId = "00000000-0000-4000-8000-000000000901";
const candidatureId = "00000000-0000-4000-8000-000000000902";
const now = "2026-09-18T00:00:00.000Z";

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

const updateLetter = vi.fn();
const draftCoverLetter = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  updateLetter.mockImplementation(async (input) => ({
    ...letter,
    ...input,
    candidatureId,
    updatedAt: "2026-09-18T00:01:00.000Z",
  }));
  draftCoverLetter.mockResolvedValue({
    recipient: "Hiring team",
    subject: "AI subject",
    bodyParagraphs: ["AI body."],
    closing: "Regards",
  });

  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      documentDomain: {
        collections: vi.fn(async () => ({
          templates: [],
          workingCvs: [],
          renderedCvs: [],
          letters: [letter],
          applicationPackets: [],
        })),
        updateLetter,
      },
      profile: {
        current: vi.fn(async () => ({ items: [] })),
      },
      profileVariants: {
        list: vi.fn(async () => []),
      },
      ai: {
        draftCoverLetter,
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("cover-letter work", () => {
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
