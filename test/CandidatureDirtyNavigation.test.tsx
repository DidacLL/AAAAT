import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  DesktopApi,
  TagRecord,
} from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000701";
const fieldId = "00000000-0000-4000-8000-000000000702";
const tagId = "00000000-0000-4000-8000-000000000703";
const timestamp = "2026-09-14T00:00:00.000Z";

const organisation: CandidatureFieldConfiguration = {
  definition: {
    id: fieldId,
    systemKey: null,
    label: "Organisation",
    description: "Organisation description",
    valueType: "text",
    cardinality: "one",
    choices: [],
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
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

const platformTag: TagRecord = {
  id: tagId,
  name: "Platform",
  definition: "Platform engineering",
  notes: "",
  aliases: [],
};

const candidature: CandidatureRecord = {
  id: candidatureId,
  archived: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  label: "Regional Air",
  sourceSearchText: "Regional Air opportunity",
  values: [
    {
      candidatureId,
      fieldId,
      value: "Regional Air",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  documentIds: [],
  tagIds: [tagId],
};

function installApi() {
  const api = {
    candidatures: {
      list: vi.fn().mockResolvedValue([candidature]),
      listFields: vi.fn().mockResolvedValue([organisation]),
      create: vi.fn(),
      update: vi.fn().mockImplementation(async ({ id, ...patch }) => ({
        ...candidature,
        id,
        ...patch,
      })),
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
      listTags: vi.fn().mockResolvedValue([platformTag]),
      createTag: vi.fn(),
      updateTag: vi.fn(),
      setTags: vi.fn(),
    },
    candidatureSearch: { search: vi.fn().mockResolvedValue([candidatureId]) },
    documents: { list: vi.fn().mockResolvedValue([]) },
    artifacts: { list: vi.fn().mockResolvedValue([]), capture: vi.fn() },
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

describe("candidature dirty navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("protects an unsaved selected-Focus field draft before opening complete candidature work", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CandidaturesWorkspace />);

    await user.click(await screen.findByRole("button", { name: /Regional Air/ }));
    const selectedFocus = screen.getByRole("region", { name: /^Candidature Focus$/ });
    const focus = within(selectedFocus).getByRole("region", { name: "Selected candidature Focus" });
    await user.click(within(focus).getByRole("button", { name: "Edit" }));
    const value = within(focus).getByRole("textbox");
    await user.clear(value);
    await user.type(value, "Unsaved Regional Air");

    await user.click(within(selectedFocus).getByRole("button", { name: "All details" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved candidature edits?");
    expect(screen.getByRole("region", { name: /^Candidature Focus$/ })).toBeInTheDocument();
    expect(value).toHaveValue("Unsaved Regional Air");

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "All details" }));

    expect(screen.getByRole("region", { name: "Complete candidature" })).toBeInTheDocument();
  });

  it("protects complete-candidature drafts before opening Focus and resets them after confirmed discard", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CandidaturesWorkspace />);

    await user.click(await screen.findByRole("button", { name: "All details" }));
    const tags = screen.getByRole("region", { name: "Tags" });
    const platform = within(tags).getByRole("checkbox", { name: /Platform/ });
    expect(platform).toBeChecked();
    await user.click(platform);
    expect(platform).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "Focus" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved candidature edits?");
    expect(screen.getByRole("region", { name: "Complete candidature" })).toBeInTheDocument();
    expect(platform).not.toBeChecked();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Focus" }));
    expect(screen.getByRole("region", { name: /^Candidature Focus$/ })).toBeInTheDocument();

    confirm.mockClear();
    confirm.mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "All details" }));

    expect(confirm).not.toHaveBeenCalled();
    const restoredTags = screen.getByRole("region", { name: "Tags" });
    expect(within(restoredTags).getByRole("checkbox", { name: /Platform/ })).toBeChecked();
  });
});
