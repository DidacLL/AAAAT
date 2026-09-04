import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  DesktopApi,
} from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000501";
const organisationId = "00000000-0000-4000-8000-000000000502";
const hoursId = "00000000-0000-4000-8000-000000000503";

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

function record(values: CandidatureRecord["values"]): CandidatureRecord {
  return {
    id: candidatureId,
    archived: false,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    label: "Regional Air",
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

const list = vi.fn();
const listFields = vi.fn();
const createField = vi.fn();
const setFieldValue = vi.fn();
const filter = vi.fn();

function installApi(initial: CandidatureRecord) {
  list.mockResolvedValue([initial]);
  listFields.mockResolvedValue([organisation, hours]);
  createField.mockImplementation(async (input) => ({
    ...field("00000000-0000-4000-8000-000000000504", input.label, input.valueType, false),
    definition: {
      ...field("00000000-0000-4000-8000-000000000504", input.label, input.valueType, false).definition,
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
      listConcepts: vi.fn().mockResolvedValue([]),
      createConcept: vi.fn(),
      updateConcept: vi.fn(),
      setConcepts: vi.fn(),
    },
    documents: { list: vi.fn().mockResolvedValue([]) },
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

describe("candidature progressive information workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApi(record([retainedOrganisation]));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("projects only retained configured Focus information and adds a missing runtime field on demand", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    const focus = await screen.findByRole("region", { name: "Candidature Focus" });
    expect(within(focus).getByRole("heading", { name: "Organisation" })).toBeInTheDocument();
    expect(within(focus).getByText("Regional Air")).toBeInTheDocument();
    expect(within(focus).queryByRole("heading", { name: "Minimum flight hours" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Information" }));
    expect(screen.getByRole("heading", { name: "Organisation" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Minimum flight hours" })).not.toBeInTheDocument();

    await user.click(screen.getByText("+ Add information"));
    await user.selectOptions(screen.getByLabelText("Existing field"), hoursId);
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

  it("creates a new information field from the progressive surface without requiring another UI route", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await screen.findByRole("region", { name: "Candidature Focus" });
    await user.click(screen.getByRole("tab", { name: "Information" }));
    await user.click(screen.getByText("+ Add information"));
    await user.click(screen.getByText("+ New field"));

    const name = screen.getByPlaceholderText("Minimum flight hours");
    await user.type(name, "Type rating");
    await user.click(screen.getByRole("button", { name: "Create field" }));

    expect(createField).toHaveBeenCalledWith({
      label: "Type rating",
      description: "",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
    });
  });

  it("delegates field filtering by stable runtime field ID and operator", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await screen.findByRole("region", { name: "Candidature Focus" });

    await user.selectOptions(screen.getByLabelText("Field"), hoursId);
    await user.selectOptions(screen.getByLabelText("Operator"), "greater_than_or_equal");
    await user.type(screen.getByLabelText("Value"), "1200");
    await user.click(screen.getByRole("button", { name: "Apply field filter" }));

    expect(filter).toHaveBeenCalledWith({
      fieldId: hoursId,
      operator: "greater_than_or_equal",
      value: 1200,
    });
  });
});
