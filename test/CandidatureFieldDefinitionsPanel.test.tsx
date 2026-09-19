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
  aiUseAllowed = false,
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
      favourite: false,
      favouriteOrder: null,
      presentationSize: "normal",
      aiUseAllowed,
    },
  };
}

let fields: CandidatureFieldConfiguration[];
const createField = vi.fn();
const updateFieldPreferences = vi.fn();

function installApi() {
  fields = [configuredField(roleId, "Role", "role")];

  createField.mockImplementation(async (input) => {
    const base = configuredField(flightHoursId, input.label, null, input.valueType);
    const created: CandidatureFieldConfiguration = {
      ...base,
      definition: {
        ...base.definition,
        description: input.description,
        cardinality: input.cardinality,
        choices: input.choices,
        enabled: input.enabled,
      },
    };
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
        createField,
        updateFieldPreferences,
        deleteField: vi.fn().mockResolvedValue([]),
      },
    } as unknown as DesktopApi,
  });
}

describe("candidature information creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("does not mutate the field model merely because the add-information control is mounted", async () => {
    render(<CandidatureFieldDefinitionsPanel onChanged={vi.fn()} />);
    await screen.findByRole("button", { name: "Add information" });
    expect(createField).not.toHaveBeenCalled();
    expect(updateFieldPreferences).not.toHaveBeenCalled();
  });

  it("uses one direct + add-information path instead of a separate customization workflow", async () => {
    const user = userEvent.setup();
    render(<CandidatureFieldDefinitionsPanel onChanged={vi.fn()} />);

    expect(screen.queryByText("Customize available information")).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Add information" }));

    const creator = screen.getByRole("form", { name: "Add information" });
    expect(within(creator).getByLabelText("Name")).toBeVisible();
    expect(within(creator).getByLabelText(/Details/)).toBeVisible();
    expect(within(creator).queryByText("reusable field definitions", { exact: false })).not.toBeInTheDocument();
  });

  it("adds profession-specific information without a second hidden preference mutation", async () => {
    const user = userEvent.setup();
    const changed = vi.fn();
    render(<CandidatureFieldDefinitionsPanel onChanged={changed} />);

    await user.click(await screen.findByRole("button", { name: "Add information" }));
    const creator = screen.getByRole("form", { name: "Add information" });
    await user.type(within(creator).getByLabelText("Name"), "Flight hours");
    await user.type(within(creator).getByLabelText(/Details/), "Hours required by the operator");
    await user.click(within(creator).getByText("Value format", { selector: "summary" }));
    await user.selectOptions(within(creator).getByLabelText("Format"), "number");
    await user.click(within(creator).getByRole("button", { name: "Add" }));

    expect(createField).toHaveBeenCalledWith(expect.objectContaining({
      label: "Flight hours",
      description: "Hours required by the operator",
      valueType: "number",
    }));
    expect(updateFieldPreferences).not.toHaveBeenCalled();
    expect(changed).toHaveBeenCalled();
  });
});
