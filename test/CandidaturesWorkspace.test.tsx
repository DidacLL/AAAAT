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

const regionalId = "00000000-0000-4000-8000-000000000501";
const nimbusId = "00000000-0000-4000-8000-000000000510";
const organisationId = "00000000-0000-4000-8000-000000000502";
const hoursId = "00000000-0000-4000-8000-000000000503";
const tagId = "00000000-0000-4000-8000-000000000508";
const timestamp = "2026-09-04T00:00:00.000Z";

function field(
  id: string,
  label: string,
  valueType: "text" | "number",
  focusVisible: boolean,
): CandidatureFieldConfiguration {
  return {
    definition: {
      id,
      systemKey: null,
      label,
      description: `${label} description`,
      valueType,
      cardinality: "one",
      choices: [],
      enabled: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    preferences: {
      fieldId: id,
      focusVisible,
      focusOrder: focusVisible ? 0 : null,
      focusProminence: "normal",
      identityOrder: null,
      aiDiscovery: false,
      aiContextMode: "omit",
    },
  };
}

const organisation = field(organisationId, "Organisation", "text", true);
const hours = field(hoursId, "Minimum flight hours", "number", false);
const platformTag: TagRecord = {
  id: tagId,
  name: "Platform",
  definition: "Platform engineering",
  notes: "Remember the ownership boundaries.",
  aliases: ["platform team"],
};

const retainedOrganisation = {
  candidatureId: regionalId,
  fieldId: organisationId,
  value: "Regional Air",
  createdAt: timestamp,
  updatedAt: timestamp,
} as const;

const regional: CandidatureRecord = {
  id: regionalId,
  archived: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  label: "Regional Air",
  sourceSearchText: "Airline pilot opportunity with European bases",
  values: [retainedOrganisation],
  documentIds: [],
  tagIds: [tagId],
};

const nimbus: CandidatureRecord = {
  id: nimbusId,
  archived: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  label: "Nimbus Labs",
  sourceSearchText: "Remote platform role in Barcelona",
  values: [],
  documentIds: [],
  tagIds: [],
};

const list = vi.fn();
const listFields = vi.fn();
const setFieldValue = vi.fn();
const createField = vi.fn();
const updateTag = vi.fn();

function installApi() {
  list.mockResolvedValue([regional, nimbus]);
  listFields.mockResolvedValue([organisation, hours]);
  setFieldValue.mockImplementation(async ({ candidatureId, fieldId, value }) => {
    const base = candidatureId === regionalId ? regional : nimbus;
    return {
      ...base,
      values: [
        ...base.values.filter((retained) => retained.fieldId !== fieldId),
        {
          candidatureId,
          fieldId,
          value,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    };
  });
  createField.mockImplementation(async (input) =>
    field("00000000-0000-4000-8000-000000000507", input.label, "text", false),
  );
  updateTag.mockImplementation(async (input) => input);

  const api = {
    candidatures: {
      list,
      listFields,
      create: vi.fn(),
      update: vi.fn().mockImplementation(async ({ id, ...patch }) => ({
        ...(id === regionalId ? regional : nimbus),
        ...patch,
      })),
      filter: vi.fn().mockResolvedValue([regionalId, nimbusId]),
      createField,
      updateField: vi.fn(),
      deleteField: vi.fn(),
      updateFieldPreferences: vi.fn(),
      setFieldValue,
      clearFieldValue: vi.fn(),
      listSources: vi.fn().mockResolvedValue([]),
      addSource: vi.fn(),
      updateSource: vi.fn(),
      removeSource: vi.fn(),
      setDocuments: vi.fn(),
      listTags: vi.fn().mockResolvedValue([platformTag]),
      createTag: vi.fn(),
      updateTag,
      setTags: vi.fn(),
    },
    candidatureSearch: { search: vi.fn().mockResolvedValue([regionalId, nimbusId]) },
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

describe("rebuilt candidature workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens on corpus Focus with no forced selection and makes sparse candidatures recognizable", async () => {
    render(<CandidaturesWorkspace />);

    expect(await screen.findByRole("heading", { name: "Candidatures" })).toBeInTheDocument();
    expect(screen.getByText("Regional Air", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Nimbus Labs", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Remote platform role in Barcelona")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Candidature Focus" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Complete candidature" })).not.toBeInTheDocument();
  });

  it("transitions from corpus to selected Focus, shows only configured recall information, edits it, and returns", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    const regionalEntry = await screen.findByRole("button", { name: /Regional Air/ });
    await user.click(regionalEntry);

    const selected = screen.getByRole("region", { name: "Candidature Focus" });
    const focus = within(selected).getByRole("region", { name: "Selected candidature Focus" });
    expect(within(focus).getByRole("heading", { name: "Organisation" })).toBeInTheDocument();
    expect(within(focus).queryByRole("heading", { name: "Minimum flight hours" })).not.toBeInTheDocument();
    expect(within(focus).getByRole("region", { name: "Tags" })).toHaveTextContent("Platform");

    await user.click(within(focus).getByRole("button", { name: "Edit" }));
    const value = within(focus).getByRole("textbox");
    await user.clear(value);
    await user.type(value, "Regional Air Europe");
    await user.click(within(focus).getByRole("button", { name: "Save" }));
    expect(setFieldValue).toHaveBeenCalledWith({
      candidatureId: regionalId,
      fieldId: organisationId,
      value: "Regional Air Europe",
    });

    await user.click(within(selected).getByRole("button", { name: "Back to candidatures" }));
    expect(await screen.findByRole("heading", { name: "Candidatures" })).toBeInTheDocument();
  });

  it("opens complete candidature work directly from corpus without passing through selected Focus", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await user.click((await screen.findAllByRole("button", { name: "Edit candidature" }))[0]!);

    const complete = screen.getByRole("region", { name: "Complete candidature" });
    expect(within(complete).getByRole("region", { name: "Candidature information" })).toBeInTheDocument();
    expect(within(complete).getByRole("region", { name: "Sources" })).toBeInTheDocument();
    expect(within(complete).getByRole("region", { name: "Tags" })).toBeInTheDocument();
    expect(within(complete).getByRole("region", { name: "Application material" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Candidature sections" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Concept/i)).not.toBeInTheDocument();
  });

  it("adds missing information on demand without turning ordinary editing into schema administration", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await user.click((await screen.findAllByRole("button", { name: "Edit candidature" }))[0]!);

    await user.click(screen.getByText("+ Add information", { selector: "summary" }));
    await user.selectOptions(screen.getByLabelText("Information to add"), hoursId);
    const input = screen.getByRole("spinbutton");
    await user.type(input, "1500");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(setFieldValue).toHaveBeenCalledWith({
      candidatureId: regionalId,
      fieldId: hoursId,
      value: 1500,
    });
    expect(screen.queryByText("Cardinality", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Value type", { exact: true })).not.toBeInTheDocument();
  });

  it("keeps Tag notes editable in complete maintenance with no Concept-era vocabulary", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await user.click((await screen.findAllByRole("button", { name: "Edit candidature" }))[0]!);

    const tags = screen.getByRole("region", { name: "Tags" });
    await user.click(within(tags).getByRole("button", { name: "Edit Tag" }));
    const notes = within(tags).getByLabelText("Notes");
    expect(notes).toHaveValue("Remember the ownership boundaries.");
    await user.clear(notes);
    await user.type(notes, "Ask how platform ownership is divided.");
    await user.click(within(tags).getByRole("button", { name: "Save Tag" }));

    expect(updateTag).toHaveBeenCalledWith({
      id: platformTag.id,
      name: platformTag.name,
      definition: platformTag.definition,
      notes: "Ask how platform ownership is divided.",
      aliases: platformTag.aliases,
    });
    expect(screen.queryByText(/Concept/i)).not.toBeInTheDocument();
  });
});
