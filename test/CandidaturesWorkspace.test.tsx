import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type {
  CandidatureRecord,
  CandidatureWorkingBrief,
  ConceptRecord,
  DesktopApi,
  DocumentRecord,
  ProfileSnapshot,
} from "../src/shared/contracts";

const emptyProfile: ProfileSnapshot = { items: [], variants: [] };
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

function workingBrief(candidatureId: string): CandidatureWorkingBrief {
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
    current: async () => ({
      careerDirection: "",
      objectives: "",
      constraints: "",
      targetRoles: "",
      targetMarketsLocations: "",
      workPreferences: "",
      applicationWritingPreferences: "",
    }),
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

describe("manual Candidatures workspace", () => {
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
    ]) mock.mockReset();
    list.mockResolvedValue([]);
    listSources.mockResolvedValue([]);
    currentWorkingBrief.mockImplementation(async (candidatureId) => workingBrief(candidatureId));
    updateWorkingBrief.mockImplementation(async (value) => value);
    listConcepts.mockResolvedValue([]);
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

  it("creates a partial candidature without requiring invented details", async () => {
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
    expect(await screen.findByLabelText("Source material")).toBeInTheDocument();
  });

  it("edits lifecycle data, priority, archives independently, and associates an existing document", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    update.mockImplementation(async (value) => candidature({ ...value }));
    setDocuments.mockImplementation(async ({ documentIds }) => candidature({ ...existing, documentIds }));
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    expect(await screen.findByDisplayValue("Acme")).toBeInTheDocument();
    const saveButton = screen.getByRole("button", { name: "Save candidature" });
    const form = saveButton.closest("form");
    if (!form) throw new Error("Expected candidature edit form");
    const editor = within(form);
    await user.selectOptions(editor.getByLabelText("Status"), "applied");
    await user.selectOptions(editor.getByLabelText("Priority"), "high");
    await user.clear(editor.getByLabelText("Notes"));
    await user.type(editor.getByLabelText("Notes"), "Application submitted");
    await user.click(saveButton);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      id: existing.id,
      status: "applied",
      priority: "high",
      notes: "Application submitted",
      archived: false,
    }));
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty("source");

    await user.click(screen.getByRole("button", { name: "Archive candidature" }));
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      id: existing.id,
      status: "applied",
      archived: true,
    }));

    await user.click(screen.getByLabelText(/Backend CV/));
    await user.click(screen.getByRole("button", { name: "Save document associations" }));
    expect(setDocuments).toHaveBeenCalledWith({
      candidatureId: existing.id,
      documentIds: [document.id],
    });
  });

  it("keeps dirty candidature notes while saving document and concept associations", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    listConcepts.mockResolvedValueOnce([concept]);
    setDocuments.mockImplementation(async ({ documentIds }) =>
      candidature({ ...existing, documentIds }),
    );
    setConcepts.mockImplementation(async ({ conceptIds }) =>
      candidature({ ...existing, conceptIds }),
    );
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    const notes = await screen.findByLabelText("Notes");
    await user.clear(notes);
    await user.type(notes, "Unsaved local notes");

    await user.click(screen.getByLabelText(/Backend CV/));
    await user.click(screen.getByRole("button", { name: "Save document associations" }));
    expect(screen.getByLabelText("Notes")).toHaveValue("Unsaved local notes");

    await user.click(screen.getByLabelText("TypeScript"));
    await user.click(screen.getByRole("button", { name: "Save concept associations" }));
    expect(screen.getByLabelText("Notes")).toHaveValue("Unsaved local notes");
  });

  it("keeps dirty association selections while saving the candidature draft", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    listConcepts.mockResolvedValueOnce([concept]);
    update.mockImplementation(async (value) => candidature({ ...value }));
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByDisplayValue("Acme");
    const documentToggle = screen.getByLabelText(/Backend CV/);
    const conceptToggle = screen.getByLabelText("TypeScript");
    await user.click(documentToggle);
    await user.click(conceptToggle);
    await user.clear(screen.getByLabelText("Notes"));
    await user.type(screen.getByLabelText("Notes"), "Saved main draft");
    await user.click(screen.getByRole("button", { name: "Save candidature" }));

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ notes: "Saved main draft" }));
    expect(documentToggle).toBeChecked();
    expect(conceptToggle).toBeChecked();
    expect(setDocuments).not.toHaveBeenCalled();
    expect(setConcepts).not.toHaveBeenCalled();
  });

  it("archives from persisted candidature data without committing unrelated dirty fields", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    const company = await screen.findByLabelText("Company");
    const role = screen.getByLabelText("Role");
    await user.clear(company);
    await user.type(company, "Unsaved Co");
    await user.clear(role);
    await user.type(role, "Unsaved role");
    await user.click(screen.getByRole("button", { name: "Archive candidature" }));

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      id: existing.id,
      company: "Acme",
      role: "Backend engineer",
      archived: true,
    }));
    expect(screen.getByLabelText("Company")).toHaveValue("Unsaved Co");
    expect(screen.getByLabelText("Role")).toHaveValue("Unsaved role");
    expect(screen.getByRole("button", { name: "Restore from archive" })).toBeInTheDocument();
  });

  it("cancels or discards dirty candidature state explicitly when selection changes", async () => {
    const first = candidature();
    const second = candidature({
      id: "00000000-0000-4000-8000-000000000209",
      company: "Other Co",
      role: "Data engineer",
    });
    list.mockResolvedValueOnce([first, second]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    const notes = await screen.findByLabelText("Notes");
    await user.clear(notes);
    await user.type(notes, "Unsaved selection draft");
    await user.click(screen.getByRole("button", { name: /Other Co — Data engineer/ }));

    expect(confirm).toHaveBeenCalled();
    expect(screen.getByLabelText("Company")).toHaveValue("Acme");
    expect(screen.getByLabelText("Notes")).toHaveValue("Unsaved selection draft");

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: /Other Co — Data engineer/ }));
    expect(screen.getByLabelText("Company")).toHaveValue("Other Co");
  });

  it("searches concept aliases and keeps recruiter-call context together", async () => {
    const matching = candidature({ documentIds: [document.id], conceptIds: [concept.id] });
    const other = candidature({
      id: "00000000-0000-4000-8000-000000000205",
      company: "Other Co",
      role: "Data analyst",
    });
    list.mockResolvedValueOnce([matching, other]);
    listConcepts.mockResolvedValueOnce([concept]);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    const focus = await screen.findByRole("region", { name: "Recruiter call focus" });
    expect(within(focus).getByRole("heading", { name: /Acme — Backend engineer/ })).toBeInTheDocument();
    expect(focus).toHaveTextContent("Backend CV");
    expect(focus).toHaveTextContent(concept.definition);

    await user.type(screen.getByLabelText("Search"), "TS");
    expect(screen.getByRole("button", { name: /Acme — Backend engineer/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Other Co — Data analyst/ })).not.toBeInTheDocument();
  });

  it("creates a shared concept and associates it through fixed candidature intentions", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByDisplayValue("Acme");
    await user.type(screen.getByLabelText("Name"), "TypeScript");
    await user.type(screen.getByLabelText("Aliases"), "TS");
    await user.type(screen.getByLabelText("Definition"), concept.definition);
    await user.click(screen.getByRole("button", { name: "Create concept" }));
    expect(createConcept).toHaveBeenCalledWith({
      name: "TypeScript",
      aliases: ["TS"],
      definition: concept.definition,
    });

    await user.click(screen.getByLabelText("TypeScript"));
    await user.click(screen.getByRole("button", { name: "Save concept associations" }));
    expect(setConcepts).toHaveBeenCalledWith({
      candidatureId: existing.id,
      conceptIds: [concept.id],
    });
  });
});
