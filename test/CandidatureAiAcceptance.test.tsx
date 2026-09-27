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
const exactTaskKey = `candidature-inference:${candidatureId}:${fieldId}`;

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

function proposalResult(value = "December") {
  return {
    proposals: [{ fieldId, value }],
    newFields: [],
    existingTags: [],
    newTags: [],
    issues: [],
  };
}

function issueResult() {
  return {
    proposals: [],
    newFields: [],
    existingTags: [],
    newTags: [],
    issues: [{
      kind: "invalid" as const,
      fieldId,
      fieldLabel: "Availability",
      proposedValue: "December?",
      reason: "Review the ambiguous value before retaining it.",
    }],
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
    startAiTask(exactTaskKey, async () => proposalResult(), "Fill Availability", undefined, [fieldId]);

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

  it("keeps proposal correction contextual and dismissible without field administration", async () => {
    const save = vi.fn(async () => undefined);
    startAiTask(exactTaskKey, async () => proposalResult(), "Fill Availability", undefined, [fieldId]);
    const user = userEvent.setup();

    render(
      <CandidatureFieldAiState
        candidatureId={candidatureId}
        field={field()}
        onSaveValue={save}
        onRetry={vi.fn()}
      />,
    );

    expect(await screen.findByText("AI found a value")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Value")).toHaveValue("December");
    expect(screen.queryByText("Edit information details")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AI may use this information" })).not.toBeInTheDocument();
    expect(screen.queryByText("Field options")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(save).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("AI found a value")).not.toBeInTheDocument());
  });

  it("keeps queued, working and completed-without-value states on the field", async () => {
    let finish: ((result: ReturnType<typeof proposalResult>) => void) | undefined;
    const pending = new Promise<ReturnType<typeof proposalResult>>((resolve) => {
      finish = resolve;
    });
    const retry = vi.fn();
    startAiTask(
      exactTaskKey,
      async () => pending,
      "Fill Availability",
      undefined,
      [fieldId],
    );

    render(
      <CandidatureFieldAiState
        candidatureId={candidatureId}
        field={field()}
        onSaveValue={vi.fn(async () => undefined)}
        onRetry={retry}
      />,
    );

    expect(screen.getByText("AI queued")).toBeVisible();
    await waitFor(() => expect(screen.getByText("Working…")).toBeVisible());
    finish?.({ ...proposalResult(), proposals: [] });
    expect(await screen.findByText("AI finished but did not find a usable value.")).toBeVisible();

    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("keeps failure and retry contextual to the field", async () => {
    const retry = vi.fn();
    startAiTask(
      exactTaskKey,
      async () => {
        throw new Error("Provider unavailable");
      },
      "Fill Availability",
      undefined,
      [fieldId],
    );

    render(
      <CandidatureFieldAiState
        candidatureId={candidatureId}
        field={field()}
        onSaveValue={vi.fn(async () => undefined)}
        onRetry={retry}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Provider unavailable");
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("salvages a partial-result issue through correction and marks the accepted result applied", async () => {
    const save = vi.fn(async () => undefined);
    startAiTask(exactTaskKey, async () => issueResult(), "Fill Availability", undefined, [fieldId]);
    const user = userEvent.setup();

    render(
      <CandidatureFieldAiState
        candidatureId={candidatureId}
        field={field()}
        currentValue="Existing"
        onSaveValue={save}
        onRetry={vi.fn()}
      />,
    );

    expect(await screen.findByText("AI suggestion needs review")).toBeVisible();
    expect(screen.getByText("AAAAT kept the rest of the AI result.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.queryByText("Edit information details")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AI may use this information" })).not.toBeInTheDocument();
    const value = screen.getByLabelText("Value");
    await user.clear(value);
    await user.type(value, "January");
    await user.click(screen.getByRole("button", { name: "Use corrected value" }));

    await waitFor(() => expect(save).toHaveBeenCalledWith("January"));
    expect(await screen.findByText("AI filled", { exact: false })).toBeVisible();
  });

  it.each([
    ["Retry this field", true],
    ["Dismiss", false],
  ])("supports partial-result issue action %s", async (action, retries) => {
    const save = vi.fn(async () => undefined);
    const retry = vi.fn();
    startAiTask(exactTaskKey, async () => issueResult(), "Fill Availability", undefined, [fieldId]);

    render(
      <CandidatureFieldAiState
        candidatureId={candidatureId}
        field={field()}
        onSaveValue={save}
        onRetry={retry}
      />,
    );

    expect(await screen.findByText("AI suggestion needs review")).toBeVisible();
    await userEvent.setup().click(screen.getByRole("button", { name: action }));
    expect(save).not.toHaveBeenCalled();
    expect(retry).toHaveBeenCalledTimes(retries ? 1 : 0);
    await waitFor(() => expect(screen.queryByText("AI suggestion needs review")).not.toBeInTheDocument());
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
