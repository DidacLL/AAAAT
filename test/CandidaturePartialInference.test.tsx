import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureBulkAiReview } from "../src/renderer/CandidatureBulkAiReview";
import { CandidatureFieldAiState } from "../src/renderer/CandidatureFieldAiState";
import {
  clearAllAiTasks,
  getAiTask,
  startAiTask,
} from "../src/renderer/ai-task-store";
import type { PartialJobExtractionResult } from "../src/shared/ai-proposal-outcomes";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
} from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000007001";
const organisationId = "00000000-0000-4000-8000-000000007002";
const roleId = "00000000-0000-4000-8000-000000007003";
const locationId = "00000000-0000-4000-8000-000000007004";
const taskId = `candidature-inference:${candidatureId}:missing`;

function field(
  id: string,
  label: string,
  cardinality: "one" | "many" = "one",
): CandidatureFieldConfiguration {
  return {
    definition: {
      id,
      systemKey: null,
      label,
      description: `${label} description`,
      valueType: "text",
      cardinality,
      choices: [],
      enabled: true,
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    },
    preferences: {
      fieldId: id,
      focusVisible: true,
      focusOrder: 0,
      focusProminence: "normal",
      identityOrder: null,
      aiDiscovery: true,
      aiContextMode: "expose",
    },
  };
}

const fields = [
  field(organisationId, "Organisation"),
  field(roleId, "Role"),
  field(locationId, "Location"),
];

function retained(fieldId: string, value: CandidatureRuntimeValue) {
  return {
    candidatureId,
    fieldId,
    value,
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-15T00:00:00.000Z",
  };
}

function Harness({ onRetry }: { readonly onRetry: () => void }) {
  const [candidature, setCandidature] = useState<CandidatureRecord>({
    id: candidatureId,
    archived: false,
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-15T00:00:00.000Z",
    label: "Aster role",
    sourceSearchText: "Aster",
    values: [retained(roleId, "Engineer")],
    documentIds: [],
    tagIds: [],
  });

  const save = async (fieldId: string, value: CandidatureRuntimeValue) => {
    setCandidature((current) => ({
      ...current,
      values: [
        ...current.values.filter((item) => item.fieldId !== fieldId),
        retained(fieldId, value),
      ],
    }));
  };

  const location = candidature.values.find((item) => item.fieldId === locationId)?.value;
  const role = candidature.values.find((item) => item.fieldId === roleId)?.value;

  return (
    <>
      <CandidatureBulkAiReview
        candidature={candidature}
        fields={fields}
        onSaveValue={save}
        onRetry={onRetry}
      />
      <div data-testid="organisation-value">
        {String(candidature.values.find((item) => item.fieldId === organisationId)?.value ?? "")}
      </div>
      <section aria-label="Location field">
        <CandidatureFieldAiState
          candidatureId={candidatureId}
          field={fields[2]!}
          currentValue={location}
          onSaveValue={(value) => save(locationId, value)}
          onRetry={onRetry}
        />
      </section>
      <section aria-label="Role field">
        <CandidatureFieldAiState
          candidatureId={candidatureId}
          field={fields[1]!}
          currentValue={role}
          onSaveValue={(value) => save(roleId, value)}
          onRetry={onRetry}
        />
      </section>
    </>
  );
}

describe("partial candidature inference UI", () => {
  beforeEach(() => clearAllAiTasks());

  afterEach(() => {
    cleanup();
    clearAllAiTasks();
    vi.restoreAllMocks();
  });

  it("keeps valid siblings, protects conflicts, and exposes one field-local issue without failing the task", async () => {
    const onRetry = vi.fn();
    const result: PartialJobExtractionResult = {
      proposals: [
        { fieldId: organisationId, value: "Aster Aviation" },
        { fieldId: roleId, value: "Senior Engineer" },
      ],
      newFields: [],
      issues: [
        {
          kind: "invalid",
          fieldId: locationId,
          fieldLabel: "Location",
          proposedValue: ["Madrid", "Barcelona"],
          reason: "Location accepts one value, but AI proposed 2.",
        },
      ],
      exchange: {
        operation: "job_extraction",
        endpoint: "http://127.0.0.1:8080/v1",
        model: "small-local-model",
        systemInstruction: "Extract supported facts.",
        userPayload: "{\"sourceText\":\"Aster\"}",
        rawModelResponse: "{\"proposals\":[...]}",
        structuredOutputMode: "json_schema",
        providerValidationError: "",
      },
    };

    startAiTask(
      taskId,
      async () => result,
      "Fill missing information",
      () => "Completed · 2 values found · 1 needs review",
      [organisationId, roleId, locationId],
    );
    await waitFor(() => expect(getAiTask(taskId)?.status).toBe("completed"));

    render(<Harness onRetry={onRetry} />);

    await waitFor(() => expect(screen.getByTestId("organisation-value")).toHaveTextContent("Aster Aviation"));
    expect(getAiTask(taskId)?.status).toBe("completed");
    expect(getAiTask(taskId)?.appliedFieldIds).toContain(organisationId);
    expect(getAiTask(taskId)?.completedExchange).toMatchObject({
      rawModelResponse: "{\"proposals\":[...]}",
    });

    const roleSection = screen.getByRole("region", { name: "Role field" });
    expect(within(roleSection).getByText("AI found another value")).toBeInTheDocument();
    expect(within(roleSection).getByText("Senior Engineer")).toBeInTheDocument();
    expect(within(roleSection).getByText(/will not be replaced/i)).toBeInTheDocument();

    const locationSection = screen.getByRole("region", { name: "Location field" });
    expect(within(locationSection).getByText("AI suggestion needs review")).toBeInTheDocument();
    expect(within(locationSection).getByText(/Madrid, Barcelona/)).toBeInTheDocument();
    expect(within(locationSection).getByText(/accepts one value, but AI proposed 2/i)).toBeInTheDocument();
    expect(screen.getByText(/1 field filled · 2 need review/i)).toBeInTheDocument();
  });

  it("retries only the bad field while retaining the completed bulk task and successful sibling", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    startAiTask<PartialJobExtractionResult>(
      taskId,
      async () => ({
        proposals: [{ fieldId: organisationId, value: "Aster Aviation" }],
        newFields: [],
        issues: [
          {
            kind: "invalid",
            fieldId: locationId,
            fieldLabel: "Location",
            proposedValue: ["Madrid", "Barcelona"],
            reason: "Location accepts one value, but AI proposed 2.",
          },
        ],
      }),
      "Fill missing information",
      undefined,
      [organisationId, locationId],
    );
    await waitFor(() => expect(getAiTask(taskId)?.status).toBe("completed"));

    render(<Harness onRetry={onRetry} />);
    await waitFor(() => expect(screen.getByTestId("organisation-value")).toHaveTextContent("Aster Aviation"));

    const locationSection = screen.getByRole("region", { name: "Location field" });
    await user.click(within(locationSection).getByRole("button", { name: "Retry this field" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(getAiTask(taskId)?.status).toBe("completed");
    expect(getAiTask(taskId)?.appliedFieldIds).toContain(organisationId);
    expect(getAiTask(taskId)?.result).toMatchObject({
      proposals: [{ fieldId: organisationId, value: "Aster Aviation" }],
      issues: [],
    });
  });
});
