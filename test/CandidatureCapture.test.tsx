import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/JobExtractionPanel", () => ({
  JobExtractionPanel: () => null,
}));
vi.mock("../src/renderer/OpportunityReviewPanel", () => ({
  OpportunityReviewPanel: () => null,
}));
vi.mock("../src/renderer/VariantRecommendationPanel", () => ({
  VariantRecommendationPanel: () => null,
}));

import { CandidaturesAiWorkspace } from "../src/renderer/CandidaturesAiWorkspace";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  DesktopApi,
} from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000701";
const sourceId = "00000000-0000-4000-8000-000000000702";
const fieldId = "00000000-0000-4000-8000-000000000703";
const olderCandidatureId = "00000000-0000-4000-8000-000000000704";
const now = "2026-09-07T00:00:00.000Z";
const phrase = "Recruiter asks whether I can start in October.";

const organisationField: CandidatureFieldConfiguration = {
  definition: {
    id: fieldId,
    systemKey: "organisation",
    label: "Organisation",
    description: "Organisation name",
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
    aiDiscovery: false,
    aiContextMode: "omit",
  },
};

function candidature(
  values: CandidatureRecord["values"] = [],
  label = "Recruiter message",
): CandidatureRecord {
  return {
    id: candidatureId,
    archived: false,
    createdAt: now,
    updatedAt: now,
    label,
    sourceSearchText: phrase,
    values,
    documentIds: [],
    conceptIds: [],
  };
}

const create = vi.fn();
const list = vi.fn();
let persisted: CandidatureRecord[] = [];

