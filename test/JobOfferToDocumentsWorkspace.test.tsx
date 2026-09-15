import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JobOfferToDocumentsWorkspace } from "../src/renderer/JobOfferToDocumentsWorkspace";
import { clearAllAiTasks } from "../src/renderer/ai-task-store";
import type { DesktopApi } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000101";
const cvId = "00000000-0000-4000-8000-000000000201";
const letterId = "00000000-0000-4000-8000-000000000202";
const identityId = "00000000-0000-4000-8000-000000000301";
const contactId = "00000000-0000-4000-8000-000000000302";
const experienceId = "00000000-0000-4000-8000-000000000303";
const projectId = "00000000-0000-4000-8000-000000000304";
const organisationFieldId = "00000000-0000-4000-8000-000000000401";
const connectionId = "00000000-0000-4000-8000-000000000501";

const baseDocument = (kind: "cv" | "cover_letter", id: string, title: string) => ({
  id,
  kind,
  title,
  variantId: null,
  engine: "pdflatex" as const,
  bodyParagraphs: [],
  mode: "managed" as const,
  rules: [],
  projectPath: `/workspace/documents/${id}`,
  sourcePath: `/workspace/documents/${id}/main.tex`,
  artifactPath: `/workspace/documents/${id}/document.pdf`,
});

const cv = baseDocument("cv", cvId, "Application CV");
const letter = baseDocument("cover_letter", letterId, "Application cover letter");
const profileItems = [
  { id: identityId, kind: "identity" as const, title: "A. Candidate" },
  { id: contactId, kind: "contact" as const, title: "candidate@example.test" },
  { id: experienceId, kind: "experience" as const, title: "Platform engineer", description: "Built reliable services." },
  { id: projectId, kind: "project" as const, title: "Unrelated side project", description: "A less relevant project." },
];

const openDocumentFromCandidature = vi.fn();
vi.mock("../src/renderer/contextual-handoffs", () => ({
  useContextualHandoffs: () => ({ openDocumentFromCandidature }),
}));

function installApi({ ai = true }: { ai?: boolean } = {}) {
  const createCandidature = vi.fn(async () => ({ id: candidatureId }));
  const createDocument = vi.fn(async (input: { kind: string }) => input.kind === "cv" ? cv : letter);
  const setDocuments = vi.fn(async () => ({ id: candidatureId, documentIds: [cvId, letterId] }));
  const setFieldValue = vi.fn(async () => ({ id: candidatureId }));
  const configureItem = vi.fn(async () => cv);
  const reorder = vi.fn(async () => cv);
  const update = vi.fn(async (input: Record<string, unknown>) => ({ ...letter, ...input }));
  const extractJob = vi.fn(async () => ({
    proposals: [{ fieldId: organisationFieldId, value: "Acme" }],
    newFields: [],
    issues: [{ kind: "invalid", fieldId: null, fieldLabel: "Salary", proposedValue: "?", reason: "Unsupported" }],
  }));
  const cancelJobExtraction = vi.fn(async () => undefined);
  const tailorCv = vi.fn(async () => ({
    recommendations: [{ itemId: experienceId, rationale: "Directly relevant to the role." }],
  }));
  const draftCoverLetter = vi.fn(async () => ({
    recipient: "Hiring team",
    subject: "Application for Platform Engineer",
    bodyParagraphs: ["I am applying for the Platform Engineer role at Acme.", "My retained experience matches the reliability work described in the offer."],
    closing: "Regards",
  }));
  const listConnections = vi.fn(async () => ai ? [{
    id: connectionId,
    name: "Local model",
    endpoint: "http://127.0.0.1:11434/v1",
    model: "qwen",
    isDefault: true,
    validatedOperations: ["job_extraction", "cv_tailoring", "cover_letter_draft"],
    defaultForOperations: ["job_extraction", "cv_tailoring", "cover_letter_draft"],
  }] : []);

  const api = {
    candidatures: { create: createCandidature, setDocuments, setFieldValue },
    documents: { create: createDocument, configureItem, reorder, update },
    profile: { current: vi.fn(async () => ({ items: profileItems, variants: [] })) },
    aiConnections: { list: listConnections },
    aiTasks: { extractJob, cancelJobExtraction },
    ai: { tailorCv, draftCoverLetter },
  } as unknown as DesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
  return {
    createCandidature,
    createDocument,
    setDocuments,
    setFieldValue,
    configureItem,
    reorder,
    update,
    extractJob,
    tailorCv,
    draftCoverLetter,
  };
}

