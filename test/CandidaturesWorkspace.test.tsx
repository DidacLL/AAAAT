import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type {
  CareerContext,
  CandidatureRecord,
  CandidatureSource,
  CandidatureWorkingBrief,
  ConceptRecord,
  DesktopApi,
  DocumentRecord,
  ProfileSnapshot,
} from "../src/shared/contracts";

const emptyProfile: ProfileSnapshot = { items: [], variants: [] };
const emptyCareerContext: CareerContext = {
  careerDirection: "",
  objectives: "",
  constraints: "",
  targetRoles: "",
  targetMarketsLocations: "",
  workPreferences: "",
  applicationWritingPreferences: "",
};
const unavailable = async (): Promise<never> => {
  throw new Error("Unavailable in candidature test");
};

const concept: ConceptRecord = {
  id: "00000000-0000-4000-8000-000000000204",
  name: "TypeScript",
  definition: "Typed JavaScript used across the platform stack.",
  aliases: ["TS"],
};

function candidature(overrides: Partial<CandidatureRecord> = {}): CandidatureRecord {
  return {
    id: "00000000-0000-4000-8000-000000000201",
    company: "Acme",
    role: "Backend engineer",
    location: "Madrid",
    workMode: "Hybrid",
    salaryText: "",
    source: "Recruiter",
    sourceUrl: "",
    sourceText: "Original offer text",
    status: "saved",
    priority: "",
    applicationDate: "",
    notes: "Call after lunch",
    archived: false,
    documentIds: [],
    conceptIds: [],
    ...overrides,
  };
}

function workingBrief(
  candidatureId: string,
  overrides: Partial<CandidatureWorkingBrief> = {},
): CandidatureWorkingBrief {
  return {
    candidatureId,
    fitSuitability: "",
    strengthsEvidence: "",
    gapsRisksConstraints: "",
    currentStrategy: "",
    companyRoleContext: "",
    pitch: "",
    questions: "",
    recruiterPreparation: "",
    ...overrides,
  };
}

const document: DocumentRecord = {
  id: "00000000-0000-4000-8000-000000000202",
  kind: "cv",
  title: "Backend CV",
  variantId: "00000000-0000-4000-8000-000000000203",
  engine: "pdflatex",
  bodyParagraphs: [],
  mode: "managed",
  rules: [],
  projectPath: "/tmp/doc",
  sourcePath: "/tmp/doc/main.tex",
  artifactPath: "/tmp/doc/build/main.pdf",
};

const recruiterSource: CandidatureSource = {
  id: "00000000-0000-4000-8000-000000000220",
  candidatureId: "00000000-0000-4000-8000-000000000201",
  kind: "recruiter_message",
  title: "Recruiter message",
  url: "",
  sourceText: "Would you consider our backend role?",
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
};
const jobSource: CandidatureSource = {
  ...recruiterSource,
  id: "00000000-0000-4000-8000-000000000221",
  kind: "job_posting",
  title: "Job description",
  sourceText: "Senior platform role with distributed systems ownership.",
};

const list = vi.fn<DesktopApi["candidatures"]["list"]>();
const create = vi.fn<DesktopApi["candidatures"]["create"]>();
const update = vi.fn<DesktopApi["candidatures"]["update"]>();
const listSources = vi.fn<DesktopApi["candidatures"]["listSources"]>();
const addSource = vi.fn<DesktopApi["candidatures"]["addSource"]>();
const updateSource = vi.fn<DesktopApi["candidatures"]["updateSource"]>();
const removeSource = vi.fn<DesktopApi["candidatures"]["removeSource"]>();
const currentWorkingBrief = vi.fn<DesktopApi["candidatures"]["currentWorkingBrief"]>();
const updateWorkingBrief = vi.fn<DesktopApi["candidatures"]["updateWorkingBrief"]>();
const setDocuments = vi.fn<DesktopApi["candidatures"]["setDocuments"]>();
const listConcepts = vi.fn<DesktopApi["candidatures"]["listConcepts"]>();
const createConcept = vi.fn<DesktopApi["candidatures"]["createConcept"]>();
const updateConcept = vi.fn<DesktopApi["candidatures"]["updateConcept"]>();
const setConcepts = vi.fn<DesktopApi["candidatures"]["setConcepts"]>();
const careerCurrent = vi.fn<DesktopApi["careerContext"]["current"]>();
const aiConnection = vi.fn();
const extractJob = vi.fn();

