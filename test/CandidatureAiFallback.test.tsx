import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ContextualHandoffContext,
  type ContextualHandoffApi,
} from "../src/renderer/contextual-handoffs";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  DesktopApi,
} from "../src/shared/contracts";

vi.mock("../src/renderer/OpportunityReviewPanel", () => ({ OpportunityReviewPanel: () => null }));
vi.mock("../src/renderer/VariantRecommendationPanel", () => ({ VariantRecommendationPanel: () => null }));
vi.mock("../src/renderer/CandidatureFocusPanel", () => ({
  CandidatureFocusPanel: () => <section aria-label="Mock Focus" />,
}));
vi.mock("../src/renderer/CandidatureSourcesPanel", () => ({ CandidatureSourcesPanel: () => null }));

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";

const candidatureId = "00000000-0000-4000-8000-000000000811";
const fieldId = "00000000-0000-4000-8000-000000000812";
const sourceId = "00000000-0000-4000-8000-000000000813";
const timestamp = "2026-09-09T00:00:00.000Z";

const candidature: CandidatureRecord = {
  id: candidatureId,
  archived: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  label: "AI fallback opportunity",
  sourceSearchText: "retained source",
  values: [
    {
      candidatureId,
      fieldId,
      value: "Existing value",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  documentIds: [],
  conceptIds: [],
};

const field: CandidatureFieldConfiguration = {
  definition: {
    id: fieldId,
    systemKey: null,
    label: "Role",
    description: "Opportunity role",
    valueType: "text",
    cardinality: "one",
    choices: [],
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  preferences: {
    fieldId,
    focusVisible: true,
    focusOrder: 0,
    focusProminence: "normal",
    identityOrder: null,
    aiDiscovery: true,
    aiContextMode: "expose",
  },
};

const discoverField = vi.fn();
const openSettingsFor = vi.fn();

function handoffs(): ContextualHandoffApi {
  return {
    documentHandoff: null,
    professionalInformationHandoff: null,
    settingsHandoff: null,
    openDocumentFromCandidature: vi.fn(),
    returnToCandidature: vi.fn(),
    openProfessionalInformationItem: vi.fn(),
    returnToDocument: vi.fn(),
    openSettingsFor,
    returnFromSettings: vi.fn(),
  };
}

function installApi() {
  discoverField.mockRejectedValue(new Error("No validated AI route is available."));
  const api = {
    candidatures: {
      list: vi.fn().mockResolvedValue([candidature]),
      listFields: vi.fn().mockResolvedValue([field]),
      listConcepts: vi.fn().mockResolvedValue([]),
      listSources: vi.fn().mockResolvedValue([
        {
          id: sourceId,
          candidatureId,
          kind: "job_posting",
          title: "Retained source",
          url: "",
          sourceText: "Role information",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]),
      update: vi.fn(),
      filter: vi.fn().mockResolvedValue([candidatureId]),
      createField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      updateFieldPreferences: vi.fn(),
      setFieldValue: vi.fn(),
      clearFieldValue: vi.fn(),
      setDocuments: vi.fn(),
      createConcept: vi.fn(),
      updateConcept: vi.fn(),
      setConcepts: vi.fn(),
    },
    documents: { list: vi.fn().mockResolvedValue([]) },
    candidatureSearch: { search: vi.fn().mockResolvedValue([]) },
    ai: { discoverField },
    setupEnvironment: {
      current: vi.fn().mockResolvedValue({
        ai: {
          operations: [{ operation: "historical_field_discovery", available: false }],
        },
      }),
    },
  } as unknown as DesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("candidature AI Settings fallback", () => {
  it("routes unavailable selected-Source discovery to AI connections and preserves candidature origin", async () => {
    installApi();
    const user = userEvent.setup();
    render(
      <ContextualHandoffContext.Provider value={handoffs()}>
        <CandidaturesWorkspace />
      </ContextualHandoffContext.Provider>,
    );

    await user.click(await screen.findByRole("tab", { name: "Information" }));
    const information = screen.getByRole("region", { name: "Candidature information" });
    const role = within(information).getByRole("heading", { name: "Role" }).closest("article");
    if (!role) throw new Error("Retained Role information missing");
    await user.click(within(role).getByRole("button", { name: "Edit" }));
    await user.click(within(role).getByRole("button", { name: "Discover from Sources" }));

    const discovery = await screen.findByRole("dialog", { name: "Historical Source discovery" });
    const send = within(discovery).getByRole("button", { name: "Send selected Sources to AI" });
    expect(send).toBeDisabled();
    expect(discoverField).not.toHaveBeenCalled();

    await user.click(within(discovery).getByRole("checkbox", { name: "Retained source" }));
    await user.click(send);

    expect(discoverField).toHaveBeenCalledWith({
      candidatureId,
      fieldId,
      sourceIds: [sourceId],
    });
    await vi.waitFor(() => {
      expect(openSettingsFor).toHaveBeenCalledWith("ai", "candidatures");
    });
    expect(screen.getByRole("heading", { name: "AI fallback opportunity" })).toBeInTheDocument();
  });
});
