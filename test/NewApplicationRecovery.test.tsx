import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/contextual-handoffs", () => ({
  useContextualHandoffs: () => ({
    documentHandoff: null,
    openDocumentFromCandidature: vi.fn(),
  }),
}));
vi.mock("../src/renderer/CandidatureBulkAiReview", () => ({ CandidatureBulkAiReview: () => null }));
vi.mock("../src/renderer/CandidatureFieldAiState", () => ({ CandidatureFieldAiState: () => null }));
vi.mock("../src/renderer/CandidatureFieldDefinitionsPanel", () => ({ CandidatureFieldDefinitionsPanel: () => null }));
vi.mock("../src/renderer/CandidatureOfferPanel", () => ({ CandidatureOfferPanel: () => null }));
vi.mock("../src/renderer/CandidatureOpportunityResearchAccessPanel", () => ({
  CandidatureOpportunityResearchAccessPanel: () => null,
}));
vi.mock("../src/renderer/CandidatureSourcesPanel", () => ({
  CandidatureSourcesPanel: () => <section aria-label="Sources">Retained Source</section>,
}));
vi.mock("../src/renderer/CandidatureInferencePanel", () => ({
  CandidatureInferencePanel: ({ title }: { readonly title: string }) => (
    <section aria-label={title}>
      <p role="alert">Provider unavailable</p>
    </section>
  ),
}));

import { CandidaturesAiWorkspace } from "../src/renderer/CandidaturesAiWorkspace";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
} from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000003801";
const roleId = "00000000-0000-4000-8000-000000003802";

function roleField(): CandidatureFieldConfiguration {
  return {
    definition: {
      id: roleId,
      systemKey: null,
      label: "Role",
      description: "Target role",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
      createdAt: "2026-09-29T00:00:00.000Z",
      updatedAt: "2026-09-29T00:00:00.000Z",
    },
    preferences: {
      fieldId: roleId,
      favourite: true,
      favouriteOrder: 0,
      presentationSize: "normal",
      aiUseAllowed: true,
    },
  };
}

const emptyCollections = {
  templates: [],
  workingCvs: [],
  renderedCvs: [],
  letters: [],
  renderedLetters: [],
  applicationPackets: [],
};

