import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/CandidatureSourcesPanel", () => ({ CandidatureSourcesPanel: () => null }));
vi.mock("../src/renderer/CandidatureApplicationMaterialPanel", () => ({
  CandidatureApplicationMaterialPanel: () => null,
}));
vi.mock("../src/renderer/CandidatureActivityPanel", () => ({ CandidatureActivityPanel: () => null }));

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import { clearAllAiTasks } from "../src/renderer/ai-task-store";
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

describe("post-creation candidature AI inference", () => {
  beforeEach(() => {
    clearAllAiTasks();
  });

  afterEach(() => {
    cleanup();
    clearAllAiTasks();
    vi.restoreAllMocks();
  });

  it("queues bulk inference, keeps manual value editing usable, and never writes proposals silently", async () => {
    const user = userEvent.setup();
    let current: CandidatureRecord = {
      id: candidatureId,
      archived: false,
      createdAt: "2026-09-14T00:00:00.000Z",
      updatedAt: "2026-09-14T00:00:00.000Z",
      label: "Captain opportunity",
      sourceSearchText: "Aster Aviation Madrid",
      values: [retained(roleId, "Captain")],
      documentIds: [],
      tagIds: [],
    };
    const extraction = deferred<{ proposals: Array<{ fieldId: string; value: CandidatureRuntimeValue }> }>();
    const setFieldValue = vi.fn(async ({ fieldId, value }: { fieldId: string; value: CandidatureRuntimeValue }) => {
      current = {
        ...current,
        values: [
          ...current.values.filter((item) => item.fieldId !== fieldId),
          retained(fieldId, value),
        ],
      };
      return current;
    });
    const extractJob = vi.fn((_request: ExtractionRequest) => extraction.promise);

    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        candidatures: {
          list: vi.fn(async () => [current]),
          listFields: vi.fn(async () => fields),
          create: vi.fn(),
          update: vi.fn(),
          filter: vi.fn(async () => [candidatureId]),
          createField: vi.fn(),
          updateField: vi.fn(),
          deleteField: vi.fn(),
          updateFieldPreferences: vi.fn(),
          setFieldValue,
          clearFieldValue: vi.fn(),
          listSources: vi.fn(async () => [{
            id: sourceId,
            candidatureId,
            kind: "job_posting",
            title: "Aster vacancy",
            url: "https://example.invalid/aster",
            sourceText: "Aster Aviation seeks a Captain in Madrid.",
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
        ai: { extractJob },
      },
    });

    render(<CandidaturesWorkspace />);
    await screen.findByLabelText("Candidature corpus Focus");
    await user.click(screen.getByRole("button", { name: "All details" }));

    await user.click(screen.getByRole("button", { name: "Suggest missing information with AI" }));
    const inference = await screen.findByRole("region", { name: "Candidature AI suggestions" });
    await user.click(within(inference).getByRole("button", { name: "Request AI suggestions" }));
    expect(await within(inference).findByText(/Queued|AI is reading retained candidature context/)).toBeInTheDocument();

    const roleCard = screen.getByRole("heading", { name: "Role" }).closest("article");
    if (!roleCard) throw new Error("Role card missing");
    await user.click(within(roleCard).getByRole("button", { name: "Edit value" }));
    const roleInput = within(roleCard).getByRole("textbox");
    await user.clear(roleInput);
    await user.type(roleInput, "Senior Captain");
    await user.click(within(roleCard).getByRole("button", { name: "Save" }));
    expect(setFieldValue).toHaveBeenCalledTimes(1);

    const request = extractJob.mock.calls[0]?.[0];
    expect(request?.sourceText).toContain("Aster Aviation seeks a Captain in Madrid.");
    expect(request?.sourceText).toContain("Role: Captain");

    extraction.resolve({
      proposals: [
        { fieldId: organisationId, value: "Aster Aviation" },
        { fieldId: locationId, value: "Madrid" },
        { fieldId: roleId, value: "Captain" },
      ],
    });

    expect(await within(inference).findByText("Organisation", { exact: true })).toBeInTheDocument();
    expect(within(inference).getByText("Location", { exact: true })).toBeInTheDocument();
    expect(within(inference).queryByText("Role", { exact: true })).not.toBeInTheDocument();
    expect(setFieldValue).toHaveBeenCalledTimes(1);

    const organisationCard = within(inference).getByText("Organisation", { exact: true }).closest("article");
    if (!organisationCard) throw new Error("Organisation proposal missing");
    await user.click(within(organisationCard).getByRole("button", { name: "Use suggestion" }));
    expect(setFieldValue).toHaveBeenLastCalledWith({
      candidatureId,
      fieldId: organisationId,
      value: "Aster Aviation",
    });
  });

  it("offers a specific-field proposal as an explicit replacement", async () => {
    const user = userEvent.setup();
    const extraction = deferred<{ proposals: Array<{ fieldId: string; value: CandidatureRuntimeValue }> }>();
    const current: CandidatureRecord = {
      id: candidatureId,
      archived: false,
      createdAt: "2026-09-14T00:00:00.000Z",
      updatedAt: "2026-09-14T00:00:00.000Z",
      label: "Captain opportunity",
      sourceSearchText: "",
      values: [retained(roleId, "Captain")],
      documentIds: [],
      tagIds: [],
    };
    const setFieldValue = vi.fn(async () => current);

    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        candidatures: {
          list: vi.fn(async () => [current]),
          listFields: vi.fn(async () => fields),
          setFieldValue,
          clearFieldValue: vi.fn(),
          listSources: vi.fn(async () => [{
            id: sourceId,
            candidatureId,
            kind: "job_posting",
            title: "Vacancy",
            url: "",
            sourceText: "Role title: Senior Captain",
            createdAt: "2026-09-14T00:00:00.000Z",
            updatedAt: "2026-09-14T00:00:00.000Z",
          }]),
          listTags: vi.fn(async () => []),
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
        ai: { extractJob: vi.fn((_request: ExtractionRequest) => extraction.promise) },
      },
    });

    render(<CandidaturesWorkspace />);
    await screen.findByLabelText("Candidature corpus Focus");
    await user.click(screen.getByRole("button", { name: "All details" }));
    const roleCard = screen.getByRole("heading", { name: "Role" }).closest("article");
    if (!roleCard) throw new Error("Role card missing");
    await user.click(within(roleCard).getByRole("button", { name: "Suggest with AI" }));

    const inference = await screen.findByRole("region", { name: "Candidature AI suggestions" });
    await user.click(within(inference).getByRole("button", { name: "Request AI suggestions" }));
    extraction.resolve({ proposals: [{ fieldId: roleId, value: "Senior Captain" }] });

    expect(await within(inference).findByText(/Proposed replacement/)).toBeInTheDocument();
    expect(setFieldValue).not.toHaveBeenCalled();
    await user.click(within(inference).getByRole("button", { name: "Use suggestion" }));
    expect(setFieldValue).toHaveBeenCalledWith({
      candidatureId,
      fieldId: roleId,
      value: "Senior Captain",
    });
  });
});
