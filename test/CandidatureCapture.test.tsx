import { cleanup, render, screen } from "@testing-library/react";
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
    aiUseAllowed: true,
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

describe("application capture", () => {
  beforeEach(() => { vi.clearAllMocks(); installApi(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("saves pasted material without requiring a CV, cover letter, or field", async () => {
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);
    await user.click(await screen.findByRole("button", { name: "New application" }));
    await user.type(screen.getByRole("textbox", { name: "Application notes or offer" }), phrase);
    expect(screen.getByRole("checkbox", { name: "Dedicated CV" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Cover letter" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save application" }));
    expect(create).toHaveBeenCalledWith({
      source: { kind: "other", title: "", url: "", sourceText: phrase },
      values: [],
    });
    expect(await screen.findByRole("button", { name: "New application" })).toBeInTheDocument();
  });

  it("saves a single manually entered detail with no pasted material", async () => {
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);
    await user.click(await screen.findByRole("button", { name: "New application" }));
    await user.type(await screen.findByRole("textbox", { name: "Role" }), "Captain");
    await user.click(screen.getByRole("button", { name: "Save application" }));
    expect(create).toHaveBeenCalledWith({ values: [{ fieldId, value: "Captain" }] });
    expect(await screen.findByRole("button", { name: "New application" })).toBeInTheDocument();
  });
});
