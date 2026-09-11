import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  DesktopApi,
} from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000911";
const fieldId = "00000000-0000-4000-8000-000000000912";

const information: CandidatureFieldConfiguration = {
  definition: {
    id: fieldId,
    systemKey: null,
    label: "Availability",
    description: "When the user can start",
    valueType: "text",
    cardinality: "one",
    choices: [],
    enabled: true,
    createdAt: "2026-09-11T00:00:00.000Z",
    updatedAt: "2026-09-11T00:00:00.000Z",
  },
  preferences: {
    fieldId,
    focusVisible: true,
    focusOrder: 0,
    focusProminence: "normal",
    identityOrder: null,
    aiDiscovery: false,
    aiContextMode: "omit",
  },
};

const retained = {
  candidatureId,
  fieldId,
  value: "October or November",
  createdAt: "2026-09-11T00:00:00.000Z",
  updatedAt: "2026-09-11T00:00:00.000Z",
} as const;

const record: CandidatureRecord = {
  id: candidatureId,
  archived: false,
  createdAt: "2026-09-11T00:00:00.000Z",
  updatedAt: "2026-09-11T00:00:00.000Z",
  label: "Example opportunity",
  sourceSearchText: "",
  values: [retained],
  documentIds: [],
  conceptIds: [],
};

function installApi() {
  const api = {
    candidatures: {
      list: vi.fn().mockResolvedValue([record]),
      listFields: vi.fn().mockResolvedValue([information]),
      create: vi.fn(),
      update: vi.fn(),
      filter: vi.fn().mockResolvedValue([candidatureId]),
      createField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      updateFieldPreferences: vi.fn(),
      setFieldValue: vi.fn().mockResolvedValue(record),
      clearFieldValue: vi.fn().mockResolvedValue({ ...record, values: [] }),
      listSources: vi.fn().mockResolvedValue([]),
      addSource: vi.fn(),
      updateSource: vi.fn(),
      removeSource: vi.fn(),
      setDocuments: vi.fn(),
      listConcepts: vi.fn().mockResolvedValue([]),
      createConcept: vi.fn(),
      updateConcept: vi.fn(),
      setConcepts: vi.fn(),
    },
    documents: { list: vi.fn().mockResolvedValue([]) },
    todos: { list: vi.fn().mockResolvedValue([]) },
    focus: {
      current: vi.fn().mockResolvedValue({
        sources: true,
        concepts: true,
        todos: true,
        documents: true,
      }),
      update: vi.fn(),
    },
    ai: {
      discoverField: vi.fn(),
      previewOpportunityReview: vi.fn(),
      reviewOpportunity: vi.fn(),
      recommendVariant: vi.fn(),
    },
    profile: { current: vi.fn().mockResolvedValue({ items: [], variants: [] }) },
  } as unknown as DesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

describe("candidature Information local editing", () => {
  beforeEach(() => installApi());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps populated information read-first and protects a dirty local edit when leaving Information", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByRole("region", { name: "Candidature Focus" });
    await user.click(screen.getByRole("tab", { name: "Information" }));
    const informationRegion = screen.getByRole("region", { name: "Candidature information" });
    const heading = within(informationRegion).getByRole("heading", { name: "Availability" });
    const card = heading.closest("article");
    if (!card) throw new Error("Retained information card missing");

    expect(within(card).getByText("October or November", { exact: true })).toBeInTheDocument();
    expect(within(card).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Save" })).not.toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "Edit" }));
    const input = within(card).getByRole("textbox");
    await user.clear(input);
    await user.type(input, "October through December");

    await user.click(screen.getByRole("tab", { name: "Sources" }));
    expect(confirm).toHaveBeenCalledWith("Discard unsaved information value edits?");
    expect(screen.getByRole("tab", { name: "Information" })).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveValue("October through December");
  });
});
