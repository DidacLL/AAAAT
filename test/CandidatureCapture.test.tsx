import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/JobExtractionPanel", () => ({
  JobExtractionPanel: ({ onDismiss }: { readonly onDismiss: () => void }) => (
    <section aria-label="AI extraction">
      <button type="button" onClick={onDismiss}>Dismiss AI extraction</button>
    </section>
  ),
}));

import { CandidaturesAiWorkspace } from "../src/renderer/CandidaturesAiWorkspace";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  DesktopApi,
} from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000701";
const fieldId = "00000000-0000-4000-8000-000000000702";
const now = "2026-09-07T00:00:00.000Z";
const phrase = "Aster Aviation seeks a captain. Salary 120000. International routes.";

const roleField: CandidatureFieldConfiguration = {
  definition: {
    id: fieldId,
    systemKey: "role",
    label: "Role",
    description: "Role or position",
    valueType: "text",
    cardinality: "one",
    choices: [],
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
  preferences: {
    fieldId,
    focusVisible: true,
    focusOrder: 0,
    focusProminence: "normal",
    identityOrder: 0,
    aiDiscovery: true,
    aiContextMode: "expose",
  },
};

function candidature(values: CandidatureRecord["values"] = []): CandidatureRecord {
  return {
    id: candidatureId,
    archived: false,
    createdAt: now,
    updatedAt: now,
    label: values.length > 0 ? "Captain" : "Raw candidature",
    sourceSearchText: phrase,
    values,
    documentIds: [],
    tagIds: [],
  };
}

const create = vi.fn();
const list = vi.fn();
const setFieldValue = vi.fn();
let persisted: CandidatureRecord[] = [];

function installApi(aiAvailable = false) {
  persisted = [];
  list.mockImplementation(async () => [...persisted]);
  create.mockImplementation(async (input: { values?: Array<{ fieldId: string; value: unknown }> }) => {
    const values = (input.values ?? []).map((value) => ({
      candidatureId,
      fieldId: value.fieldId,
      value: value.value as string,
      createdAt: now,
      updatedAt: now,
    }));
    const created = candidature(values);
    persisted = [created];
    return created;
  });
  setFieldValue.mockImplementation(async ({ fieldId: savedFieldId, value }: { fieldId: string; value: unknown }) => {
    const updated = candidature([
      {
        candidatureId,
        fieldId: savedFieldId,
        value: value as string,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    persisted = [updated];
    return updated;
  });

  const api = {
    candidatures: {
      list,
      create,
      update: vi.fn(),
      filter: vi.fn().mockResolvedValue([]),
      listFields: vi.fn().mockResolvedValue([roleField]),
      createField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      updateFieldPreferences: vi.fn(),
      setFieldValue,
      clearFieldValue: vi.fn(),
      listSources: vi.fn().mockResolvedValue([]),
      addSource: vi.fn(),
      updateSource: vi.fn(),
      removeSource: vi.fn(),
      setDocuments: vi.fn(),
      listTags: vi.fn().mockResolvedValue([]),
      createTag: vi.fn(),
      updateTag: vi.fn(),
      setTags: vi.fn(),
    },
    aiConnections: {
      list: vi.fn().mockResolvedValue(
        aiAvailable
          ? [{
              validatedOperations: ["job_extraction"],
              defaultForOperations: ["job_extraction"],
              isDefault: false,
            }]
          : [],
      ),
    },
    candidatureSearch: { search: vi.fn().mockResolvedValue([]) },
    documents: { list: vi.fn().mockResolvedValue([]) },
  } as unknown as DesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

describe("candidature creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("offers field-by-field and raw-material creation as peer entrances", async () => {
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("heading", { name: "Candidatures" });
    expect(screen.getByRole("button", { name: "New candidature — fill fields" })).toBeVisible();
    expect(screen.getByRole("button", { name: "New candidature — paste raw material" })).toBeVisible();
  });

  it("keeps raw capture transient until raw material is explicitly retained", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("heading", { name: "Candidatures" });
    await user.click(screen.getByRole("button", { name: "New candidature — paste raw material" }));

    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Keep raw material" })).toBeDisabled();
    await user.type(screen.getByLabelText("Candidature material"), phrase);
    expect(screen.getByRole("button", { name: "Keep raw material" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirm).toHaveBeenCalledWith("Discard this unsaved candidature capture?");
    expect(create).not.toHaveBeenCalled();
  });

  it("retains raw material then shows explicit AI and manual continuations together", async () => {
    installApi(true);
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("heading", { name: "Candidatures" });
    await user.click(screen.getByRole("button", { name: "New candidature — paste raw material" }));
    await user.type(screen.getByLabelText("Candidature material"), phrase);
    await user.click(screen.getByRole("button", { name: "Keep raw material" }));

    expect(create).toHaveBeenCalledWith({
      source: { kind: "other", title: "", url: "", sourceText: phrase },
      values: [],
    });
    const choice = await screen.findByRole("region", { name: "Raw candidature saved" });
    expect(within(choice).getByRole("button", { name: "Send to AI" })).toBeEnabled();
    expect(within(choice).getByRole("button", { name: "Fill candidature yourself" })).toBeEnabled();
    expect(within(choice).getByText(phrase)).toBeVisible();
  });

  it("keeps manual post-paste filling fully available without AI", async () => {
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("heading", { name: "Candidatures" });
    await user.click(screen.getByRole("button", { name: "New candidature — paste raw material" }));
    await user.type(screen.getByLabelText("Candidature material"), phrase);
    await user.click(screen.getByRole("button", { name: "Keep raw material" }));

    const choice = await screen.findByRole("region", { name: "Raw candidature saved" });
    expect(within(choice).getByRole("button", { name: "Send to AI" })).toBeDisabled();
    await user.click(within(choice).getByRole("button", { name: "Fill candidature yourself" }));

    const manual = await screen.findByRole("region", { name: "Fill candidature yourself" });
    expect(within(manual).getByRole("region", { name: "Raw candidature material" })).toHaveTextContent(phrase);
    expect(within(manual).getByRole("region", { name: "Candidature fields" })).toBeVisible();
    expect(within(manual).getByRole("heading", { name: "Role" })).toBeVisible();
  });

  it("supports direct field-by-field creation without requiring a Source", async () => {
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("heading", { name: "Candidatures" });
    await user.click(screen.getByRole("button", { name: "New candidature — fill fields" }));

    const manual = await screen.findByRole("region", { name: "Fill candidature fields" });
    await user.type(within(manual).getByRole("textbox"), "Captain");
    await user.click(within(manual).getByRole("button", { name: "Save" }));

    expect(create).toHaveBeenCalledWith({ values: [{ fieldId, value: "Captain" }] });
  });
});