import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/contextual-handoffs", () => ({
  useContextualHandoffs: () => ({ openSettingsFor: vi.fn() }),
}));

import { CandidatureFieldAiState } from "../src/renderer/CandidatureFieldAiState";
import { CandidatureInferencePanel } from "../src/renderer/CandidatureInferencePanel";
import { clearAllAiTasks, startAiTask } from "../src/renderer/ai-task-store";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
} from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000b01";
const fieldId = "00000000-0000-4000-8000-000000000b02";
const sourceId = "00000000-0000-4000-8000-000000000b03";
const newFieldId = "00000000-0000-4000-8000-000000000b04";

function field(): CandidatureFieldConfiguration {
  return {
    definition: {
      id: fieldId,
      systemKey: null,
      label: "Availability",
      description: "When the user can start",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
      createdAt: "2026-09-18T00:00:00.000Z",
      updatedAt: "2026-09-18T00:00:00.000Z",
    },
    preferences: {
      fieldId,
      favourite: true,
      favouriteOrder: null,
      presentationSize: "normal",
      aiUseAllowed: true,
    },
  };
}

function record(): CandidatureRecord {
  return {
    id: candidatureId,
    archived: false,
    createdAt: "2026-09-18T00:00:00.000Z",
    updatedAt: "2026-09-18T00:00:00.000Z",
    sourceSearchText: "",
    values: [],
    tagIds: [],
  };
}

afterEach(() => {
  cleanup();
  clearAllAiTasks();
  vi.restoreAllMocks();
});

describe("candidature AI acceptance", () => {
  it("keeps an AI field proposal pending until the user explicitly accepts it", async () => {
    const save = vi.fn(async () => undefined);
    startAiTask(
      `candidature-inference:${candidatureId}:${fieldId}`,
      async () => ({
        proposals: [{ fieldId, value: "December" }],
        newFields: [],
        existingTags: [],
        newTags: [],
        issues: [],
      }),
      "Fill Availability",
      undefined,
      [fieldId],
    );

    render(
      <CandidatureFieldAiState
        candidatureId={candidatureId}
        field={field()}
        onSaveValue={save}
        onRetry={vi.fn()}
      />,
    );

    expect(await screen.findByText("AI found a value")).toBeVisible();
    expect(save).not.toHaveBeenCalled();

    await userEvent.setup().click(screen.getByRole("button", { name: "Use this value" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("December"));
  });

  it("does not create an AI-discovered field until the user chooses Create and use", async () => {
    const createField = vi.fn(async () => ({
      ...field(),
      definition: {
        ...field().definition,
        id: newFieldId,
        label: "Aircraft type",
        description: "Aircraft named in the offer",
      },
      preferences: {
        ...field().preferences,
        fieldId: newFieldId,
      },
    }));
    const setFieldValue = vi.fn(async () => record());
    const deleteField = vi.fn(async () => field());

    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        aiConnections: {
          list: vi.fn(async () => [{
            id: "00000000-0000-4000-8000-000000000b05",
            name: "Local",
            endpoint: "http://localhost:11434/v1",
            model: "local-model",
            isDefault: true,
            validatedOperations: [],
            defaultForOperations: [],
          }]),
        },
        aiTasks: {
          extractJob: vi.fn(async () => ({
            proposals: [],
            newFields: [{
              label: "Aircraft type",
              description: "Aircraft named in the offer",
              valueType: "text",
              cardinality: "one",
              choices: [],
              value: "A320",
            }],
            existingTags: [],
            newTags: [],
            issues: [],
          })),
          cancelJobExtraction: vi.fn(async () => undefined),
        },
        candidatures: {
          listSources: vi.fn(async () => [{
            id: sourceId,
            candidatureId,
            kind: "job_posting",
            title: "Offer",
            url: "",
            sourceText: "A320 type rating preferred.",
            createdAt: "2026-09-18T00:00:00.000Z",
            updatedAt: "2026-09-18T00:00:00.000Z",
          }]),
          createField,
          setFieldValue,
          deleteField,
          listFields: vi.fn(async () => [field()]),
          list: vi.fn(async () => [record()]),
          setTags: vi.fn(),
          createTag: vi.fn(),
        },
      },
    });

    render(
      <CandidatureInferencePanel
        candidature={record()}
        fields={[field()]}
        targetFieldIds={[fieldId]}
        taskId={`candidature-inference:${candidatureId}:missing`}
        title="Fill missing information"
        allowNewFields
      />,
    );

    expect(await screen.findByText("Aircraft type")).toBeVisible();
    expect(createField).not.toHaveBeenCalled();
    expect(setFieldValue).not.toHaveBeenCalled();

    await userEvent.setup().click(screen.getByRole("button", { name: "Create and use" }));
    await waitFor(() => expect(createField).toHaveBeenCalled());
    expect(setFieldValue).toHaveBeenCalledWith({
      candidatureId,
      fieldId: newFieldId,
      value: "A320",
    });
  });
});