beforeEach(() => {
  clearAllAiTasks();
  openDocumentFromCandidature.mockReset();
});

afterEach(() => {
  clearAllAiTasks();
  cleanup();
});

describe("job-offer front door", () => {
  it("retains the offer, opens immediately, then produces useful tailored CV and cover-letter state", async () => {
    const api = installApi();
    const user = userEvent.setup();
    render(<JobOfferToDocumentsWorkspace />);

    await user.type(screen.getByRole("textbox", { name: "Job offer" }), "Acme needs a Platform Engineer for reliability work.");
    await user.click(screen.getByRole("button", { name: "Start application documents" }));

    expect(api.createCandidature).toHaveBeenCalledWith({
      source: {
        kind: "job_posting",
        title: "",
        url: "",
        sourceText: "Acme needs a Platform Engineer for reliability work.",
      },
      values: [],
    });
    expect(api.createDocument).toHaveBeenCalledTimes(2);
    expect(api.setDocuments).toHaveBeenCalledWith({ candidatureId, documentIds: [cvId, letterId] });
    expect(openDocumentFromCandidature).toHaveBeenCalledWith(candidatureId, cvId);

    await waitFor(() => expect(api.draftCoverLetter).toHaveBeenCalled());
    expect(api.extractJob).toHaveBeenCalledWith(
      `application-material:${candidatureId}:extract`,
      expect.objectContaining({ sourceText: "Acme needs a Platform Engineer for reliability work." }),
    );
    expect(api.setFieldValue).toHaveBeenCalledWith({
      candidatureId,
      fieldId: organisationFieldId,
      value: "Acme",
    });
    expect(api.tailorCv).toHaveBeenCalledWith({ candidatureId, documentId: cvId });
    expect(api.configureItem).toHaveBeenCalledWith({ documentId: cvId, itemId: identityId, included: true, contentPatch: null });
    expect(api.configureItem).toHaveBeenCalledWith({ documentId: cvId, itemId: contactId, included: true, contentPatch: null });
    expect(api.configureItem).toHaveBeenCalledWith({ documentId: cvId, itemId: experienceId, included: true, contentPatch: null });
    expect(api.configureItem).toHaveBeenCalledWith({ documentId: cvId, itemId: projectId, included: false, contentPatch: null });
    expect(api.reorder).toHaveBeenCalledWith({
      documentId: cvId,
      itemIds: [identityId, contactId, experienceId, projectId],
    });
    expect(api.update).toHaveBeenCalledWith(expect.objectContaining({
      id: letterId,
      recipient: "Hiring team",
      subject: "Application for Platform Engineer",
      bodyParagraphs: expect.arrayContaining([expect.stringContaining("Acme")]),
    }));
  });

  it("keeps the same direct flow complete and editable when no validated AI route exists", async () => {
    const api = installApi({ ai: false });
    const user = userEvent.setup();
    render(<JobOfferToDocumentsWorkspace />);

    await user.type(screen.getByRole("textbox", { name: "Job offer" }), "Manual-only offer text");
    await user.click(screen.getByRole("checkbox", { name: /Tailored CV/i }));
    await user.click(screen.getByRole("button", { name: "Start application documents" }));

    expect(api.createDocument).toHaveBeenCalledTimes(1);
    expect(api.createDocument).toHaveBeenCalledWith(expect.objectContaining({ kind: "cover_letter", bodyParagraphs: [] }));
    expect(openDocumentFromCandidature).toHaveBeenCalledWith(candidatureId, letterId);
    expect(api.extractJob).not.toHaveBeenCalled();
    expect(api.draftCoverLetter).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
  });
});
