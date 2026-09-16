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
const addedId = "00000000-0000-4000-8000-000000000507";
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
      aiUseAllowed: true,
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
const listTags = vi.fn();
const setFieldValue = vi.fn();
const createField = vi.fn();
const updateFieldPreferences = vi.fn();
const updateTag = vi.fn();
const setTags = vi.fn();

function installApi(tags: readonly TagRecord[] = [platformTag]) {
  list.mockResolvedValue([regional, nimbus]);
  listFields.mockResolvedValue([organisation, hours]);
  listTags.mockResolvedValue([...tags]);
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
  createField.mockImplementation(async (input) => field(addedId, input.label, "text", false));
  updateFieldPreferences.mockImplementation(async (input) => {
    const current = input.fieldId === organisationId ? organisation : input.fieldId === hoursId ? hours : field(addedId, "Flight hours", "text", false);
    return {
      ...current,
      preferences: { ...current.preferences, ...input },
    };
  });
  updateTag.mockImplementation(async (input) => input);
  setTags.mockImplementation(async ({ candidatureId, tagIds }) => ({
    ...(candidatureId === regionalId ? regional : nimbus),
    tagIds,
  }));

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
      updateField: vi.fn().mockImplementation(async (input) => ({
        ...(input.id === organisationId ? organisation : hours),
        definition: {
          ...(input.id === organisationId ? organisation.definition : hours.definition),
          ...input,
        },
      })),
      deleteField: vi.fn(),
      updateFieldPreferences,
      setFieldValue,
      clearFieldValue: vi.fn().mockResolvedValue({ ...regional, values: [] }),
      listSources: vi.fn().mockResolvedValue([]),
      addSource: vi.fn(),
      updateSource: vi.fn(),
      removeSource: vi.fn(),
      setDocuments: vi.fn(),
      listTags,
      createTag: vi.fn(),
      updateTag,
      setTags,
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
  async function openRegionalRecord(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole("button", { name: /Regional Air/ }));
    await user.click(screen.getByRole("button", { name: "Full record" }));
  }
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

    expect(await screen.findByRole("heading", { name: "Focus" })).toBeInTheDocument();
    expect(screen.getByText("Regional Air", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Nimbus Labs", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Remote platform role in Barcelona")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /^Candidature Focus$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Complete candidature" })).not.toBeInTheDocument();
  });

  it("transitions from corpus to selected Focus, keeps recall information read-first, edits it, and returns", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    const regionalEntry = await screen.findByRole("button", { name: /Regional Air/ });
    await user.click(regionalEntry);

    const selected = screen.getByRole("region", { name: /^Candidature Focus$/ });
    const focus = within(selected).getByRole("region", { name: "Selected candidature Focus" });
    expect(within(focus).getByRole("heading", { name: "Organisation" })).toBeInTheDocument();
    expect(within(focus).queryByRole("heading", { name: "Minimum flight hours" })).not.toBeInTheDocument();
    expect(within(focus).getByRole("region", { name: "Tags" })).toHaveTextContent("Platform");

    await user.click(within(focus).getByRole("button", { name: "Edit Organisation" }));
    const value = within(focus).getByLabelText("Value");
    await user.clear(value);
    await user.type(value, "Regional Air Europe");
    await user.click(within(focus).getByRole("button", { name: "Save" }));
    expect(setFieldValue).toHaveBeenCalledWith({
      candidatureId: regionalId,
      fieldId: organisationId,
      value: "Regional Air Europe",
    });

    await user.click(within(selected).getByRole("button", { name: "← Applications" }));
    expect(await screen.findByRole("heading", { name: "Focus" })).toBeInTheDocument();
  });

  it("shows retained and missing fields in one collection with no ordinary customization panel", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await openRegionalRecord(user);

    const information = screen.getByRole("region", { name: "Candidature information" });
    expect(within(information).getByRole("heading", { name: "Organisation" })).toBeInTheDocument();
    expect(within(information).getByRole("heading", { name: "Minimum flight hours" })).toBeInTheDocument();
    expect(within(information).getByText("Not set")).toBeInTheDocument();
    expect(screen.queryByText("Customize available information")).not.toBeInTheDocument();
    expect(screen.queryByText("Information display & AI settings")).not.toBeInTheDocument();
  });

  it("adds a new kind of information from the field collection with the + flow", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await openRegionalRecord(user);

    await user.click(screen.getByRole("button", { name: "Add information" }));
    const form = screen.getByRole("form", { name: "Add information" });
    await user.type(within(form).getByLabelText("Name"), "Flight hours");
    await user.type(within(form).getByLabelText(/Details/), "Total logged hours");
    await user.click(within(form).getByRole("button", { name: "Add" }));

    expect(createField).toHaveBeenCalledWith({
      label: "Flight hours",
      description: "Total logged hours",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
    expect(updateFieldPreferences).toHaveBeenCalledWith(expect.objectContaining({
      fieldId: addedId,
      aiUseAllowed: true,
    }));
  });

  it("updates Focus visibility inline without changing AI-use permission", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await openRegionalRecord(user);

    const information = screen.getByRole("region", { name: "Candidature information" });
    const fieldCard = within(information).getByRole("heading", { name: "Minimum flight hours" }).closest("article");
    if (!fieldCard) throw new Error("Field card missing");
    await user.click(within(fieldCard).getByRole("button", { name: "Edit Minimum flight hours" }));
    const focusVisible = within(fieldCard).getByRole("checkbox", { name: "Show in Focus" });
    expect(focusVisible).not.toBeChecked();
    await user.click(focusVisible);

    expect(updateFieldPreferences).toHaveBeenCalledWith({
      ...hours.preferences,
      focusVisible: true,
      fieldId: hoursId,
    });
  });

  it("renders only attached Tags until the user searches a glossary of hundreds", async () => {
    cleanup();
    vi.clearAllMocks();
    const manyTags: TagRecord[] = Array.from({ length: 400 }, (_, index) => ({
      id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      name: `Skill ${String(index + 1).padStart(3, "0")}`,
      definition: `Definition ${index + 1}`,
      notes: "",
      aliases: [`alias-${index + 1}`],
    }));
    installApi([platformTag, ...manyTags]);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await openRegionalRecord(user);

    const tags = screen.getByRole("region", { name: "Tags" });
    const attached = within(tags).getByLabelText("Attached Tags");
    expect(within(attached).getByRole("button", { name: "Platform" })).toBeInTheDocument();
    expect(within(tags).queryByText("Skill 001")).not.toBeInTheDocument();
    expect(within(tags).queryAllByRole("checkbox")).toHaveLength(0);

    await user.type(within(tags).getByRole("searchbox", { name: "Find or create Tag" }), "Skill");
    const results = within(tags).getByLabelText("Tag search results");
    expect(within(results).getAllByRole("button", { name: /^Attach Skill/ })).toHaveLength(8);
    expect(within(tags).queryByText("Skill 009")).not.toBeInTheDocument();

    await user.clear(within(tags).getByRole("searchbox", { name: "Find or create Tag" }));
    await user.type(within(tags).getByRole("searchbox", { name: "Find or create Tag" }), "Novel capability");
    expect(within(tags).getByRole("button", { name: "Create “Novel capability”" })).toBeInTheDocument();
  });

  it("keeps the attached shared Tag editable from the application", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await openRegionalRecord(user);

    const tags = screen.getByRole("region", { name: "Tags" });
    await user.click(within(tags).getByRole("button", { name: "Platform" }));
    await user.click(within(tags).getByRole("button", { name: "Edit shared Tag" }));
    const notes = within(tags).getByLabelText(/Notes/);
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
  });
});
