import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  ConceptRecord,
  DesktopApi,
} from "../src/shared/contracts";
import type { FocusMaterialPreferences } from "../src/shared/focus-contracts";

const candidatureId = "00000000-0000-4000-8000-000000000501";
const organisationId = "00000000-0000-4000-8000-000000000502";
const hoursId = "00000000-0000-4000-8000-000000000503";
const workModesId = "00000000-0000-4000-8000-000000000504";
const remoteId = "00000000-0000-4000-8000-000000000505";
const hybridId = "00000000-0000-4000-8000-000000000506";

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
      createdAt: "2026-09-04T00:00:00.000Z",
      updatedAt: "2026-09-04T00:00:00.000Z",
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
const workModes: CandidatureFieldConfiguration = {
  definition: {
    id: workModesId,
    systemKey: null,
    label: "Work modes",
    description: "Allowed work modes",
    valueType: "choice",
    cardinality: "many",
    choices: [
      { id: remoteId, label: "Remote" },
      { id: hybridId, label: "Hybrid" },
    ],
    enabled: true,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  },
  preferences: {
    fieldId: workModesId,
    focusVisible: false,
    focusOrder: null,
    focusProminence: "normal",
    identityOrder: null,
    aiDiscovery: false,
    aiContextMode: "omit",
  },
};

const conceptA: ConceptRecord = {
  id: "00000000-0000-4000-8000-000000000508",
  name: "Platform",
  definition: "Platform engineering",
  notes: "Remember the ownership boundaries.",
  aliases: [],
};
const conceptB: ConceptRecord = {
  id: "00000000-0000-4000-8000-000000000509",
  name: "Reliability",
  definition: "Reliable systems",
  aliases: [],
};

function record(values: CandidatureRecord["values"]): CandidatureRecord {
  return {
    id: candidatureId,
    archived: false,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    label: "Regional Air",
    sourceSearchText: "",
    values,
    documentIds: [],
    conceptIds: [],
  };
}

const retainedOrganisation = {
  candidatureId,
  fieldId: organisationId,
  value: "Regional Air",
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
} as const;

const retainedHours = {
  candidatureId,
  fieldId: hoursId,
  value: 1500,
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
} as const;

const list = vi.fn();
const listFields = vi.fn();
const listConcepts = vi.fn();
const createField = vi.fn();
const setFieldValue = vi.fn();
const updateConcept = vi.fn();
const filter = vi.fn();

