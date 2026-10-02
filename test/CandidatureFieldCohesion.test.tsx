import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/contextual-handoffs", () => ({
  useContextualHandoffs: () => ({
    documentHandoff: null,
    openDocumentFromCandidature: vi.fn(),
  }),
}));
vi.mock("../src/renderer/CandidatureBulkAiReview", () => ({ CandidatureBulkAiReview: () => null }));
vi.mock("../src/renderer/CandidatureFieldAiState", () => ({ CandidatureFieldAiState: () => null }));
vi.mock("../src/renderer/CandidatureOfferPanel", () => ({ CandidatureOfferPanel: () => null }));
vi.mock("../src/renderer/CandidatureSourcesPanel", () => ({ CandidatureSourcesPanel: () => null }));
vi.mock("../src/renderer/CandidatureOpportunityResearchAccessPanel", () => ({
  CandidatureOpportunityResearchAccessPanel: () => null,
}));

import { CandidatureFieldDefinitionsPanel } from "../src/renderer/CandidatureFieldDefinitionsPanel";
import { CandidatureFieldValueEditor } from "../src/renderer/CandidatureFieldValueEditor";
import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
} from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000003650";
const roleId = "00000000-0000-4000-8000-000000003651";
const companyId = "00000000-0000-4000-8000-000000003652";
const locationId = "00000000-0000-4000-8000-000000003653";
const choiceRemoteId = "00000000-0000-4000-8000-000000003654";
const choiceOfficeId = "00000000-0000-4000-8000-000000003655";

function field(
  id: string,
  label: string,
  options: Partial<{
    valueType: CandidatureFieldConfiguration["definition"]["valueType"];
    cardinality: CandidatureFieldConfiguration["definition"]["cardinality"];
    favourite: boolean;
    favouriteOrder: number | null;
    aiUseAllowed: boolean;
  }> = {},
): CandidatureFieldConfiguration {
  const valueType = options.valueType ?? "text";
  return {
    definition: {
      id,
      systemKey: null,
      label,
      description: `${label} details`,
      valueType,
      cardinality: options.cardinality ?? "one",
      choices: valueType === "choice"
        ? [
            { id: choiceRemoteId, label: "Remote" },
            { id: choiceOfficeId, label: "Office" },
          ]
        : [],
      enabled: true,
      createdAt: "2026-09-27T00:00:00.000Z",
      updatedAt: "2026-09-27T00:00:00.000Z",
    },
    preferences: {
      fieldId: id,
      favourite: options.favourite ?? false,
      favouriteOrder: options.favouriteOrder ?? null,
      presentationSize: "normal",
      aiUseAllowed: options.aiUseAllowed ?? true,
    },
  };
}

function record(values: ReadonlyArray<{ fieldId: string; value: CandidatureRuntimeValue }> = []): CandidatureRecord {
  return {
    id: candidatureId,
    archived: false,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    sourceSearchText: "",
    values: values.map(({ fieldId, value }) => ({
      candidatureId,
      fieldId,
      value,
      createdAt: "2026-09-27T00:00:00.000Z",
      updatedAt: "2026-09-27T00:00:00.000Z",
    })),
    tagIds: [],
  };
}

const emptyCollections = {
  templates: [],
  workingCvs: [],
  renderedCvs: [],
  letters: [],
  renderedLetters: [],
  applicationPackets: [],
};

