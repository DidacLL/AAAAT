import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CandidatureFocusPanel } from "../src/renderer/CandidatureFocusPanel";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  TagRecord,
} from "../src/shared/contracts";

const timestamp = "2026-09-06T10:00:00.000Z";
const candidatureId = "00000000-0000-4000-8000-000000000301";
const roleFieldId = "00000000-0000-4000-8000-000000000302";
const hiddenFieldId = "00000000-0000-4000-8000-000000000303";
const tagId = "00000000-0000-4000-8000-000000000501";

const candidature: CandidatureRecord = {
  id: candidatureId,
  archived: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  label: "Platform engineer",
  sourceSearchText: "retained raw material",
  values: [
    {
      candidatureId,
      fieldId: roleFieldId,
      value: "Staff Platform Engineer",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      candidatureId,
      fieldId: hiddenFieldId,
      value: "Private complete-edit detail",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  documentIds: [],
  tagIds: [tagId],
};

const roleField: CandidatureFieldConfiguration = {
  definition: {
    id: roleFieldId,
    systemKey: null,
    label: "Role",
    description: "Opportunity role",
    valueType: "text",
    cardinality: "one",
    choices: [],
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  preferences: {
    fieldId: roleFieldId,
    focusVisible: true,
    focusOrder: 0,
    focusProminence: "normal",
    identityOrder: null,
    aiDiscovery: false,
    aiContextMode: "omit",
  },
};

const hiddenField: CandidatureFieldConfiguration = {
  ...roleField,
  definition: {
    ...roleField.definition,
    id: hiddenFieldId,
    label: "Internal detail",
  },
  preferences: {
    ...roleField.preferences,
    fieldId: hiddenFieldId,
    focusVisible: false,
  },
};

const tag: TagRecord = {
  id: tagId,
  name: "Incident response",
  definition: "Handling production incidents deliberately.",
  notes: "Use the payment outage example.",
  aliases: ["IR"],
};

function renderFocus() {
  const onSelectTag = vi.fn();
  const onSaveValue = vi.fn().mockResolvedValue(undefined);
  const onClearValue = vi.fn().mockResolvedValue(undefined);
  const onDiscoverValue = vi.fn();
  const onDirtyChange = vi.fn();
  render(
    <CandidatureFocusPanel
      record={candidature}
      fields={[roleField, hiddenField]}
      tags={[tag]}
      selectedTagId={tagId}
      onSelectTag={onSelectTag}
      onSaveValue={onSaveValue}
      onClearValue={onClearValue}
      onDiscoverValue={onDiscoverValue}
      onDirtyChange={onDirtyChange}
    />,
  );
  return { onSelectTag, onSaveValue, onClearValue, onDiscoverValue, onDirtyChange };
}

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe("selected candidature Focus", () => {
  it("shows only Focus-selected retained information and keeps displayed values lightweight-editable", async () => {
    const user = userEvent.setup();
    renderFocus();

    const focus = screen.getByRole("region", { name: "Selected candidature Focus" });
    expect(within(focus).getByRole("heading", { name: "Platform engineer" })).toBeInTheDocument();
    expect(within(focus).getByRole("heading", { name: "Role" })).toBeInTheDocument();
    expect(within(focus).getByText("Staff Platform Engineer")).toBeInTheDocument();
    expect(within(focus).queryByText("Private complete-edit detail")).not.toBeInTheDocument();

    await user.click(within(focus).getByRole("button", { name: "Edit" }));
    expect(within(focus).getByRole("textbox")).toHaveValue("Staff Platform Engineer");
  });

  it("surfaces associated Tag definition, aliases and notes without Concept-era maintenance UI", async () => {
    const { onSelectTag } = renderFocus();

    const tags = screen.getByRole("region", { name: "Tags" });
    expect(within(tags).getByRole("button", { name: "Incident response" })).toBeInTheDocument();
    expect(within(tags).getByText(tag.definition)).toBeInTheDocument();
    expect(within(tags).getByText(/Aliases:/)).toHaveTextContent("IR");
    expect(within(tags).getByText(/Notes:/)).toHaveTextContent(tag.notes ?? "");
    expect(screen.queryByText(/Concept/i)).not.toBeInTheDocument();

    await userEvent.setup().click(within(tags).getByRole("button", { name: "Incident response" }));
    expect(onSelectTag).toHaveBeenCalledWith(tagId);
  });

  it("does not reintroduce Sources, reminders, documents or Activity as default Focus blocks", () => {
    renderFocus();

    expect(screen.queryByRole("region", { name: "Sources" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Reminders" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Application material" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Activity" })).not.toBeInTheDocument();
  });
});