function installApi(initial: CandidatureRecord[] = [], fields: CandidatureFieldConfiguration[] = []) {
  persisted = [...initial];
  list.mockImplementation(async () => [...persisted]);
  create.mockImplementation(async () => {
    const created = candidature();
    persisted = [created, ...persisted];
    return created;
  });

  const api = {
    candidatures: {
      list,
      create,
      update: vi.fn(),
      filter: vi.fn().mockResolvedValue([]),
      listFields: vi.fn().mockResolvedValue(fields),
      createField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      updateFieldPreferences: vi.fn(),
      setFieldValue: vi.fn(),
      clearFieldValue: vi.fn(),
      listSources: vi.fn().mockImplementation(async () =>
        persisted.length > 0
          ? [{
              id: sourceId,
              candidatureId,
              kind: "other",
              title: "",
              url: "",
              sourceText: phrase,
              createdAt: now,
              updatedAt: now,
            }]
          : [],
      ),
      addSource: vi.fn(),
      updateSource: vi.fn(),
      removeSource: vi.fn(),
      setDocuments: vi.fn(),
      listConcepts: vi.fn().mockResolvedValue([]),
      createConcept: vi.fn(),
      updateConcept: vi.fn(),
      setConcepts: vi.fn(),
    },
    candidatureSearch: {
      search: vi.fn().mockImplementation(async () =>
        persisted.length > 0 ? persisted.map((record) => record.id) : [],
      ),
    },
    documents: { list: vi.fn().mockResolvedValue([]) },
    todos: { list: vi.fn().mockResolvedValue([]) },
    focus: {
      current: vi.fn().mockResolvedValue({
        sources: true,
        concepts: true,
        todos: true,
        documents: true,
      }),
      update: vi.fn(),
    },
    ai: { discoverField: vi.fn() },
  } as unknown as DesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

describe("sparse candidature capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps capture transient until Save and cancels without creating a candidature", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("heading", { name: "Candidatures" });
    await user.click(screen.getByTestId("new-candidature-capture"));

    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Paste or add whatever you have." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save candidature" })).toBeDisabled();

    await user.type(screen.getByLabelText("What you have"), phrase);
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save candidature" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(confirm).toHaveBeenCalledWith("Discard this unsaved candidature capture?");
    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Paste or add whatever you have." })).not.toBeInTheDocument();
  });

  it("saves raw material as the initial Source and reloads the new candidature into Focus", async () => {
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("heading", { name: "Candidatures" });
    await user.click(screen.getByTestId("new-candidature-capture"));
    await user.type(screen.getByLabelText("What you have"), phrase);
    await user.click(screen.getByRole("button", { name: "Save candidature" }));

    expect(create).toHaveBeenCalledWith({
      source: {
        kind: "other",
        title: "",
        url: "",
        sourceText: phrase,
      },
      values: [],
    });

    const focus = await screen.findByRole("region", { name: "Candidature Focus" });
    expect(await within(focus).findByText(phrase)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Focus" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Back to candidatures" })).toBeInTheDocument();
  });

  it("selects the candidature returned by Save even when another active candidature is listed first", async () => {
    const older = {
      ...candidature([], "Older opportunity"),
      id: olderCandidatureId,
      sourceSearchText: "Older retained source",
    };
    installApi([older]);
    create.mockImplementationOnce(async () => {
      const created = candidature([], "New saved opportunity");
      persisted = [older, created];
      return created;
    });
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("heading", { name: "Candidatures" });
    await user.click(screen.getByTestId("new-candidature-capture"));
    await user.type(screen.getByLabelText("What you have"), phrase);
    await user.click(screen.getByRole("button", { name: "Save candidature" }));

    const createdButton = await screen.findByRole("button", { name: /New saved opportunity/ });
    const olderButton = screen.getByRole("button", { name: /Older opportunity/ });
    expect(createdButton).toHaveClass("selected-candidature");
    expect(olderButton).not.toHaveClass("selected-candidature");
    expect(screen.getByRole("heading", { name: "New saved opportunity" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Focus" })).toHaveAttribute("aria-selected", "true");
  });

  it("preserves collection search and archive state across selected candidature navigation", async () => {
    installApi([candidature()]);
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("region", { name: "Candidature Focus" });
    const search = screen.getByLabelText("Search retained information");
    const archive = screen.getByLabelText("Archive");
    await user.type(search, "October");
    await user.selectOptions(archive, "all");

    await user.click(screen.getByRole("button", { name: /Recruiter message/ }));
    expect(screen.getByRole("button", { name: "Back to candidatures" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to candidatures" }));
    expect(screen.queryByRole("button", { name: "Back to candidatures" })).not.toBeInTheDocument();
    expect(search).toHaveValue("October");
    expect(archive).toHaveValue("all");
  });

  it("preserves a dirty selected draft when returning to collection and reopening the same candidature", async () => {
    const retained = {
      candidatureId,
      fieldId,
      value: "Regional Air",
      createdAt: now,
      updatedAt: now,
    } as const;
    installApi([candidature([retained], "Regional Air")], [organisationField]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("region", { name: "Candidature Focus" });
    await user.click(screen.getByRole("button", { name: /Regional Air/ }));
    await user.click(screen.getByRole("tab", { name: "Information" }));
    const card = screen.getByRole("heading", { name: "Organisation" }).closest("article");
    expect(card).not.toBeNull();
    if (!card) return;
    await user.click(within(card).getByRole("button", { name: "Edit" }));
    const input = within(card).getByRole("textbox");
    await user.type(input, " unsaved");

    await user.click(screen.getByRole("button", { name: "Back to candidatures" }));
    await user.click(screen.getByRole("button", { name: /Regional Air/ }));

    expect(confirm).not.toHaveBeenCalled();
    expect(input).toHaveValue("Regional Air unsaved");
    expect(screen.getByRole("button", { name: "Back to candidatures" })).toBeInTheDocument();
  });

  it("does not discard an existing candidature draft when capture starts or a replacement save is cancelled", async () => {
    const retained = {
      candidatureId,
      fieldId,
      value: "Regional Air",
      createdAt: now,
      updatedAt: now,
    } as const;
    installApi([candidature([retained], "Regional Air")], [organisationField]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("region", { name: "Candidature Focus" });
    await user.click(screen.getByRole("tab", { name: "Information" }));
    const card = screen.getByRole("heading", { name: "Organisation" }).closest("article");
    expect(card).not.toBeNull();
    if (!card) return;
    await user.click(within(card).getByRole("button", { name: "Edit" }));
    const input = within(card).getByRole("textbox");
    await user.type(input, " unsaved");

    await user.click(screen.getByTestId("new-candidature-capture"));
    expect(input).toHaveValue("Regional Air unsaved");
    await user.type(screen.getByLabelText("What you have"), "Another opportunity");
    await user.click(screen.getByRole("button", { name: "Save candidature" }));

    expect(confirm).toHaveBeenCalledWith(
      "Discard unsaved candidature edits and save this new candidature?",
    );
    expect(create).not.toHaveBeenCalled();
    expect(input).toHaveValue("Regional Air unsaved");
    expect(screen.getByLabelText("What you have")).toHaveValue("Another opportunity");
  });
});