function installWorkspaceApi() {
  let configurations = [
    field(roleId, "Role", { favourite: true, favouriteOrder: 0 }),
    field(companyId, "Company", { favourite: true, favouriteOrder: 1 }),
    field(locationId, "Location"),
  ];
  let stored = record([
    { fieldId: roleId, value: "Platform Engineer" },
    { fieldId: companyId, value: "Acme" },
  ]);

  const updateFieldPreferences = vi.fn(async (input: CandidatureFieldConfiguration["preferences"]) => {
    const current = configurations.find((candidate) => candidate.definition.id === input.fieldId)!;
    const updated = { ...current, preferences: { ...input } };
    configurations = configurations.map((candidate) => candidate.definition.id === input.fieldId ? updated : candidate);
    return updated;
  });
  const reorderFavouriteFields = vi.fn(async (orderedIds: readonly string[]) => {
    configurations = configurations.map((candidate) => {
      const order = orderedIds.indexOf(candidate.definition.id);
      return order < 0
        ? candidate
        : { ...candidate, preferences: { ...candidate.preferences, favouriteOrder: order } };
    });
    return configurations;
  });
  const updateField = vi.fn(async (input: {
    id: string;
    label: string;
    description: string;
  }) => {
    const current = configurations.find((candidate) => candidate.definition.id === input.id)!;
    const updated = {
      ...current,
      definition: {
        ...current.definition,
        label: input.label,
        description: input.description,
      },
    };
    configurations = configurations.map((candidate) => candidate.definition.id === input.id ? updated : candidate);
    return updated;
  });
  const setFieldValue = vi.fn(async ({ fieldId, value }: { fieldId: string; value: CandidatureRuntimeValue }) => {
    stored = {
      ...stored,
      values: [
        ...stored.values.filter((candidate) => candidate.fieldId !== fieldId),
        {
          candidatureId,
          fieldId,
          value,
          createdAt: "2026-09-27T00:00:00.000Z",
          updatedAt: "2026-09-27T00:00:00.000Z",
        },
      ],
    };
    return stored;
  });
  const clearFieldValue = vi.fn(async ({ fieldId }: { fieldId: string }) => {
    stored = { ...stored, values: stored.values.filter((candidate) => candidate.fieldId !== fieldId) };
    return stored;
  });

  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: {
        list: vi.fn(async () => [stored]),
        listFields: vi.fn(async () => configurations),
        listTags: vi.fn(async () => []),
        listSources: vi.fn(async () => []),
        setFieldValue,
        clearFieldValue,
        updateFieldPreferences,
        reorderFavouriteFields,
        updateField,
        createField: vi.fn(),
      },
      candidatureSearch: { search: vi.fn(async () => []) },
      documentDomain: { collections: vi.fn(async () => emptyCollections) },
    },
  });

  return { updateFieldPreferences, reorderFavouriteFields, updateField, setFieldValue, clearFieldValue };
}

