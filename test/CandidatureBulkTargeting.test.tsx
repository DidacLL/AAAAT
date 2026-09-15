import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/CandidatureActivityPanel", () => ({ CandidatureActivityPanel: () => null }));
vi.mock("../src/renderer/CandidatureApplicationMaterialPanel", () => ({ CandidatureApplicationMaterialPanel: () => null }));
vi.mock("../src/renderer/CandidatureBulkAiReview", () => ({ CandidatureBulkAiReview: () => null }));
vi.mock("../src/renderer/CandidatureFieldAiState", () => ({ CandidatureFieldAiState: () => null }));
vi.mock("../src/renderer/CandidatureFieldDefinitionsPanel", () => ({ CandidatureFieldDefinitionsPanel: () => null }));
vi.mock("../src/renderer/CandidatureFieldValueEditor", () => ({ CandidatureFieldValueEditor: () => null }));
vi.mock("../src/renderer/CandidatureFocusPanel", () => ({ CandidatureFocusPanel: () => null }));
vi.mock("../src/renderer/CandidatureOfferPanel", () => ({ CandidatureOfferPanel: () => null }));
vi.mock("../src/renderer/CandidatureSourcesPanel", () => ({ CandidatureSourcesPanel: () => null }));
vi.mock("../src/renderer/CandidatureInferencePanel", () => ({
  CandidatureInferencePanel: ({
    targetFieldIds,
    title,
  }: {
    readonly targetFieldIds: readonly string[];
    readonly title: string;
  }) => <div data-testid={`inference-${title}`}>{targetFieldIds.join(",")}</div>,
}));

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type { CandidatureFieldConfiguration, CandidatureRecord } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000008001";
const organisationId = "00000000-0000-4000-8000-000000008002";
const roleId = "00000000-0000-4000-8000-000000008003";
const locationId = "00000000-0000-4000-8000-000000008004";
const disabledId = "00000000-0000-4000-8000-000000008005";

function field(id: string, label: string, enabled = true): CandidatureFieldConfiguration {
  return {
    definition: {
      id,
      systemKey: null,
      label,
      description: `${label} description`,
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled,
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
  field(disabledId, "Disabled information", false),
];

const candidature: CandidatureRecord = {
  id: candidatureId,
  archived: false,
  createdAt: "2026-09-15T00:00:00.000Z",
  updatedAt: "2026-09-15T00:00:00.000Z",
  label: "Aster Captain",
  sourceSearchText: "Aster Captain Madrid",
  values: [
    {
      candidatureId,
      fieldId: roleId,
      value: "Captain",
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    },
  ],
  documentIds: [],
  tagIds: [],
};

function installApi(): void {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: {
        list: vi.fn(async () => [candidature]),
        listFields: vi.fn(async () => fields),
        listTags: vi.fn(async () => []),
      },
      documents: { list: vi.fn(async () => []) },
      candidatureSearch: { search: vi.fn(async () => [candidatureId]) },
    },
  });
}

describe("bulk candidature mutation targeting", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("passes only enabled missing fields to the bulk inference request", async () => {
    installApi();
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await screen.findByLabelText("Candidature corpus Focus");
    await user.click(screen.getByRole("button", { name: "All details" }));
    const detail = await screen.findByRole("region", { name: "Complete candidature" });
    await user.click(within(detail).getByRole("button", { name: "Ask AI to fill missing information" }));

    expect(await screen.findByTestId("inference-Fill missing information")).toHaveTextContent(
      `${organisationId},${locationId}`,
    );
    expect(screen.getByTestId("inference-Fill missing information")).not.toHaveTextContent(roleId);
    expect(screen.getByTestId("inference-Fill missing information")).not.toHaveTextContent(disabledId);
  });
});
