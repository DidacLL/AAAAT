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
    nextAction: "Reply",
    nextActionDate: "",
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
    ]) mock.mockReset();
    list.mockResolvedValue([]);
    listSources.mockResolvedValue([]);
    currentWorkingBrief.mockImplementation(async (candidatureId) => workingBrief(candidatureId));
    updateWorkingBrief.mockImplementation(async (value) => value);
    listConcepts.mockResolvedValue([]);
    careerCurrent.mockResolvedValue(emptyCareerContext);
    create.mockResolvedValue(candidature({
      company: "",
      role: "",
      location: "",
      workMode: "",
      source: "",
      sourceText: "",
      nextAction: "",
      notes: "",
    }));
    update.mockImplementation(async (value) => candidature({ ...value }));
    setDocuments.mockImplementation(async ({ documentIds }) => candidature({ documentIds }));
    setConcepts.mockImplementation(async ({ conceptIds }) => candidature({ conceptIds }));
    createConcept.mockResolvedValue(concept);
    updateConcept.mockResolvedValue(concept);
    Object.defineProperty(window, "aaaat", { configurable: true, value: desktopApi });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("creates an incomplete opportunity and opens compact Focus by default", async () => {
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
      nextAction: "",
      nextActionDate: "",
      notes: "",
    });
    expect(screen.getByRole("tab", { name: "Focus" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("region", { name: "Recruiter call focus" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add next action" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add pitch" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add evidence" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Company")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Sources" }));
    expect(screen.queryByLabelText("Source material")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add source" }));
    expect(screen.getByLabelText("Source material")).toBeInTheDocument();
  });

  it("answers the recruiter-readiness questions in Focus when information exists", async () => {
    const existing = candidature({
      company: "Example Systems",
      role: "Senior Platform Engineer",
      status: "interview",
      priority: "high",
      nextAction: "Recruiter call Friday",
      nextActionDate: "2026-09-11",
      notes: "Ask about platform ownership boundaries.",
      documentIds: [document.id],
      conceptIds: [concept.id],
    });
    list.mockResolvedValueOnce([existing]);
    listConcepts.mockResolvedValueOnce([concept]);
    currentWorkingBrief.mockResolvedValue(
      workingBrief(existing.id, {
        fitSuitability: "Strong fit for platform scope.",
        strengthsEvidence: "Led a multi-region service migration.",
        gapsRisksConstraints: "Clarify on-call load.",
        currentStrategy: "Lead with reliability and platform leverage.",
        companyRoleContext: "Team owns the internal platform.",
        pitch: "I build platform systems that let product teams move safely.",
        questions: "How is platform impact measured?",
        recruiterPreparation: "Keep compensation discussion high level.",
      }),
    );
    careerCurrent.mockResolvedValue({
      ...emptyCareerContext,
      careerDirection: "Move toward staff-level platform work.",
      constraints: "No relocation.",
      targetMarketsLocations: "Spain / EU remote or hybrid.",
    });

    render(<CandidaturesWorkspace />);
    const focus = await screen.findByRole("region", { name: "Recruiter call focus" });
    await waitFor(() => expect(focus).toHaveTextContent("I build platform systems"));
    expect(focus).toHaveTextContent("interview · high priority");
    expect(focus).toHaveTextContent("Recruiter call Friday");
    expect(focus).toHaveTextContent("Led a multi-region service migration");
    expect(focus).toHaveTextContent("Clarify on-call load");
    expect(focus).toHaveTextContent("No relocation");
    expect(focus).toHaveTextContent("How is platform impact measured");
    expect(focus).toHaveTextContent("Lead with reliability");
    expect(focus).toHaveTextContent("Team owns the internal platform");
    expect(focus).toHaveTextContent("TypeScript");
    expect(focus).toHaveTextContent("Backend CV");
    expect(focus).toHaveTextContent("Ask about platform ownership boundaries");
    expect(focus).not.toHaveTextContent("No concepts associated");
    expect(focus).not.toHaveTextContent("No CV or cover-letter");
  });

  it("edits only bounded Opportunity facts and never sends source mutation through update", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    update.mockImplementation(async (value) => candidature({ ...value }));
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
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty("sourceText");
  });

  it("does not silently discard a dirty section when navigating", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByRole("region", { name: "Recruiter call focus" });
    await user.click(screen.getByRole("tab", { name: "Opportunity" }));
    const company = screen.getByLabelText("Company");
    await user.clear(company);
    await user.type(company, "Unsaved Co");
    await user.click(screen.getByRole("tab", { name: "Sources" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved changes in this section?");
    expect(screen.getByRole("tab", { name: "Opportunity" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Company")).toHaveValue("Unsaved Co");

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("tab", { name: "Sources" }));
    expect(screen.getByRole("tab", { name: "Sources" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows source cards first and opens one focused source editor on demand", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    listSources.mockResolvedValueOnce([recruiterSource]);
    addSource.mockResolvedValue([recruiterSource, jobSource]);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByRole("region", { name: "Recruiter call focus" });
    await user.click(screen.getByRole("tab", { name: "Sources" }));
    expect(await screen.findByText("Recruiter message")).toBeInTheDocument();
    expect(screen.getByText(/Would you consider our backend role/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Source material")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.selectOptions(screen.getByLabelText("Kind"), "job_posting");
    await user.type(screen.getByLabelText("Title"), "Job description");
    await user.type(screen.getByLabelText("Source material"), jobSource.sourceText);
    await user.click(screen.getByRole("button", { name: "Add source" }));

    expect(addSource).toHaveBeenCalledWith(expect.objectContaining({
      candidatureId: existing.id,
      kind: "job_posting",
      title: "Job description",
      sourceText: jobSource.sourceText,
    }));
    expect(await screen.findByText("Job description")).toBeInTheDocument();
    expect(screen.queryByLabelText("Source material")).not.toBeInTheDocument();
  });

  it("keeps evaluation and recruiter preparation as separate manual intentions", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    let persisted = workingBrief(existing.id);
    currentWorkingBrief.mockImplementation(async () => persisted);
    updateWorkingBrief.mockImplementation(async (value) => {
      persisted = value;
      return persisted;
    });
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByRole("region", { name: "Recruiter call focus" });
    await user.click(screen.getByRole("tab", { name: "Evaluation & strategy" }));
    expect(screen.getByLabelText("Fit / suitability")).toBeInTheDocument();
    expect(screen.queryByLabelText("Pitch")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Strengths / evidence"), "Distributed systems ownership");
    await user.click(screen.getByRole("button", { name: "Save evaluation & strategy" }));
    expect(updateWorkingBrief).toHaveBeenCalledWith(expect.objectContaining({
      strengthsEvidence: "Distributed systems ownership",
    }));

    await user.click(screen.getByRole("tab", { name: "Recruiter preparation" }));
    expect(await screen.findByLabelText("Pitch")).toBeInTheDocument();
    expect(screen.queryByLabelText("Fit / suitability")).not.toBeInTheDocument();
  });

  it("keeps concepts and documents integrated without putting their editors in Focus", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    listConcepts.mockResolvedValueOnce([concept]);
    setConcepts.mockImplementation(async ({ conceptIds }) => candidature({ ...existing, conceptIds }));
    setDocuments.mockImplementation(async ({ documentIds }) => candidature({ ...existing, documentIds }));
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByRole("region", { name: "Recruiter call focus" });
    expect(screen.queryByLabelText("Definition")).not.toBeInTheDocument();

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

  it("keeps list search useful for concepts and shows next action without becoming a dossier", async () => {
    const matching = candidature({ conceptIds: [concept.id], nextAction: "Reply Friday" });
    const other = candidature({
      id: "00000000-0000-4000-8000-000000000205",
      company: "Other Co",
      role: "Data analyst",
      nextAction: "",
    });
    list.mockResolvedValueOnce([matching, other]);
    listConcepts.mockResolvedValueOnce([concept]);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    const matchingButton = await screen.findByRole("button", { name: /Acme — Backend engineer/ });
    expect(matchingButton).toHaveTextContent("Next: Reply Friday");
    await user.type(screen.getByLabelText("Search"), "TS");
    expect(screen.getByRole("button", { name: /Acme — Backend engineer/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Other Co — Data analyst/ })).not.toBeInTheDocument();
  });
});
