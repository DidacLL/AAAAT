import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/CandidatureSourcesPanel", () => ({ CandidatureSourcesPanel: () => null }));
vi.mock("../src/renderer/CandidatureApplicationMaterialPanel", () => ({
  CandidatureApplicationMaterialPanel: () => null,
}));
vi.mock("../src/renderer/CandidatureActivityPanel", () => ({ CandidatureActivityPanel: () => null }));

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import { clearAllAiTasks, getAiTask } from "../src/renderer/ai-task-store";
import type { PartialJobExtractionResult } from "../src/shared/ai-proposal-outcomes";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
} from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000921";
const organisationId = "00000000-0000-4000-8000-000000000922";
const roleId = "00000000-0000-4000-8000-000000000923";
const locationId = "00000000-0000-4000-8000-000000000924";
const sourceId = "00000000-0000-4000-8000-000000000925";

type ExtractionRequest = {
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly sourceText: string;
};

function field(id: string, label: string): CandidatureFieldConfiguration {
  return {
    definition: {
      id,
      systemKey: null,
      label,
      description: `${label} description`,
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
      createdAt: "2026-09-14T00:00:00.000Z",
      updatedAt: "2026-09-14T00:00:00.000Z",
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
    createdAt: "2026-09-14T00:00:00.000Z",
    updatedAt: "2026-09-14T00:00:00.000Z",
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function installApi(
  currentRef: { current: CandidatureRecord },
  extraction: ReturnType<typeof deferred<PartialJobExtractionResult>>,
) {
  const setFieldValue = vi.fn(async ({ fieldId, value }: { fieldId: string; value: CandidatureRuntimeValue }) => {
    currentRef.current = {
      ...currentRef.current,
      values: [
        ...currentRef.current.values.filter((item) => item.fieldId !== fieldId),
        retained(fieldId, value),
      ],
    };
    return currentRef.current;
  });
  const extractJob = vi.fn((_taskId: string, request: ExtractionRequest) => {
    void request;
    return extraction.promise;
  });

  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: {
        list: vi.fn(async () => [currentRef.current]),
        listFields: vi.fn(async () => fields),
        create: vi.fn(),
        update: vi.fn(),
        filter: vi.fn(async () => [candidatureId]),
        createField: vi.fn(),
        updateField: vi.fn(),
        deleteField: vi.fn(),
        updateFieldPreferences: vi.fn(async (input) => ({
          ...fields.find((candidate) => candidate.definition.id === input.fieldId)!,
          preferences: input,
        })),
        setFieldValue,
        clearFieldValue: vi.fn(async ({ fieldId }) => {
          currentRef.current = {
            ...currentRef.current,
            values: currentRef.current.values.filter((item) => item.fieldId !== fieldId),
          };
          return currentRef.current;
        }),
        listSources: vi.fn(async () => [{
          id: sourceId,
          candidatureId,
          kind: "job_posting",
          title: "Aster vacancy",
          url: "https://example.invalid/aster",
          sourceText: "Aster Aviation seeks a Senior Captain in Madrid.",
          createdAt: "2026-09-14T00:00:00.000Z",
          updatedAt: "2026-09-14T00:00:00.000Z",
        }]),
        addSource: vi.fn(),
        updateSource: vi.fn(),
        removeSource: vi.fn(),
        setDocuments: vi.fn(),
        listTags: vi.fn(async () => []),
        createTag: vi.fn(),
        updateTag: vi.fn(),
        setTags: vi.fn(),
      },
      candidatureSearch: { search: vi.fn(async () => [candidatureId]) },
      documents: { list: vi.fn(async () => []) },
      aiConnections: {
        list: vi.fn(async () => [{
          id: "00000000-0000-4000-8000-000000000926",
          name: "Qwen local",
          endpoint: "http://127.0.0.1:8080/v1",
          model: "qwen3-8b",
          isDefault: true,
          validatedOperations: ["job_extraction"],
          defaultForOperations: ["job_extraction"],
        }]),
      },
      aiTasks: {
        extractJob,
        cancelJobExtraction: vi.fn(async () => true),
      },
    },
  });
  return { setFieldValue, extractJob };
}

async function openDetails(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByLabelText("Candidature corpus Focus");
  await user.click(screen.getByRole("button", { name: "Full record" }));
  return screen.findByRole("region", { name: "Complete candidature" });
}