function installApi() {
  let records: CandidatureRecord[] = [];
  const create = vi.fn(async (input: {
    values: readonly { fieldId: string; value: CandidatureRuntimeValue }[];
    source?: { kind: string; title: string; url: string; sourceText: string };
  }) => {
    const record: CandidatureRecord = {
      id: candidatureId,
      archived: false,
      createdAt: "2026-09-29T00:00:00.000Z",
      updatedAt: "2026-09-29T00:00:00.000Z",
      sourceSearchText: input.source?.sourceText ?? "",
      values: input.values.map(({ fieldId, value }) => ({
        candidatureId,
        fieldId,
        value,
        createdAt: "2026-09-29T00:00:00.000Z",
        updatedAt: "2026-09-29T00:00:00.000Z",
      })),
      tagIds: [],
    };
    records = [record];
    return record;
  });
  const setFieldValue = vi.fn(async ({ fieldId, value }: { fieldId: string; value: CandidatureRuntimeValue }) => {
    const current = records[0]!;
    const retained = current.values.find((item) => item.fieldId === fieldId);
    const nextValue = {
      candidatureId,
      fieldId,
      value,
      createdAt: retained?.createdAt ?? "2026-09-29T00:00:00.000Z",
      updatedAt: "2026-09-29T01:00:00.000Z",
    };
    const updated = {
      ...current,
      values: [...current.values.filter((item) => item.fieldId !== fieldId), nextValue],
    };
    records = [updated];
    return updated;
  });
  const createWorkingCv = vi.fn();
  const updateCoverLetter = vi.fn();

  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: {
        create,
        list: vi.fn(async () => records),
        listFields: vi.fn(async () => [roleField()]),
        listTags: vi.fn(async () => []),
        listSources: vi.fn(async () => []),
        setFieldValue,
        clearFieldValue: vi.fn(async () => records[0]!),
        update: vi.fn(async () => records[0]!),
        updateFieldPreferences: vi.fn(async (input) => ({ ...roleField(), preferences: input })),
        reorderFavouriteFields: vi.fn(async () => [roleField()]),
        updateField: vi.fn(async () => roleField()),
        setTags: vi.fn(async () => records[0]!),
        createTag: vi.fn(),
        updateTag: vi.fn(),
      },
      candidatureSearch: { search: vi.fn(async () => []) },
      documentDomain: {
        collections: vi.fn(async () => emptyCollections),
        createWorkingCv,
        updateCoverLetter,
        createPacket: vi.fn(),
        openRenderedCv: vi.fn(),
        openRenderedLetter: vi.fn(),
        exportRenderedLetter: vi.fn(),
        openPacket: vi.fn(),
        exportPacket: vi.fn(),
      },
      applicationHandoff: { importFile: vi.fn(async () => ({ status: "cancelled" as const })) },
    },
  });

  return { create, setFieldValue, createWorkingCv, updateCoverLetter };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("new application recovery", () => {
  it("shows peer human intentions, keeps external handoff secondary, and direct entry saves dynamic fields without Source or AI", async () => {
    const api = installApi();
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await user.click(screen.getByRole("button", { name: "New application" }));
    const start = screen.getByRole("region", { name: "New application" });
    expect(within(start).getByRole("button", { name: /Enter information directly/ })).toBeVisible();
    expect(within(start).getByRole("button", { name: /Retain raw material/ })).toBeVisible();
    expect(within(start).getByRole("button", { name: "Import external AI handoff…" })).toBeVisible();

    await user.click(within(start).getByRole("button", { name: /Enter information directly/ }));
    const form = await screen.findByRole("form", { name: "Application information" });
    expect(screen.queryByText("Parse with AI")).not.toBeInTheDocument();
    await user.type(within(form).getByLabelText("Role"), "Captain");
    await user.click(within(form).getByRole("button", { name: "Save application" }));

    await waitFor(() => expect(api.create).toHaveBeenCalledWith({
      values: [{ fieldId: roleId, value: "Captain" }],
    }));
    expect(await screen.findByRole("region", { name: "Application information" })).toBeVisible();
  });

  it("retains raw text alone, presents AI/manual continuations together, and reuses selected application information with Source visible", async () => {
    const api = installApi();
    const user = userEvent.setup();
    const raw = "  Aster Aviation seeks a captain.\nKeep this exact text.  ";
    render(<CandidaturesAiWorkspace />);

    await user.click(screen.getByRole("button", { name: "New application" }));
    await user.click(screen.getByRole("button", { name: /Retain raw material/ }));
    await user.type(screen.getByLabelText("Application raw material"), raw);
    await user.click(screen.getByRole("button", { name: "Retain raw material" }));

    await waitFor(() => expect(api.create).toHaveBeenCalledWith({
      values: [],
      source: { kind: "other", title: "", url: "", sourceText: raw },
    }));
    expect(api.setFieldValue).not.toHaveBeenCalled();
    expect(api.createWorkingCv).not.toHaveBeenCalled();
    expect(api.updateCoverLetter).not.toHaveBeenCalled();
    const continuation = await screen.findByRole("region", { name: "Raw material continuation" });
    expect(within(continuation).getByRole("button", { name: "Use AI to suggest information" })).toBeVisible();
    expect(within(continuation).getByRole("button", { name: "Fill information manually" })).toBeVisible();

    await user.click(within(continuation).getByRole("button", { name: "Fill information manually" }));
    expect(await screen.findByRole("region", { name: "Sources" })).toHaveTextContent("Retained Source");
    const role = await screen.findByRole("article", { name: "Role information" });
    await user.click(within(role).getByRole("button", { name: "Edit Role" }));
    await user.type(within(role).getByLabelText("Value"), "Captain");
    await user.click(within(role).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.setFieldValue).toHaveBeenCalledWith({
      candidatureId,
      fieldId: roleId,
      value: "Captain",
    }));
    expect(screen.getByRole("region", { name: "Sources" })).toBeVisible();
  });

  it("recognizes a saved raw-only application from retained Source and reopens it with Source immediately reachable", async () => {
    installApi();
    const user = userEvent.setup();
    const raw = "  Aster Aviation seeks a captain.\nKeep this exact text.  ";
    render(<CandidaturesAiWorkspace />);

    await user.click(screen.getByRole("button", { name: "New application" }));
    await user.click(screen.getByRole("button", { name: /Retain raw material/ }));
    await user.type(screen.getByLabelText("Application raw material"), raw);
    await user.click(screen.getByRole("button", { name: "Retain raw material" }));

    await screen.findByRole("region", { name: "Raw material continuation" });
    await user.click(screen.getByRole("button", { name: "← Applications" }));
    const corpus = screen.getByLabelText("Application corpus");
    const entry = within(corpus).getByRole("button", { name: "Open saved application" });
    expect(within(entry).getByText("Retained source")).toBeVisible();
    expect(entry).toHaveTextContent("Aster Aviation seeks a captain. Keep this exact text.");

    await user.click(entry);
    expect(await screen.findByRole("region", { name: "Sources" })).toBeVisible();
    const role = screen.getByRole("article", { name: "Role information" });
    expect(within(role).getByRole("button", { name: "Edit Role" })).toBeVisible();
  });

  it("keeps the retained Source and manual continuation available when the AI continuation fails", async () => {
    installApi();
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await user.click(screen.getByRole("button", { name: "New application" }));
    await user.click(screen.getByRole("button", { name: /Retain raw material/ }));
    await user.type(screen.getByLabelText("Application raw material"), "Offer text");
    await user.click(screen.getByRole("button", { name: "Retain raw material" }));

    const continuation = await screen.findByRole("region", { name: "Raw material continuation" });
    await user.click(within(continuation).getByRole("button", { name: "Use AI to suggest information" }));

    expect(await screen.findByRole("region", { name: "Sources" })).toBeVisible();
    expect(await screen.findByRole("alert")).toHaveTextContent("Provider unavailable");
    expect(screen.getByRole("button", { name: "Fill information manually" })).toBeVisible();
  });

  it("keeps dirty-state protection while leaving an unfinished raw capture", async () => {
    installApi();
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CandidaturesAiWorkspace />);

    await user.click(screen.getByRole("button", { name: "New application" }));
    await user.click(screen.getByRole("button", { name: /Retain raw material/ }));
    await user.type(screen.getByLabelText("Application raw material"), "Unsaved offer");
    await user.click(screen.getByRole("button", { name: "Applications" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved application edits?");
    expect(screen.getByLabelText("Application raw material")).toHaveValue("Unsaved offer");
  });
});
