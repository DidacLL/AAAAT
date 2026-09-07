import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type { CandidatureRecord, ConceptRecord, DesktopApi, DocumentRecord } from "../src/shared/contracts";
import type { FocusMaterialPreferences } from "../src/shared/focus-contracts";

const candidatureId = "00000000-0000-4000-8000-000000000701";
const concept: ConceptRecord = {
  id: "00000000-0000-4000-8000-000000000702",
  name: "Platform",
  definition: "Platform engineering",
  aliases: [],
};
const document: DocumentRecord = {
  id: "00000000-0000-4000-8000-000000000703",
  kind: "cv",
  title: "Application CV",
  variantId: null,
  engine: "pdflatex",
  bodyParagraphs: [],
  mode: "managed",
  rules: [],
  projectPath: "/workspace/documents/cv",
  sourcePath: "/workspace/documents/cv/main.tex",
  artifactPath: "/workspace/documents/cv/build/main.pdf",
};
const candidature: CandidatureRecord = {
  id: candidatureId,
  archived: false,
  createdAt: "2026-09-07T00:00:00.000Z",
  updatedAt: "2026-09-07T00:00:00.000Z",
  label: "Regional Air",
  sourceSearchText: "",
  values: [],
  documentIds: [document.id],
  conceptIds: [],
};

const setConcepts = vi.fn();

function installApi() {
  setConcepts.mockImplementation(async ({ conceptIds }) => ({ ...candidature, conceptIds }));
  const api = {
    candidatures: {
      list: vi.fn().mockResolvedValue([candidature]),
      listFields: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      filter: vi.fn().mockResolvedValue([candidatureId]),
      createField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      updateFieldPreferences: vi.fn(),
      setFieldValue: vi.fn(),
      clearFieldValue: vi.fn(),
      listSources: vi.fn().mockResolvedValue([]),
      addSource: vi.fn(),
      updateSource: vi.fn(),
      removeSource: vi.fn(),
      setDocuments: vi.fn(),
      listConcepts: vi.fn().mockResolvedValue([concept]),
      createConcept: vi.fn(),
      updateConcept: vi.fn(),
      setConcepts,
    },
    candidatureSearch: { search: vi.fn().mockResolvedValue([]) },
    documents: { list: vi.fn().mockResolvedValue([document]) },
    todos: { list: vi.fn().mockResolvedValue([]) },
    focus: {
      current: vi.fn().mockResolvedValue({
        sources: true,
        concepts: true,
        todos: true,
        documents: true,
      }),
      update: vi.fn().mockImplementation(async (preferences: FocusMaterialPreferences) => preferences),
    },
    ai: {
      discoverField: vi.fn(),
      previewFit: vi.fn(),
      assessFit: vi.fn(),
      recommendVariant: vi.fn(),
    },
    profile: { current: vi.fn().mockResolvedValue({ items: [], variants: [] }) },
  } as unknown as DesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("selected candidature local hierarchy", () => {
  it("keeps four primary intentions while Concepts stays contextual and application material remains reachable", async () => {
    installApi();
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CandidaturesWorkspace />);

    const focus = await screen.findByRole("region", { name: "Candidature Focus" });
    expect(focus).toBeInTheDocument();

    const tabs = within(screen.getByRole("tablist", { name: "Candidature sections" })).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Focus",
      "Information",
      "Sources",
      "Application material",
    ]);
    expect(screen.queryByRole("tab", { name: "Concepts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Documents" })).not.toBeInTheDocument();

    await user.click(screen.getByText("Concepts", { selector: "summary" }));
    const concepts = screen.getByRole("region", { name: "Concepts" });
    await user.click(within(concepts).getByRole("checkbox", { name: "Platform" }));

    await user.click(screen.getByRole("tab", { name: "Application material" }));
    expect(confirm).toHaveBeenCalledWith("Discard unsaved candidature edits?");
    expect(screen.getByRole("tab", { name: "Focus" })).toHaveAttribute("aria-selected", "true");

    await user.click(within(concepts).getByRole("button", { name: "Save concept associations" }));
    expect(setConcepts).toHaveBeenCalledWith({ candidatureId, conceptIds: [concept.id] });

    await user.click(screen.getByRole("tab", { name: "Application material" }));
    expect(screen.getByRole("region", { name: "Application material" })).toBeInTheDocument();
    expect(screen.getByText("Application CV (CV)")).toBeInTheDocument();
  });
});