const desktopApi: DesktopApi = {
  system: { info: async () => ({ appVersion: "2", electronVersion: "44", nodeVersion: "24" }) },
  workspace: {
    current: async () => ({ rootPath: "/tmp/workspace" }),
    choose: async () => ({ rootPath: "/tmp/workspace" }),
  },
  profile: {
    current: async () => emptyProfile,
    addItem: async () => emptyProfile,
    updateItem: async () => emptyProfile,
    removeItem: async () => emptyProfile,
    createVariant: async () => emptyProfile,
    updateVariant: async () => emptyProfile,
    removeVariant: async () => emptyProfile,
    configureVariantItem: async () => emptyProfile,
    reorderVariant: async () => emptyProfile,
    resolveVariant: unavailable,
  },
  careerContext: {
    current: careerCurrent,
    update: async (value) => value,
  },
  documents: {
    list: async () => [document],
    create: unavailable,
    update: unavailable,
    remove: async () => [],
    configureItem: unavailable,
    reorder: unavailable,
    resolve: unavailable,
    render: unavailable,
    regenerate: unavailable,
    exportProject: async () => null,
  },
  candidatures: {
    list,
    create,
    update,
    listSources,
    addSource,
    updateSource,
    removeSource,
    currentWorkingBrief,
    updateWorkingBrief,
    setDocuments,
    listConcepts,
    createConcept,
    updateConcept,
    setConcepts,
  },
};

function installApi(): void {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      ...desktopApi,
      ai: {
        connection: aiConnection,
        saveConnection: unavailable,
        previewFit: unavailable,
        assessFit: unavailable,
        extractJob,
        recommendVariant: unavailable,
        tailorCv: unavailable,
        draftCoverLetter: unavailable,
      },
    },
  });
}