describe("post-creation candidature AI inference", () => {
  beforeEach(() => clearAllAiTasks());

  afterEach(() => {
    cleanup();
    clearAllAiTasks();
    vi.restoreAllMocks();
  });

  it("keeps a conflicting single-field result attached across navigation and never overwrites without a choice", async () => {
    const user = userEvent.setup();
    const state = {
      current: {
        id: candidatureId,
        archived: false,
        createdAt: "2026-09-14T00:00:00.000Z",
        updatedAt: "2026-09-14T00:00:00.000Z",
        label: "Captain opportunity",
        sourceSearchText: "Aster Aviation Madrid",
        values: [retained(roleId, "Captain")],
        documentIds: [],
        tagIds: [],
      } satisfies CandidatureRecord,
    };
    const extraction = deferred<PartialJobExtractionResult>();
    const { setFieldValue, extractJob } = installApi(state, extraction);

    render(<CandidaturesWorkspace />);
    let detail = await openDetails(user);
    const roleCard = within(detail).getByRole("heading", { name: "Role" }).closest("article");
    if (!roleCard) throw new Error("Role card missing");

    await user.click(within(roleCard).getByRole("button", { name: "Ask AI to fill Role" }));
    expect(await screen.findByText(/Finding Role|AI queued/)).toBeInTheDocument();
    expect(extractJob).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Focus" })).toBeInTheDocument();

    extraction.resolve({
      proposals: [{ fieldId: roleId, value: "Senior Captain" }],
      newFields: [],
      issues: [],
    });
    expect(await screen.findByRole("heading", { name: "Focus" })).toBeInTheDocument();
    expect(setFieldValue).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Full record" }));
    detail = await screen.findByRole("region", { name: "Complete candidature" });
    const reopenedRole = within(detail).getByRole("heading", { name: "Role" }).closest("article");
    if (!reopenedRole) throw new Error("Reopened Role card missing");

    expect(await within(reopenedRole).findByText("AI found another value")).toBeInTheDocument();
    expect(within(reopenedRole).getByText("Senior Captain")).toBeInTheDocument();
    expect(within(reopenedRole).getByText(/will not be replaced/i)).toBeInTheDocument();
    expect(within(reopenedRole).getByText("Captain", { exact: true })).toBeInTheDocument();
    expect(setFieldValue).not.toHaveBeenCalled();

    await user.click(within(reopenedRole).getByRole("button", { name: "Use this value" }));
    expect(setFieldValue).toHaveBeenCalledWith({
      candidatureId,
      fieldId: roleId,
      value: "Senior Captain",
    });
    expect(getAiTask(`candidature-inference:${candidatureId}:${roleId}`)?.detail).toBe(
      "Completed · information applied/reviewed",
    );
  });

  it("auto-fills missing information and never overwrites an existing value", async () => {
    const user = userEvent.setup();
    const state = {
      current: {
        id: candidatureId,
        archived: false,
        createdAt: "2026-09-14T00:00:00.000Z",
        updatedAt: "2026-09-14T00:00:00.000Z",
        label: "Captain opportunity",
        sourceSearchText: "Aster Aviation Madrid",
        values: [retained(roleId, "Captain")],
        documentIds: [],
        tagIds: [],
      } satisfies CandidatureRecord,
    };
    const extraction = deferred<PartialJobExtractionResult>();
    const { setFieldValue } = installApi(state, extraction);

    render(<CandidaturesWorkspace />);
    const detail = await openDetails(user);
    await user.click(within(detail).getByRole("button", { name: "Ask AI to fill missing information" }));

    extraction.resolve({
      proposals: [
        { fieldId: organisationId, value: "Aster Aviation" },
        { fieldId: locationId, value: "Madrid" },
        { fieldId: roleId, value: "Senior Captain" },
      ],
      newFields: [],
      issues: [],
    });

    await waitFor(() => expect(setFieldValue).toHaveBeenCalledTimes(2));
    expect(setFieldValue).toHaveBeenCalledWith({ candidatureId, fieldId: organisationId, value: "Aster Aviation" });
    expect(setFieldValue).toHaveBeenCalledWith({ candidatureId, fieldId: locationId, value: "Madrid" });
    expect(setFieldValue).not.toHaveBeenCalledWith(expect.objectContaining({ fieldId: roleId }));

    const organisationCard = within(detail).getByRole("heading", { name: "Organisation" }).closest("article");
    const locationCard = within(detail).getByRole("heading", { name: "Location" }).closest("article");
    const roleCard = within(detail).getByRole("heading", { name: "Role" }).closest("article");
    if (!organisationCard || !locationCard || !roleCard) throw new Error("Expected field cards missing");

    expect(await within(organisationCard).findByText("Aster Aviation")).toBeInTheDocument();
    expect(within(locationCard).getByText("Madrid")).toBeInTheDocument();
    expect(within(organisationCard).getByText(/AI filled/)).toBeInTheDocument();
    expect(within(locationCard).getByText(/AI filled/)).toBeInTheDocument();
    expect(within(roleCard).getByText("Captain", { exact: true })).toBeInTheDocument();
    expect(within(roleCard).queryByText("Senior Captain")).not.toBeInTheDocument();
  });

  it("explains a completed single-field task when AI returns no usable proposal", async () => {
    const user = userEvent.setup();
    const state = {
      current: {
        id: candidatureId,
        archived: false,
        createdAt: "2026-09-14T00:00:00.000Z",
        updatedAt: "2026-09-14T00:00:00.000Z",
        label: "Captain opportunity",
        sourceSearchText: "Aster Aviation Madrid",
        values: [retained(roleId, "Captain")],
        documentIds: [],
        tagIds: [],
      } satisfies CandidatureRecord,
    };
    const extraction = deferred<PartialJobExtractionResult>();
    installApi(state, extraction);

    render(<CandidaturesWorkspace />);
    const detail = await openDetails(user);
    const locationCard = within(detail).getByRole("heading", { name: "Location" }).closest("article");
    if (!locationCard) throw new Error("Location card missing");
    await user.click(within(locationCard).getByRole("button", { name: "Ask AI to fill Location" }));
    extraction.resolve({ proposals: [], newFields: [], issues: [] });

    expect(await within(locationCard).findByText("AI finished but did not find a usable value.")).toBeInTheDocument();
    expect(getAiTask(`candidature-inference:${candidatureId}:${locationId}`)?.detail).toBe(
      "Completed · no usable information found",
    );
  });
});
