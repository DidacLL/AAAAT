import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContextualHandoffContext } from "../src/renderer/contextual-handoffs";
import { JobOfferToDocumentsWorkspace } from "../src/renderer/JobOfferToDocumentsWorkspace";

const createCandidature = vi.fn();
const createDocument = vi.fn();
const setDocuments = vi.fn();
const openDocumentFromCandidature = vi.fn();

beforeEach(() => {
  createCandidature.mockReset();
  createDocument.mockReset();
  setDocuments.mockReset();
  openDocumentFromCandidature.mockReset();

  createCandidature.mockResolvedValue({ id: "candidature-1" });
  createDocument
    .mockResolvedValueOnce({ id: "cv-1" })
    .mockResolvedValueOnce({ id: "letter-1" });
  setDocuments.mockResolvedValue({ id: "candidature-1", documentIds: ["cv-1", "letter-1"] });

  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: { create: createCandidature, setDocuments },
      documents: { create: createDocument },
    },
  });
});

afterEach(() => cleanup());

describe("job offer to documents journey", () => {
  it("retains the pasted offer, creates both requested documents, links them and opens document work", async () => {
    const user = userEvent.setup();
    render(
      <ContextualHandoffContext.Provider
        value={{
          documentHandoff: null,
          professionalInformationHandoff: null,
          settingsHandoff: null,
          openDocumentFromCandidature,
          returnToCandidature: vi.fn(),
          openProfessionalInformationItem: vi.fn(),
          returnToDocument: vi.fn(),
          openSettingsFor: vi.fn(),
          returnFromSettings: vi.fn(),
        }}
      >
        <JobOfferToDocumentsWorkspace />
      </ContextualHandoffContext.Provider>,
    );

    await user.type(screen.getByLabelText("Job offer"), "Senior platform role. Python and distributed systems.");
    await user.click(screen.getByRole("button", { name: "Start application documents" }));

    expect(createCandidature).toHaveBeenCalledWith({
      source: {
        kind: "job_posting",
        title: "",
        url: "",
        sourceText: "Senior platform role. Python and distributed systems.",
      },
      values: [],
    });
    expect(createDocument).toHaveBeenNthCalledWith(1, {
      kind: "cv",
      title: "Application CV",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    expect(createDocument).toHaveBeenNthCalledWith(2, {
      kind: "cover_letter",
      title: "Application cover letter",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    expect(setDocuments).toHaveBeenCalledWith({
      candidatureId: "candidature-1",
      documentIds: ["cv-1", "letter-1"],
    });
    expect(openDocumentFromCandidature).toHaveBeenCalledWith("candidature-1", "cv-1");
  });

  it("lets the user request only one output without naming a candidature", async () => {
    createDocument.mockReset();
    createDocument.mockResolvedValueOnce({ id: "letter-1" });
    const user = userEvent.setup();
    render(
      <ContextualHandoffContext.Provider
        value={{
          documentHandoff: null,
          professionalInformationHandoff: null,
          settingsHandoff: null,
          openDocumentFromCandidature,
          returnToCandidature: vi.fn(),
          openProfessionalInformationItem: vi.fn(),
          returnToDocument: vi.fn(),
          openSettingsFor: vi.fn(),
          returnFromSettings: vi.fn(),
        }}
      >
        <JobOfferToDocumentsWorkspace />
      </ContextualHandoffContext.Provider>,
    );

    await user.click(screen.getByRole("checkbox", { name: /Tailored CV/ }));
    await user.type(screen.getByLabelText("Job offer"), "A useful raw vacancy.");
    await user.click(screen.getByRole("button", { name: "Start application documents" }));

    expect(createDocument).toHaveBeenCalledTimes(1);
    expect(createDocument).toHaveBeenCalledWith(expect.objectContaining({ kind: "cover_letter" }));
    expect(screen.queryByLabelText(/candidature/i)).not.toBeInTheDocument();
  });
});
