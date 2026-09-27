import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/contextual-handoffs", () => ({
  useContextualHandoffs: () => ({
    documentHandoff: null,
    openDocumentFromCandidature: () => undefined,
  }),
}));
vi.mock("../src/renderer/CandidatureBulkAiReview", () => ({
  CandidatureBulkAiReview: () => null,
}));
vi.mock("../src/renderer/CandidatureFieldAiState", () => ({
  CandidatureFieldAiState: () => null,
}));
vi.mock("../src/renderer/CandidatureOfferPanel", () => ({
  CandidatureOfferPanel: () => null,
}));
vi.mock("../src/renderer/CandidatureSourcesPanel", () => ({
  CandidatureSourcesPanel: () => null,
}));

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
} from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000551";
const fieldId = "00000000-0000-4000-8000-000000000552";
const current = vi.fn();
const update = vi.fn();
const exportTask = vi.fn();
const importResult = vi.fn();

function field(): CandidatureFieldConfiguration {
  return {
    definition: {
      id: fieldId,
      systemKey: "candidature.role",
      label: "Role",
      description: "Target role",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
      createdAt: "2026-09-25T00:00:00.000Z",
      updatedAt: "2026-09-25T00:00:00.000Z",
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
    createdAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-09-25T00:00:00.000Z",
    sourceSearchText: "Platform Engineer",
    values: [{
      candidatureId,
      fieldId,
      value: "Platform Engineer",
      createdAt: "2026-09-25T00:00:00.000Z",
      updatedAt: "2026-09-25T00:00:00.000Z",
    }],
    tagIds: [],
  };
}

function installApi() {
  const stored = record();
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: {
        list: vi.fn(async () => [stored]),
        listFields: vi.fn(async () => [field()]),
        listTags: vi.fn(async () => []),
        listSources: vi.fn(async () => []),
      },
      documentDomain: {
        collections: vi.fn(async () => ({
          templates: [],
          workingCvs: [],
          renderedCvs: [],
          letters: [],
          renderedLetters: [],
          applicationPackets: [],
        })),
      },
      candidatureOpportunityResearchAccess: { current, update, exportTask, importResult },
    },
  });
}

function prepareAccessApi() {
  current.mockResolvedValue({ candidatureId, allowed: false });
  update.mockImplementation(async ({ allowed }: { readonly allowed: boolean }) => ({
    candidatureId,
    allowed,
  }));
  exportTask.mockResolvedValue("exported");
  importResult.mockResolvedValue("imported");
  installApi();
}

async function openSelectedCandidature(user: ReturnType<typeof userEvent.setup>) {
  render(<CandidaturesWorkspace />);
  await user.click(await screen.findByRole("button", { name: "Open saved application" }));
  await user.click(screen.getByText("More"));
  return screen.findByRole("button", { name: "Use this application with external AI" });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("selected candidature opportunity-research access", () => {
  it("lets the user enable the existing task and revokes it when retained candidature context becomes dirty", async () => {
    prepareAccessApi();
    const user = userEvent.setup();

    const allow = await openSelectedCandidature(user);
    expect(allow).toBeVisible();

    await user.click(allow);
    expect(update).toHaveBeenCalledWith({ candidatureId, allowed: true });
    expect(
      await screen.findByText(/External AI can now work with this application/i),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Stop external AI access" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Edit Role" }));
    const value = screen.getByLabelText("Value");
    await user.clear(value);
    await user.type(value, "Staff Platform Engineer");

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ candidatureId, allowed: false }),
    );
    expect(
      await screen.findByText(/turned off because this application has unsaved edits/i),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Use this application with external AI" }),
    ).toBeDisabled();
  });

  it("revokes enabled access while an Add information draft is dirty", async () => {
    prepareAccessApi();
    const user = userEvent.setup();

    const allow = await openSelectedCandidature(user);
    await user.click(allow);
    expect(update).toHaveBeenCalledWith({ candidatureId, allowed: true });
    expect(screen.getByRole("button", { name: "Stop external AI access" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Add information" }));
    await user.type(screen.getByPlaceholderText("Flight hours"), "Seniority");

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ candidatureId, allowed: false }),
    );
    expect(
      await screen.findByText(/turned off because this application has unsaved edits/i),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Use this application with external AI" }),
    ).toBeDisabled();
  });

  it("offers the portable no-local task and result actions only after access is enabled", async () => {
    prepareAccessApi();
    const user = userEvent.setup();

    const allow = await openSelectedCandidature(user);
    expect(screen.queryByRole("button", { name: "Export task…" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Import result…" })).toBeNull();

    await user.click(allow);

    const exportButton = screen.getByRole("button", { name: "Export task…" });
    const importButton = screen.getByRole("button", { name: "Import result…" });
    expect(exportButton).toBeEnabled();
    expect(importButton).toBeEnabled();

    await user.click(exportButton);
    expect(exportTask).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Task exported/i)).toBeVisible();

    await user.click(importButton);
    expect(importResult).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Result saved as a Source/i)).toBeVisible();
  });
});
