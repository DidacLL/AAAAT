import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
} from "../src/shared/contracts";

vi.mock("../src/renderer/CandidatureActivityPanel", () => ({
  CandidatureActivityPanel: () => null,
}));
vi.mock("../src/renderer/CandidatureBulkAiReview", () => ({
  CandidatureBulkAiReview: () => null,
}));
vi.mock("../src/renderer/CandidatureFieldAiState", () => ({
  CandidatureFieldAiState: () => null,
}));
vi.mock("../src/renderer/CandidatureFieldDefinitionsPanel", () => ({
  CandidatureFieldDefinitionsPanel: () => null,
}));
vi.mock("../src/renderer/CandidatureFieldValueEditor", () => ({
  CandidatureFieldValueEditor: ({ value }: { value?: unknown }) => (
    <span>{value === undefined ? "Not set" : Array.isArray(value) ? value.join(", ") : String(value)}</span>
  ),
}));
vi.mock("../src/renderer/CandidatureInferencePanel", () => ({
  CandidatureInferencePanel: () => null,
}));
vi.mock("../src/renderer/CandidatureOfferPanel", () => ({
  CandidatureOfferPanel: () => <section aria-label="Offer">Offer material</section>,
}));
vi.mock("../src/renderer/CandidatureSourcesPanel", () => ({
  CandidatureSourcesPanel: () => <section aria-label="Sources">Sources</section>,
}));
vi.mock("../src/renderer/contextual-handoffs", () => ({
  useContextualHandoffs: () => ({
    documentHandoff: null,
    openDocumentFromCandidature: vi.fn(),
  }),
}));
vi.mock("../src/renderer/create-application-documents", () => ({
  createApplicationDocuments: vi.fn(async () => []),
}));

const roleId = "00000000-0000-4000-8000-000000000711";
const locationId = "00000000-0000-4000-8000-000000000712";
const candidatureId = "00000000-0000-4000-8000-000000000713";

function field(
  id: string,
  label: string,
  starred: boolean,
  order: number | null,
  prominence: "compact" | "normal" | "wide" = "normal",
): CandidatureFieldConfiguration {
  return {
    definition: {
      id,
      systemKey: null,
      label,
      description: "",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
      createdAt: "2026-09-18T00:00:00.000Z",
      updatedAt: "2026-09-18T00:00:00.000Z",
    },
    preferences: {
      fieldId: id,
      favourite: starred,
      favouriteOrder: order,
      presentationSize: prominence,
      aiUseAllowed: false,
    },
  };
}

function record(): CandidatureRecord {
  return {
    id: candidatureId,
    archived: false,
    createdAt: "2026-09-18T00:00:00.000Z",
    updatedAt: "2026-09-18T00:00:00.000Z",
    sourceSearchText: "A long retained Source that must not become ordinary corpus identity.",
    values: [
      {
        candidatureId,
        fieldId: locationId,
        value: "Madrid",
        createdAt: "2026-09-18T00:00:00.000Z",
        updatedAt: "2026-09-18T00:00:00.000Z",
      },
      {
        candidatureId,
        fieldId: roleId,
        value: "Pilot",
        createdAt: "2026-09-18T00:00:00.000Z",
        updatedAt: "2026-09-18T00:00:00.000Z",
      },
    ],
    tagIds: [],
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Applications information surface", () => {
  it("uses starred fields for compact recognition and moves star/order/size changes into the primary presentation", async () => {
    let savedFields = [
      field(locationId, "Location", true, 0, "compact"),
      field(roleId, "Role", false, null),
    ];
    const updateFieldPreferences = vi.fn(async (
      preferences: CandidatureFieldConfiguration["preferences"],
    ) => {
      const current = savedFields.find(
        (candidate) => candidate.definition.id === preferences.fieldId,
      );
      if (!current) throw new Error("missing field");
      const saved = { ...current, preferences: { ...preferences } };
      savedFields = savedFields.map((candidate) =>
        candidate.definition.id === saved.definition.id ? saved : candidate,
      );
      return saved;
    });
    const reorderFavouriteFields = vi.fn(async (fieldIds: string[]) => {
      savedFields = savedFields.map((candidate) => {
        const order = fieldIds.indexOf(candidate.definition.id);
        return order >= 0
          ? { ...candidate, preferences: { ...candidate.preferences, favouriteOrder: order } }
          : candidate;
      });
      return savedFields;
    });


    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        candidatures: {
          list: vi.fn(async () => [record()]),
          listFields: vi.fn(async () => savedFields),
          listTags: vi.fn(async () => []),
          listSources: vi.fn(async () => []),
          updateFieldPreferences,
          reorderFavouriteFields,
        },
        candidatureSearch: {
          search: vi.fn(async () => [candidatureId]),
        },
        documentDomain: {
          collections: vi.fn(async () => ({
            templates: [],
            workingCvs: [],
            renderedCvs: [],
            letters: [],
            applicationPackets: [],
          })),
        },
      },
    });

    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    const corpus = await screen.findByLabelText("Application corpus");
    const entry = within(corpus).getByRole("button", { name: "Open saved application" });
    const locationCue = within(entry).getByText("Madrid").closest(".candidature-recognition-cue");
    expect(locationCue).not.toBeNull();
    expect(locationCue).toHaveTextContent("Madrid");
    expect(locationCue).toHaveClass("candidature-cue-size-compact");
    expect(entry).not.toHaveTextContent("Pilot");
    expect(entry).not.toHaveTextContent("A long retained Source");

    await user.click(entry);
    const primary = await screen.findByRole("region", {
      name: "Starred application information",
    });
    expect(within(primary).getByRole("article", { name: "Location information" })).toBeVisible();
    expect(within(primary).queryByRole("article", { name: "Role information" })).not.toBeInTheDocument();

    await user.click(screen.getByText("More"));
    const role = screen.getByRole("article", { name: "Role information" });
    await user.click(within(role).getByRole("button", { name: "Star Role" }));

    await waitFor(() => {
      expect(
        within(primary).getByRole("article", { name: "Role information" }),
      ).toBeVisible();
    });
    expect(updateFieldPreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldId: roleId,
        favourite: true,
        favouriteOrder: null,
      }),
    );

    const primaryRole = within(primary).getByRole("article", { name: "Role information" });
    await user.click(within(primaryRole).getByRole("button", { name: "Move Role up" }));
    await waitFor(() => {
      expect(reorderFavouriteFields).toHaveBeenCalledWith([roleId, locationId]);
    });

    await user.selectOptions(
      within(primaryRole).getByRole("combobox", { name: "Role card size" }),
      "wide",
    );
    await waitFor(() =>
      expect(updateFieldPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ fieldId: roleId, presentationSize: "wide" }),
      ),
    );
    expect(
      within(primary).getByRole("article", { name: "Role information" }),
    ).not.toHaveClass("candidature-presentation-wide");

    await user.click(screen.getByRole("button", { name: "← Applications" }));
    const refreshedCorpus = await screen.findByLabelText("Application corpus");
    const roleCue = within(refreshedCorpus).getByText("Pilot").closest(".candidature-recognition-cue");
    expect(roleCue).toHaveClass("candidature-cue-size-wide");
  });
});