describe("M6 candidature workspace", () => {
  beforeEach(() => {
    for (const mock of [
      list,
      create,
      update,
      listSources,
      addSource,
      updateSource,
      removeSource,
      currentWorkingBrief,
      updateWorkingBrief,
      setDocuments,
      listConcepts,
      createConcept,
      updateConcept,
      setConcepts,
      careerCurrent,
      aiConnection,
      extractJob,
    ]) mock.mockReset();
    list.mockResolvedValue([]);
    listSources.mockResolvedValue([]);
    currentWorkingBrief.mockImplementation(async (candidatureId) => workingBrief(candidatureId));
    updateWorkingBrief.mockImplementation(async (value) => value);
    listConcepts.mockResolvedValue([]);
    careerCurrent.mockResolvedValue(emptyCareerContext);
    aiConnection.mockResolvedValue(null);
    create.mockResolvedValue(candidature({
      company: "",
      role: "",
      location: "",
      workMode: "",
      source: "",
      sourceText: "",
      notes: "",
    }));
    update.mockImplementation(async (value) => candidature({ ...value }));
    setDocuments.mockImplementation(async ({ documentIds }) => candidature({ documentIds }));
    setConcepts.mockImplementation(async ({ conceptIds }) => candidature({ conceptIds }));
    createConcept.mockResolvedValue(concept);
    updateConcept.mockResolvedValue(concept);
    installApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("creates an incomplete opportunity without inventing a completion workflow", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await screen.findByRole("heading", { name: "Candidatures" });
    await user.click(screen.getByRole("button", { name: "New candidature" }));

    expect(create).toHaveBeenCalledWith({
      company: "",
      role: "",
      location: "",
      workMode: "",
      salaryText: "",
      source: "",
      sourceUrl: "",
      sourceText: "",
      status: "saved",
      applicationDate: "",
      notes: "",
    });
    const focus = await screen.findByRole("region", { name: "Recruiter call focus" });
    expect(focus).not.toHaveTextContent(/next action/i);
    expect(screen.queryByRole("button", { name: /next action/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add pitch" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Company")).not.toBeInTheDocument();
  });

  it("keeps raw supplied sources useful in Focus without transcribing them into fields", async () => {
    const existing = candidature({ company: "", role: "", notes: "" });
    list.mockResolvedValueOnce([existing]);
    listSources.mockResolvedValue([recruiterSource, jobSource]);

    render(<CandidaturesWorkspace />);
    const focus = await screen.findByRole("region", { name: "Recruiter call focus" });
    await waitFor(() => expect(focus).toHaveTextContent("Recruiter message"));
    expect(focus).toHaveTextContent("Would you consider our backend role?");
    expect(focus).toHaveTextContent("Job description");
    expect(focus).toHaveTextContent("distributed systems ownership");
  });

  it("lets optional AI fill the same Opportunity draft that the user edits and saves", async () => {
    const existing = candidature({ company: "Human Co", role: "", location: "", workMode: "", salaryText: "" });
    list.mockResolvedValueOnce([existing]);
    listSources.mockResolvedValue([jobSource]);
    aiConnection.mockResolvedValue({ name: "Local", endpoint: "http://127.0.0.1:11434/v1", model: "test" });
    extractJob.mockResolvedValue({
      company: "",
      role: "Platform Engineer",
      location: "Remote EU",
      workMode: "remote",
      salaryText: "€80k",
    });
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByRole("region", { name: "Recruiter call focus" });
    await user.click(screen.getByRole("tab", { name: "Opportunity" }));
    await user.click(await screen.findByRole("button", { name: "Fill known facts from sources" }));

    expect(extractJob).toHaveBeenCalledWith(expect.objectContaining({
      source: "Job description",
      sourceText: expect.stringContaining("distributed systems ownership"),
    }));
    expect(screen.getByLabelText("Company")).toHaveValue("Human Co");
    expect(screen.getByLabelText("Role")).toHaveValue("Platform Engineer");
    expect(screen.getByLabelText("Location")).toHaveValue("Remote EU");
    expect(update).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Save opportunity" }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      id: existing.id,
      company: "Human Co",
      role: "Platform Engineer",
      location: "Remote EU",
      workMode: "remote",
      salaryText: "€80k",
    }));
  });

  it("edits bounded Opportunity facts manually through the same save path", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByRole("region", { name: "Recruiter call focus" });
    await user.click(screen.getByRole("tab", { name: "Opportunity" }));
    const opportunity = screen.getByRole("form", { name: "Opportunity" });
    await user.selectOptions(within(opportunity).getByLabelText("Status"), "applied");
    await user.selectOptions(within(opportunity).getByLabelText("Priority"), "high");
    await user.clear(within(opportunity).getByLabelText("Notes"));
    await user.type(within(opportunity).getByLabelText("Notes"), "Application submitted");
    await user.click(within(opportunity).getByRole("button", { name: "Save opportunity" }));

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      id: existing.id,
      status: "applied",
      priority: "high",
      notes: "Application submitted",
      archived: false,
    }));
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty("source");
  });

  it("does not silently discard a dirty section when navigating", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByRole("region", { name: "Recruiter call focus" });
    await user.click(screen.getByRole("tab", { name: "Opportunity" }));
    await user.clear(screen.getByLabelText("Company"));
    await user.type(screen.getByLabelText("Company"), "Unsaved Co");
    await user.click(screen.getByRole("tab", { name: "Sources" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved changes in this section?");
    expect(screen.getByRole("tab", { name: "Opportunity" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Company")).toHaveValue("Unsaved Co");
  });

  it("keeps evaluation/recruiter data editable and concepts/documents integrated", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    listConcepts.mockResolvedValueOnce([concept]);
    let persisted = workingBrief(existing.id);
    currentWorkingBrief.mockImplementation(async () => persisted);
    updateWorkingBrief.mockImplementation(async (value) => {
      persisted = value;
      return persisted;
    });
    setConcepts.mockImplementation(async ({ conceptIds }) => candidature({ ...existing, conceptIds }));
    setDocuments.mockImplementation(async ({ documentIds }) => candidature({ ...existing, documentIds }));
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByRole("region", { name: "Recruiter call focus" });
    await user.click(screen.getByRole("tab", { name: "Evaluation & strategy" }));
    await user.type(screen.getByLabelText("Strengths / evidence"), "Distributed systems ownership");
    await user.click(screen.getByRole("button", { name: "Save evaluation & strategy" }));
    expect(updateWorkingBrief).toHaveBeenCalledWith(expect.objectContaining({
      strengthsEvidence: "Distributed systems ownership",
    }));

    await user.click(screen.getByRole("tab", { name: "Concepts" }));
    const conceptsRegion = screen.getByRole("region", { name: "Concepts" });
    await user.click(within(conceptsRegion).getByLabelText(/TypeScript/));
    await user.click(within(conceptsRegion).getByRole("button", { name: "Save concept associations" }));
    expect(setConcepts).toHaveBeenCalledWith({ candidatureId: existing.id, conceptIds: [concept.id] });

    await user.click(screen.getByRole("tab", { name: "Documents" }));
    const documentsRegion = screen.getByRole("region", { name: "Documents" });
    await user.click(within(documentsRegion).getByLabelText(/Backend CV/));
    await user.click(within(documentsRegion).getByRole("button", { name: "Save document associations" }));
    expect(setDocuments).toHaveBeenCalledWith({ candidatureId: existing.id, documentIds: [document.id] });
  });

  it("keeps list search useful for shared concepts without turning the list into a dossier", async () => {
    const matching = candidature({ conceptIds: [concept.id] });
    const other = candidature({
      id: "00000000-0000-4000-8000-000000000205",
      company: "Other Co",
      role: "Data analyst",
    });
    list.mockResolvedValueOnce([matching, other]);
    listConcepts.mockResolvedValueOnce([concept]);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByRole("button", { name: /Acme — Backend engineer/ });
    await user.type(screen.getByLabelText("Search"), "TS");
    expect(screen.getByRole("button", { name: /Acme — Backend engineer/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Other Co — Data analyst/ })).not.toBeInTheDocument();
  });
});
