import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureFieldDefinitionsPanel } from "../src/renderer/CandidatureFieldDefinitionsPanel";
import type { CandidatureFieldConfiguration, DesktopApi } from "../src/shared/contracts";

const roleId = "00000000-0000-4000-8000-000000000801";
const flightHoursId = "00000000-0000-4000-8000-000000000802";
const now = "2026-09-13T00:00:00.000Z";

function configuredField(
  id: string,
  label: string,
  systemKey: string | null,
  valueType: CandidatureFieldConfiguration["definition"]["valueType"] = "text",
  aiDiscovery = false,
): CandidatureFieldConfiguration {
  return {
    definition: {
      id,
      systemKey,
      label,
      description: "",
      valueType,
      cardinality: "one",
      choices: [],
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
    preferences: {
      fieldId: id,
      focusVisible: false,
      focusOrder: null,
      focusProminence: "normal",
      identityOrder: null,
      aiDiscovery,
      aiContextMode: "omit",
    },
  };
}

let fields: CandidatureFieldConfiguration[];
const updateField = vi.fn();
const createField = vi.fn();
const updateFieldPreferences = vi.fn();

function installApi() {
  fields = [configuredField(roleId, "Role", "role")];

  updateField.mockImplementation(async (input) => {
    fields = fields.map((field) =>
      field.definition.id === input.id
        ? { ...field, definition: { ...field.definition, ...input, updatedAt: now } }
        : field,
    );
    return fields.find((field) => field.definition.id === input.id)!;
  });
  createField.mockImplementation(async (input) => {
    const created = configuredField(flightHoursId, input.label, null, input.valueType);
    created.definition.description = input.description;
    created.definition.cardinality = input.cardinality;
    created.definition.choices = input.choices;
    created.definition.enabled = input.enabled;
    fields = [...fields, created];
    return created;
  });
  updateFieldPreferences.mockImplementation(async (input) => {
    fields = fields.map((field) =>
      field.definition.id === input.fieldId ? { ...field, preferences: { ...input } } : field,
    );
    return fields.find((field) => field.definition.id === input.fieldId)!;
  });

  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: {
        listFields: vi.fn().mockImplementation(async () => [...fields]),
        updateField,
        createField,
        updateFieldPreferences,
        deleteField: vi.fn().mockResolvedValue([]),
      },
    } as unknown as DesktopApi,
  });
}

describe("candidature field definitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("lets the user adapt a shipped field instead of treating defaults as fixed ontology", async () => {
    const user = userEvent.setup();
    render(<CandidatureFieldDefinitionsPanel onChanged={vi.fn()} />);

    await user.click(await screen.findByText("Manage candidature fields", { selector: "summary" }));
    const editor = screen.getByRole("region", { name: "Edit candidature field" });
    await user.selectOptions(within(editor).getByLabelText("Field"), roleId);
    const name = within(editor).getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Position title");
    await user.click(within(editor).getByRole("button", { name: "Save field" }));

    expect(updateField).toHaveBeenCalledWith(expect.objectContaining({
      id: roleId,
      label: "Position title",
    }));
  });

  it("creates profession-specific typed fields and exposes them to AI extraction only when chosen", async () => {
    const user = userEvent.setup();
    render(<CandidatureFieldDefinitionsPanel onChanged={vi.fn()} />);

    await user.click(await screen.findByText("Manage candidature fields", { selector: "summary" }));
    const creator = screen.getByRole("region", { name: "Create candidature field" });
    await user.type(within(creator).getByLabelText("Name"), "Flight hours");
    await user.selectOptions(within(creator).getByLabelText("Type"), "number");
    await user.click(
      within(creator).getByRole("checkbox", {
        name: "AI extraction may propose this field from retained Sources",
      }),
    );
    await user.click(within(creator).getByRole("button", { name: "Add field" }));

    expect(createField).toHaveBeenCalledWith(expect.objectContaining({
      label: "Flight hours",
      valueType: "number",
    }));
    expect(updateFieldPreferences).toHaveBeenCalledWith(expect.objectContaining({
      fieldId: flightHoursId,
      aiDiscovery: true,
    }));
  });
});
