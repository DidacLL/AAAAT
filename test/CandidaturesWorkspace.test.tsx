import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type { CandidatureRecord, DesktopApi, DocumentRecord, ProfileSnapshot } from "../src/shared/contracts";

const emptyProfile: ProfileSnapshot = { items: [], variants: [] };
const unavailable = async (): Promise<never> => {
  throw new Error("Unavailable in candidature test");
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
    applicationDate: "",
    nextAction: "Reply",
    nextActionDate: "",
    notes: "Call after lunch",
    archived: false,
    documentIds: [],
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

const list = vi.fn<DesktopApi["candidatures"]["list"]>();
const create = vi.fn<DesktopApi["candidatures"]["create"]>();
const update = vi.fn<DesktopApi["candidatures"]["update"]>();
const setDocuments = vi.fn<DesktopApi["candidatures"]["setDocuments"]>();

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
  candidatures: { list, create, update, setDocuments },
};

describe("manual Candidatures workspace", () => {
  beforeEach(() => {
    for (const mock of [list, create, update, setDocuments]) mock.mockReset();
    list.mockResolvedValue([]);
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
    Object.defineProperty(window, "aaaat", { configurable: true, value: desktopApi });
  });

  afterEach(() => cleanup());

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

  it("edits lifecycle data, archives independently, and associates an existing document", async () => {
    const existing = candidature();
    list.mockResolvedValueOnce([existing]);
    update.mockImplementation(async (value) => candidature({ ...value }));
    setDocuments.mockImplementation(async ({ documentIds }) => candidature({ ...existing, documentIds }));
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    expect(await screen.findByDisplayValue("Acme")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Status"), "applied");
    await user.clear(screen.getByLabelText("Notes"));
    await user.type(screen.getByLabelText("Notes"), "Application submitted");
    await user.click(screen.getByRole("button", { name: "Save candidature" }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      id: existing.id,
      status: "applied",
      notes: "Application submitted",
      archived: false,
    }));

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
});
