import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/contextual-handoffs", () => ({
  useContextualHandoffs: () => ({
    documentHandoff: null,
    openDocumentFromCandidature: vi.fn(),
  }),
}));
vi.mock("../src/renderer/CandidatureActivityPanel", () => ({ CandidatureActivityPanel: () => null }));
vi.mock("../src/renderer/CandidatureBulkAiReview", () => ({ CandidatureBulkAiReview: () => null }));
vi.mock("../src/renderer/CandidatureFieldAiState", () => ({ CandidatureFieldAiState: () => null }));
vi.mock("../src/renderer/CandidatureFieldDefinitionsPanel", () => ({ CandidatureFieldDefinitionsPanel: () => null }));
vi.mock("../src/renderer/CandidatureFieldValueEditor", () => ({ CandidatureFieldValueEditor: () => null }));
vi.mock("../src/renderer/CandidatureInferencePanel", () => ({ CandidatureInferencePanel: () => null }));
vi.mock("../src/renderer/CandidatureOfferPanel", () => ({ CandidatureOfferPanel: () => null }));
vi.mock("../src/renderer/CandidatureOpportunityResearchAccessPanel", () => ({
  CandidatureOpportunityResearchAccessPanel: () => null,
}));
vi.mock("../src/renderer/CandidatureSourcesPanel", () => ({ CandidatureSourcesPanel: () => null }));

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  TagRecord,
} from "../src/shared/contracts";
import type { ApplicationTagContext } from "../src/renderer/TagVisor";

const now = "2026-10-02T08:00:00.000Z";
const firstId = "00000000-0000-4000-8000-000000003800";
const secondId = "00000000-0000-4000-8000-000000003801";
const firstTagId = "00000000-0000-4000-8000-000000003802";
const secondTagId = "00000000-0000-4000-8000-000000003803";

const fieldIds = [
  "00000000-0000-4000-8000-000000003810",
  "00000000-0000-4000-8000-000000003811",
  "00000000-0000-4000-8000-000000003812",
  "00000000-0000-4000-8000-000000003813",
  "00000000-0000-4000-8000-000000003814",
] as const;

const fields: CandidatureFieldConfiguration[] = fieldIds.map((id, index) => ({
  definition: {
    id,
    systemKey: null,
    label: `Recognition ${index + 1}`,
    description: "",
    valueType: "text",
    cardinality: "one",
    choices: [],
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
  preferences: {
    fieldId: id,
    favourite: true,
    favouriteOrder: index,
    presentationSize: index === 0 ? "wide" : index === 1 ? "compact" : "normal",
    aiUseAllowed: false,
  },
}));

function record(id: string, prefix: string, tagId: string): CandidatureRecord {
  return {
    id,
    archived: false,
    createdAt: now,
    updatedAt: now,
    sourceSearchText: "",
    values: fieldIds.map((fieldId, index) => ({
      candidatureId: id,
      fieldId,
      value: `${prefix} value ${index + 1}`,
      createdAt: now,
      updatedAt: now,
    })),
    tagIds: [tagId],
  };
}

const tags: TagRecord[] = [
  {
    id: firstTagId,
    name: "Reliability",
    aliases: ["SRE"],
    definition: "Dependable production ownership",
  },
  {
    id: secondTagId,
    name: "Accessibility",
    aliases: ["A11y"],
    definition: "Inclusive product and interface practice",
  },
];

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: {
        list: vi.fn(async () => [
          record(firstId, "First", firstTagId),
          record(secondId, "Second", secondTagId),
        ]),
        listFields: vi.fn(async () => fields),
        listTags: vi.fn(async () => tags),
        listSources: vi.fn(async () => []),
      },
      candidatureSearch: { search: vi.fn(async () => []) },
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
    },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("application corpus inspection", () => {
  it("defaults From to All, shows attached Tags, and keeps exactly one expanded preselection", async () => {
    installApi();
    const user = userEvent.setup();
    const onTagContextChange = vi.fn<(context: ApplicationTagContext | null) => void>();
    render(<CandidaturesWorkspace onTagContextChange={onTagContextChange} />);

    expect(await screen.findByLabelText("From")).toHaveValue("all");
    const inspectButtons = await screen.findAllByRole("button", { name: "Inspect saved application" });
    expect(inspectButtons).toHaveLength(2);
    expect(within(inspectButtons[0]!).getByText("Reliability")).toBeVisible();
    expect(within(inspectButtons[1]!).getByText("Accessibility")).toBeVisible();
    expect(screen.queryByText("First value 5")).not.toBeInTheDocument();

    await user.click(inspectButtons[0]!);
    expect(screen.queryByRole("region", { name: "Application information" })).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Application inspection")).toHaveLength(1);
    expect(screen.getByText("First value 5")).toBeVisible();
    expect(screen.getByLabelText("Tag meanings")).toHaveTextContent("Dependable production ownership");
    await waitFor(() => expect(onTagContextChange).toHaveBeenLastCalledWith(expect.objectContaining({
      candidatureId: firstId,
      tags: [expect.objectContaining({ name: "Reliability" })],
    })));

    await user.click(screen.getByRole("button", { name: "Inspect saved application" }));
    expect(screen.getAllByLabelText("Application inspection")).toHaveLength(1);
    expect(screen.queryByText("First value 5")).not.toBeInTheDocument();
    expect(screen.getByText("Second value 5")).toBeVisible();
    expect(screen.getByLabelText("Tag meanings")).toHaveTextContent("Inclusive product and interface practice");
    await waitFor(() => expect(onTagContextChange).toHaveBeenLastCalledWith(expect.objectContaining({
      candidatureId: secondId,
    })));
  });

  it("opens the exact preselected application on second activation and through explicit Open/Edit", async () => {
    installApi();
    const user = userEvent.setup();
    const onTagContextChange = vi.fn<(context: ApplicationTagContext | null) => void>();
    const { unmount } = render(<CandidaturesWorkspace onTagContextChange={onTagContextChange} />);

    const firstInspect = (await screen.findAllByRole("button", { name: "Inspect saved application" }))[0]!;
    await user.click(firstInspect);
    await user.click(screen.getByRole("button", { name: "Open saved application" }));
    expect(await screen.findByRole("region", { name: "Application information" })).toBeVisible();
    await waitFor(() => expect(onTagContextChange).toHaveBeenLastCalledWith(expect.objectContaining({
      candidatureId: firstId,
    })));

    unmount();
    onTagContextChange.mockClear();
    render(<CandidaturesWorkspace onTagContextChange={onTagContextChange} />);
    const secondInspect = (await screen.findAllByRole("button", { name: "Inspect saved application" }))[1]!;
    await user.click(secondInspect);
    await user.click(screen.getByRole("button", { name: "Open application" }));
    expect(await screen.findByRole("region", { name: "Application information" })).toBeVisible();
    await waitFor(() => expect(onTagContextChange).toHaveBeenLastCalledWith(expect.objectContaining({
      candidatureId: secondId,
    })));
  });
});
