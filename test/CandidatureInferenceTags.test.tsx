import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureInferencePanel } from "../src/renderer/CandidatureInferencePanel";
import { clearAllAiTasks } from "../src/renderer/ai-task-store";
import type { CandidatureFieldConfiguration, CandidatureRecord } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000711";
const fieldId = "00000000-0000-4000-8000-000000000712";
const sourceId = "00000000-0000-4000-8000-000000000713";
const tagId = "00000000-0000-4000-8000-000000000714";

const candidature: CandidatureRecord = {
  id: candidatureId,
  archived: false,
  createdAt: "2026-09-16T00:00:00.000Z",
  updatedAt: "2026-09-16T00:00:00.000Z",
  label: "Example opportunity",
  sourceSearchText: "",
  values: [],
  documentIds: [],
  tagIds: [],
};

const field: CandidatureFieldConfiguration = {
  definition: {
    id: fieldId,
    systemKey: null,
    label: "Role",
    description: "Role offered by the opportunity.",
    valueType: "text",
    cardinality: "one",
    choices: [],
    enabled: true,
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
  },
  preferences: {
    fieldId,
    focusVisible: true,
    focusOrder: 0,
    focusProminence: "normal",
    identityOrder: null,
    aiUseAllowed: true,
  },
};

describe("AI Tag proposal review", () => {
  beforeEach(() => clearAllAiTasks());

  afterEach(() => {
    cleanup();
    clearAllAiTasks();
    vi.restoreAllMocks();
  });

  it("shows proposal evidence for review without persisting it as shared Tag notes", async () => {
    const createTag = vi.fn(async () => ({
      id: tagId,
      name: "Kubernetes",
      definition: "Container orchestration platform.",
      aliases: ["K8s"],
      notes: "",
      createdAt: "2026-09-16T00:00:00.000Z",
      updatedAt: "2026-09-16T00:00:00.000Z",
    }));
    const setTags = vi.fn(async () => ({ ...candidature, tagIds: [tagId] }));

    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        candidatures: {
          list: vi.fn(async () => [candidature]),
          listFields: vi.fn(async () => [field]),
          listSources: vi.fn(async () => [
            {
              id: sourceId,
              candidatureId,
              kind: "job_posting",
              title: "Vacancy",
              url: "",
              sourceText: "Experience operating Kubernetes clusters is required.",
              createdAt: "2026-09-16T00:00:00.000Z",
              updatedAt: "2026-09-16T00:00:00.000Z",
            },
          ]),
          createTag,
          setTags,
        },
        aiConnections: {
          list: vi.fn(async () => [
            {
              id: "00000000-0000-4000-8000-000000000715",
              name: "Local model",
              endpoint: "http://127.0.0.1:8080/v1",
              model: "fixture-model",
              isDefault: true,
              validatedOperations: ["job_extraction"],
              defaultForOperations: ["job_extraction"],
            },
          ]),
        },
        aiTasks: {
          extractJob: vi.fn(async () => ({
            proposals: [],
            newFields: [],
            existingTags: [],
            newTags: [
              {
                name: "Kubernetes",
                definition: "Container orchestration platform.",
                aliases: ["K8s"],
                evidence: "Experience operating Kubernetes clusters is required.",
              },
            ],
            issues: [],
          })),
          cancelJobExtraction: vi.fn(async () => true),
        },
      },
    });

    const user = userEvent.setup();
    render(
      <CandidatureInferencePanel
        candidature={candidature}
        fields={[field]}
        targetFieldIds={[fieldId]}
        taskId="tag-review-fixture"
        title="Extract information"
        allowNewFields
      />,
    );

    expect(
      await screen.findByText(
        "Evidence: Experience operating Kubernetes clusters is required.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create and attach" }));

    await waitFor(() => {
      expect(createTag).toHaveBeenCalledWith({
        name: "Kubernetes",
        definition: "Container orchestration platform.",
        aliases: ["K8s"],
      });
    });
    expect(setTags).toHaveBeenCalledWith({ candidatureId, tagIds: [tagId] });
  });
});