function installApi(initial: CandidatureRecord) {
  list.mockResolvedValue([initial]);
  listFields.mockResolvedValue([organisation, hours, workModes]);
  listConcepts.mockResolvedValue([]);
  createField.mockImplementation(async (input) => ({
    ...field("00000000-0000-4000-8000-000000000507", input.label, input.valueType, false),
    definition: {
      ...field("00000000-0000-4000-8000-000000000507", input.label, input.valueType, false).definition,
      description: input.description,
      cardinality: input.cardinality,
      choices: input.choices,
      enabled: input.enabled,
    },
  }));
  setFieldValue.mockImplementation(async ({ fieldId, value }) =>
    record([
      retainedOrganisation,
      {
        candidatureId,
        fieldId,
        value,
        createdAt: "2026-09-04T00:00:00.000Z",
        updatedAt: "2026-09-04T00:00:00.000Z",
      },
    ]),
  );
  updateConcept.mockImplementation(async (input) => input);
  filter.mockResolvedValue([candidatureId]);

  const api = {
    candidatures: {
      list,
      listFields,
      create: vi.fn(),
      update: vi.fn(),
      filter,
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
      listConcepts,
      createConcept: vi.fn(),
      updateConcept,
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
      update: vi.fn().mockImplementation(async (preferences: FocusMaterialPreferences) => preferences),
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

describe("candidature progressive information workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApi(record([retainedOrganisation]));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows compact retained-information and Source cues so multiple candidatures are recognizable", async () => {
    list.mockResolvedValueOnce([
      record([retainedOrganisation, retainedHours]),
      {
        id: "00000000-0000-4000-8000-000000000510",
        archived: false,
        createdAt: "2026-09-04T00:00:00.000Z",
        updatedAt: "2026-09-04T00:00:00.000Z",
        label: "Nimbus Labs",
        sourceSearchText: "Remote platform role in Barcelona",
        values: [],
        documentIds: [],
        conceptIds: [],
      },
    ]);

    render(<CandidaturesWorkspace />);
    await screen.findByRole("region", { name: "Candidature Focus" });

    const collection = screen.getByRole("complementary", { name: "Candidature list" });
    const regionalAir = within(collection).getByRole("button", { name: /Regional Air/ });
    expect(regionalAir).toHaveTextContent("Minimum flight hours");
    expect(regionalAir).toHaveTextContent("1500");
    expect(regionalAir).not.toHaveTextContent("OrganisationRegional Air");

    const nimbus = within(collection).getByRole("button", { name: /Nimbus Labs/ });
    expect(nimbus).toHaveTextContent("Source");
    expect(nimbus).toHaveTextContent("Remote platform role in Barcelona");
  });

  it("projects only retained configured Focus information and adds missing information on demand", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    const focus = await screen.findByRole("region", { name: "Candidature Focus" });
    const organisationHeading = within(focus).getByRole("heading", { name: "Organisation" });
    expect(organisationHeading).toBeInTheDocument();
    expect(organisationHeading.parentElement).toHaveTextContent("Regional Air");
    expect(within(focus).queryByRole("heading", { name: "Minimum flight hours" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Information" }));
    expect(screen.getByRole("heading", { name: "Organisation" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Minimum flight hours" })).not.toBeInTheDocument();

    await user.click(screen.getByText("+ Add information"));
    await user.selectOptions(screen.getByLabelText("Choose information to add"), hoursId);
    const addPanel = screen.getByText("+ Add information").parentElement;
    expect(addPanel).not.toBeNull();
    if (!addPanel) return;
    const input = within(addPanel).getByRole("spinbutton");
    await user.type(input, "1500");
    await user.click(within(addPanel).getByRole("button", { name: "Save" }));

    expect(setFieldValue).toHaveBeenCalledWith({
      candidatureId,
      fieldId: hoursId,
      value: 1500,
    });
    expect(await screen.findByRole("heading", { name: "Minimum flight hours" })).toBeInTheDocument();
  });

  it("adds unlisted information without making schema terminology part of the ordinary interaction", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await screen.findByRole("region", { name: "Candidature Focus" });
    await user.click(screen.getByRole("tab", { name: "Information" }));
    await user.click(screen.getByText("+ Add information"));
    await user.click(screen.getByText("+ Add something not listed"));

    expect(screen.queryByText("Field", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Type", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Cardinality", { exact: true })).not.toBeInTheDocument();

    const name = screen.getByLabelText("What is it?");
    await user.type(name, "Type rating");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(createField).toHaveBeenCalledWith({
      label: "Type rating",
      description: "",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
  });

  it("keeps an unsaved add-value draft when changing the selected information is declined", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await screen.findByRole("region", { name: "Candidature Focus" });
    await user.click(screen.getByRole("tab", { name: "Information" }));
    await user.click(screen.getByText("+ Add information"));

    const fieldSelect = screen.getByLabelText("Choose information to add");
    await user.selectOptions(fieldSelect, hoursId);
    const input = screen.getByRole("spinbutton");
    await user.type(input, "1500");
    await user.selectOptions(fieldSelect, workModesId);

    expect(confirm).toHaveBeenCalledWith("Discard unsaved information value edits?");
    expect(fieldSelect).toHaveValue(hoursId);
    expect(screen.getByRole("spinbutton")).toHaveValue(1500);
  });

  it("keeps an unsaved advanced-information draft when switching settings is declined", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await screen.findByRole("region", { name: "Candidature Focus" });
    await user.click(screen.getByRole("tab", { name: "Information" }));
    await user.click(screen.getByText("Advanced information settings"));

    const management = screen.getByText("Advanced information settings").parentElement;
    if (!management) throw new Error("Information settings surface missing");
    const managementField = within(management).getByLabelText("Kind of information");
    await user.selectOptions(managementField, organisationId);
    const label = within(management).getByLabelText("Name");
    await user.clear(label);
    await user.type(label, "Unsaved organisation label");
    await user.selectOptions(managementField, hoursId);

    expect(confirm).toHaveBeenCalledWith("Discard unsaved information settings?");
    expect(managementField).toHaveValue(organisationId);
    expect(within(management).getByLabelText("Name")).toHaveValue("Unsaved organisation label");
  });

  it("loads and saves existing shared Concept notes through normal maintenance", async () => {
    listConcepts.mockResolvedValueOnce([conceptA]);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await screen.findByRole("region", { name: "Candidature Focus" });
    await user.click(screen.getByText("Concepts", { selector: "summary" }));
    await user.click(screen.getByRole("button", { name: "Edit concept" }));

    const notes = screen.getByLabelText("Notes");
    expect(notes).toHaveValue("Remember the ownership boundaries.");
    await user.clear(notes);
    await user.type(notes, "Ask how platform ownership is divided.");
    await user.click(screen.getByRole("button", { name: "Save concept" }));

    expect(updateConcept).toHaveBeenCalledWith({
      id: conceptA.id,
      name: conceptA.name,
      definition: conceptA.definition,
      notes: "Ask how platform ownership is divided.",
      aliases: conceptA.aliases,
    });
  });

  it("keeps an unsaved concept-note draft when switching or cancelling the concept editor is declined", async () => {
    listConcepts.mockResolvedValueOnce([conceptA, conceptB]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await screen.findByRole("region", { name: "Candidature Focus" });
    await user.click(screen.getByText("Concepts", { selector: "summary" }));

    const editConcepts = screen.getAllByRole("button", { name: "Edit concept" });
    const firstConcept = editConcepts[0];
    const secondConcept = editConcepts[1];
    if (!firstConcept || !secondConcept) throw new Error("Concept edit controls missing");
    await user.click(firstConcept);
    const notes = screen.getByLabelText("Notes");
    await user.clear(notes);
    await user.type(notes, "Unsaved ownership note");
    await user.click(secondConcept);

    expect(confirm).toHaveBeenCalledWith("Discard unsaved concept edits?");
    expect(screen.getByLabelText("Notes")).toHaveValue("Unsaved ownership note");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Notes")).toHaveValue("Unsaved ownership note");
  });

  it("delegates field filtering by stable runtime field ID and operator", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await screen.findByRole("region", { name: "Candidature Focus" });

    await user.selectOptions(screen.getByLabelText("Information kind"), hoursId);
    await user.selectOptions(screen.getByLabelText("Operator"), "greater_than_or_equal");
    await user.type(screen.getByLabelText("Value"), "1200");
    await user.click(screen.getByRole("button", { name: "Apply information filter" }));

    expect(filter).toHaveBeenCalledWith({
      fieldId: hoursId,
      operator: "greater_than_or_equal",
      value: 1200,
    });
  });

  it("lets many-choice filters submit multiple selected choice IDs", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await screen.findByRole("region", { name: "Candidature Focus" });

    await user.selectOptions(screen.getByLabelText("Information kind"), workModesId);
    await user.selectOptions(screen.getByLabelText("Operator"), "contains_all");
    const values = screen.getByRole("group", { name: "Values" });
    await user.click(within(values).getByLabelText("Remote"));
    await user.click(within(values).getByLabelText("Hybrid"));
    await user.click(screen.getByRole("button", { name: "Apply information filter" }));

    const request = filter.mock.calls.at(-1)?.[0] as
      | { fieldId: string; operator: string; value: string[] }
      | undefined;
    expect(request).toMatchObject({
      fieldId: workModesId,
      operator: "contains_all",
    });
    expect(request?.value).toHaveLength(2);
    expect(request?.value).toEqual(expect.arrayContaining([remoteId, hybridId]));
  });
});