async function openWorkspace(user: ReturnType<typeof userEvent.setup>) {
  render(<CandidaturesWorkspace />);
  await user.click(await screen.findByRole("button", { name: "Inspect saved application" }));
  await user.click(screen.getByRole("button", { name: "Open application" }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("candidature field cohesion", () => {
  it.each([
    ["short text", field(roleId, "Short text"), "Engineer", "Engineer", "INPUT", "text"],
    ["long text", field(roleId, "Long text", { valueType: "long_text" }), "Line one\nLine two", "Line one", "TEXTAREA", null],
    ["number", field(roleId, "Number", { valueType: "number" }), 42, "42", "INPUT", "number"],
    ["boolean", field(roleId, "Boolean", { valueType: "boolean" }), true, "Yes", "SELECT", null],
    ["date", field(roleId, "Date", { valueType: "date" }), "2026-09-27", "2026-09-27", "INPUT", "date"],
    ["URL", field(roleId, "URL", { valueType: "url" }), "https://example.com", "https://example.com", "INPUT", "url"],
    ["choice", field(roleId, "Choice", { valueType: "choice" }), choiceRemoteId, "Remote", "SELECT", null],
    ["many values", field(roleId, "Skills", { cardinality: "many" }), ["TypeScript", "Rust"], "TypeScript, Rust", "TEXTAREA", null],
  ])("keeps %s readable and editable", async (_name, configuration, value, expectedText, tagName, inputType) => {
    const user = userEvent.setup();
    render(
      <CandidatureFieldValueEditor
        field={configuration as CandidatureFieldConfiguration}
        value={value as CandidatureRuntimeValue}
        onSave={vi.fn(async () => undefined)}
        onClear={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText(expectedText as string, { exact: false })).toBeVisible();
    await user.click(screen.getByRole("button", { name: `Edit ${(configuration as CandidatureFieldConfiguration).definition.label}` }));
    const control = screen.getByLabelText("Value");
    expect(control.tagName).toBe(tagName);
    if (inputType) expect(control).toHaveAttribute("type", inputType);
  });

  it("keeps value editing primary while details remain deliberate and Save, Clear and Cancel retain their contracts", async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => undefined);
    const clear = vi.fn(async () => undefined);
    const updateField = vi.fn(async () => undefined);
    const dirty = vi.fn();
    render(
      <CandidatureFieldValueEditor
        field={field(roleId, "Role")}
        value="Platform Engineer"
        onSave={save}
        onClear={clear}
        onDiscover={vi.fn()}
        onUpdateField={updateField}
        onDirtyChange={dirty}
      />,
    );

    expect(screen.queryByRole("button", { name: "AI may use this information" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask AI to fill Role" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Edit Role" }));
    expect(screen.getByLabelText("Value")).toHaveValue("Platform Engineer");
    const detailsDisclosure = screen.getByText("Edit information details").closest("details");
    expect(detailsDisclosure).not.toHaveAttribute("open");

    await user.click(screen.getByText("Edit information details"));
    expect(detailsDisclosure).toHaveAttribute("open");
    const name = screen.getByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "Target role");
    const value = screen.getByLabelText("Value");
    await user.clear(value);
    await user.type(value, "Staff Engineer");
    expect(dirty).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Platform Engineer")).toBeVisible();
    expect(save).not.toHaveBeenCalled();
    expect(updateField).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Edit Role" }));
    await user.clear(screen.getByLabelText("Value"));
    await user.type(screen.getByLabelText("Value"), "Staff Engineer");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("Staff Engineer"));

    await user.click(screen.getByRole("button", { name: "Edit Role" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(clear).toHaveBeenCalledTimes(1));
  });

  it("uses the same read-first field object in Primary and remaining information and coordinates options, permission and one dirty editor", async () => {
    const api = installWorkspaceApi();
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await openWorkspace(user);

    const primary = screen.getByRole("region", { name: "Starred application information" });
    let roleCard = within(primary).getByRole("article", { name: "Role information" });
    expect(within(roleCard).getByText("Platform Engineer")).toBeVisible();
    expect(within(roleCard).getByRole("button", { name: "Edit Role" })).toBeVisible();
    expect(within(roleCard).getByRole("button", { name: "AI may use this information" })).toHaveAttribute("aria-pressed", "true");
    expect(within(roleCard).getByText("Field options")).toBeVisible();
    expect(within(roleCard).queryByLabelText("Value")).not.toBeInTheDocument();

    expect(screen.getByRole("region", { name: "Tags" })).toBeVisible();
    const remaining = screen.getByRole("region", { name: "Remaining application information" });
    expect(screen.queryByText("More", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Application documents" })).not.toBeVisible();
    await user.click(screen.getByText("Sources, documents & history"));
    expect(screen.getByRole("region", { name: "Application documents" })).toBeVisible();
    let locationCard = within(remaining).getByRole("article", { name: "Location information" });
    expect(within(locationCard).getByText("Not set")).toBeVisible();
    expect(within(locationCard).getByRole("button", { name: "Edit Location" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "AI may use this information" })).toHaveLength(3);

    await user.click(within(locationCard).getByRole("button", { name: "AI may use this information" }));
    await waitFor(() => expect(api.updateFieldPreferences).toHaveBeenCalledWith(expect.objectContaining({
      fieldId: locationId,
      aiUseAllowed: false,
    })));
    locationCard = within(remaining).getByRole("article", { name: "Location information" });
    expect(within(locationCard).queryByRole("button", { name: "Ask AI to fill Location" })).not.toBeInTheDocument();

    await user.click(within(roleCard).getByRole("button", { name: "Edit Role" }));
    await user.clear(within(roleCard).getByLabelText("Value"));
    await user.type(within(roleCard).getByLabelText("Value"), "Unsaved role");

    await user.click(screen.getByRole("button", { name: "← Applications" }));
    expect(confirm).toHaveBeenCalledWith("Discard unsaved application edits?");
    expect(screen.getByRole("region", { name: "Application information" })).toBeVisible();
    confirm.mockClear();

    const companyCard = within(primary).getByRole("article", { name: "Company information" });
    await user.click(within(companyCard).getByRole("button", { name: "Edit Company" }));
    expect(confirm).toHaveBeenCalledWith("Discard unsaved changes to Role?");
    expect(within(roleCard).getByLabelText("Value")).toHaveValue("Unsaved role");
    expect(within(companyCard).queryByLabelText("Value")).not.toBeInTheDocument();

    confirm.mockReturnValue(true);
    await user.click(within(companyCard).getByRole("button", { name: "Edit Company" }));
    expect(screen.getAllByLabelText("Value")).toHaveLength(1);
    expect(within(companyCard).getByLabelText("Value")).toHaveValue("Acme");
    expect(within(roleCard).queryByLabelText("Value")).not.toBeInTheDocument();
    await user.click(within(companyCard).getByRole("button", { name: "Cancel" }));

    roleCard = within(primary).getByRole("article", { name: "Role information" });
    await user.click(within(roleCard).getByText("Field options"));
    await user.selectOptions(within(roleCard).getByLabelText("Role card size"), "wide");
    await waitFor(() => expect(api.updateFieldPreferences).toHaveBeenCalledWith(expect.objectContaining({
      fieldId: roleId,
      presentationSize: "wide",
    })));

    const companyCardAfter = within(primary).getByRole("article", { name: "Company information" });
    await user.click(within(companyCardAfter).getByText("Field options"));
    await user.click(within(companyCardAfter).getByRole("button", { name: "Move Company earlier" }));
    await waitFor(() => expect(api.reorderFavouriteFields).toHaveBeenCalledWith([companyId, roleId]));

    locationCard = within(remaining).getByRole("article", { name: "Location information" });
    await user.click(within(locationCard).getByText("Field options"));
    await user.click(within(locationCard).getByRole("button", { name: "Show in primary information" }));
    await waitFor(() => {
      expect(within(primary).getByRole("article", { name: "Location information" })).toBeVisible();
    });
    expect(within(remaining).queryByRole("article", { name: "Location information" })).not.toBeInTheDocument();
  });

  it("keeps existing-field label and description editing reachable without making it part of ordinary value edit", async () => {
    const api = installWorkspaceApi();
    const user = userEvent.setup();
    await openWorkspace(user);

    const card = screen.getByRole("article", { name: "Role information" });
    await user.click(within(card).getByRole("button", { name: "Edit Role" }));
    const detailsDisclosure = within(card).getByText("Edit information details").closest("details");
    expect(detailsDisclosure).not.toHaveAttribute("open");
    await user.click(within(card).getByText("Edit information details"));
    expect(detailsDisclosure).toHaveAttribute("open");
    const name = within(card).getByRole("textbox", { name: "Name" });
    const details = within(card).getByRole("textbox", { name: /Details/i });
    await user.clear(name);
    await user.type(name, "Target role");
    await user.clear(details);
    await user.type(details, "Role being pursued");
    await user.click(within(card).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(api.updateField).toHaveBeenCalledWith(expect.objectContaining({
      id: roleId,
      label: "Target role",
      description: "Role being pursued",
      valueType: "text",
      cardinality: "one",
    })));
  });

  it("keeps Add information as the advanced new-field and value-format surface", async () => {
    const createField = vi.fn(async () => field(roleId, "Work model", { valueType: "choice", cardinality: "many" }));
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: { candidatures: { createField } },
    });
    const user = userEvent.setup();
    render(<CandidatureFieldDefinitionsPanel onChanged={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Add information" }));
    await user.type(screen.getByPlaceholderText("Flight hours"), "Work model");
    await user.type(screen.getByPlaceholderText("What this information means"), "Where the work is performed");
    await user.click(screen.getByText("Value format"));
    await user.selectOptions(screen.getByLabelText("Format"), "choice");
    await user.selectOptions(screen.getByLabelText("Values"), "many");
    const option = screen.getByLabelText("Option 1");
    await user.clear(option);
    await user.type(option, "Remote");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(createField).toHaveBeenCalledWith(expect.objectContaining({
      label: "Work model",
      description: "Where the work is performed",
      valueType: "choice",
      cardinality: "many",
      enabled: true,
      choices: [expect.objectContaining({ label: "Remote" })],
    })));
  });
});
