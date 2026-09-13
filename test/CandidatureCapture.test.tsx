import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/JobExtractionPanel", () => ({
  JobExtractionPanel: () => null,
}));

import { CandidaturesAiWorkspace } from "../src/renderer/CandidaturesAiWorkspace";
import type { CandidatureRecord, DesktopApi } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000701";
const olderCandidatureId = "00000000-0000-4000-8000-000000000704";
const now = "2026-09-07T00:00:00.000Z";
const phrase = "Recruiter asks whether I can start in October.";

function candidature(label = "Recruiter message", id = candidatureId): CandidatureRecord {
  return {
    id,
    archived: false,
    createdAt: now,
    updatedAt: now,
    label,
    sourceSearchText: phrase,
    values: [],
    documentIds: [],
    tagIds: [],
  };
}

const create = vi.fn();
const list = vi.fn();
const search = vi.fn();
let persisted: CandidatureRecord[] = [];

function installApi(initial: CandidatureRecord[] = []) {
  persisted = [...initial];
  list.mockImplementation(async () => [...persisted]);
  create.mockImplementation(async () => {
    const created = candidature();
    persisted = [created, ...persisted];
    return created;
  });
  search.mockImplementation(async () => persisted.map((record) => record.id));

  const api = {
    candidatures: {
      list,
      create,
      update: vi.fn(),
      filter: vi.fn().mockResolvedValue([]),
      listFields: vi.fn().mockResolvedValue([]),
      createField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      updateFieldPreferences: vi.fn(),
      setFieldValue: vi.fn(),
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
    candidatureSearch: { search },
    documents: { list: vi.fn().mockResolvedValue([]) },
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
    expect(screen.getByRole("heading", { name: "Paste whatever you have." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save candidature" })).toBeDisabled();

    await user.type(screen.getByLabelText("Candidature material"), phrase);
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save candidature" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(confirm).toHaveBeenCalledWith("Discard this unsaved candidature capture?");
    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Paste whatever you have." })).not.toBeInTheDocument();
  });

  it("saves one raw material box as the initial Source and returns to corpus Focus", async () => {
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("heading", { name: "Candidatures" });
    await user.click(screen.getByTestId("new-candidature-capture"));
    await user.type(screen.getByLabelText("Candidature material"), phrase);
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

    expect(await screen.findByRole("region", { name: "Candidature corpus Focus" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Recruiter message/ })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Candidature Focus" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to candidatures" })).not.toBeInTheDocument();
  });

  it("does not force the saved candidature open even when another candidature is listed first", async () => {
    const older = candidature("Older opportunity", olderCandidatureId);
    installApi([older]);
    create.mockImplementationOnce(async () => {
      const created = candidature("New saved opportunity");
      persisted = [older, created];
      return created;
    });
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("heading", { name: "Candidatures" });
    await user.click(screen.getByTestId("new-candidature-capture"));
    await user.type(screen.getByLabelText("Candidature material"), phrase);
    await user.click(screen.getByRole("button", { name: "Save candidature" }));

    expect(await screen.findByRole("button", { name: /New saved opportunity/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Older opportunity/ })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Candidature Focus" })).not.toBeInTheDocument();
  });

  it("preserves corpus search and archive state across Focus navigation", async () => {
    installApi([candidature()]);
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    await screen.findByRole("region", { name: "Candidature corpus Focus" });
    await user.type(screen.getByLabelText("Search candidatures"), "October");
    await user.selectOptions(screen.getByLabelText("Show"), "all");

    await user.click(await screen.findByRole("button", { name: /Recruiter message/ }));
    expect(await screen.findByRole("region", { name: "Candidature Focus" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to candidatures" }));

    expect(screen.getByLabelText("Search candidatures")).toHaveValue("October");
    expect(screen.getByLabelText("Show")).toHaveValue("all");
  });
});
