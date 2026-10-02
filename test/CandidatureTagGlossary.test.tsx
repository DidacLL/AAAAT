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
vi.mock("../src/renderer/CandidatureOfferPanel", () => ({ CandidatureOfferPanel: () => null }));
vi.mock("../src/renderer/CandidatureSourcesPanel", () => ({ CandidatureSourcesPanel: () => null }));
vi.mock("../src/renderer/CandidatureOpportunityResearchAccessPanel", () => ({
  CandidatureOpportunityResearchAccessPanel: () => null,
}));

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type { CandidatureRecord, TagInput, TagRecord, TagUpdate } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000003692";
const reliabilityId = "00000000-0000-4000-8000-000000003693";
const operationsId = "00000000-0000-4000-8000-000000003694";
const createdId = "00000000-0000-4000-8000-000000003695";

const reliability: TagRecord = {
  id: reliabilityId,
  name: "Reliability engineering",
  aliases: ["SRE", "Site reliability"],
  definition: "Operating dependable production systems",
  notes: "Ask about incident ownership",
};
const operations: TagRecord = {
  id: operationsId,
  name: "Platform operations",
  aliases: ["Ops"],
  definition: "Operational ownership of the platform",
};

function record(tagIds: string[] = [reliabilityId]): CandidatureRecord {
  return {
    id: candidatureId,
    archived: false,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    sourceSearchText: "Platform role",
    values: [],
    tagIds,
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
  let tags: TagRecord[] = [reliability, operations];
  let stored = record();

  const setTags = vi.fn(async ({ tagIds }: { candidatureId: string; tagIds: string[] }) => {
    stored = { ...stored, tagIds: [...tagIds] };
    return stored;
  });
  const createTag = vi.fn(async (input: TagInput) => {
    const saved: TagRecord = { id: createdId, ...input };
    tags = [...tags, saved];
    return saved;
  });
  const updateTag = vi.fn(async (input: TagUpdate) => {
    const saved: TagRecord = { ...input };
    tags = tags.map((tag) => tag.id === saved.id ? saved : tag);
    return saved;
  });

  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: {
        list: vi.fn(async () => [stored]),
        listFields: vi.fn(async () => []),
        listTags: vi.fn(async () => tags),
        listSources: vi.fn(async () => []),
        setTags,
        createTag,
        updateTag,
      },
      candidatureSearch: { search: vi.fn(async () => []) },
      documentDomain: { collections: vi.fn(async () => emptyCollections) },
    },
  });

  return { setTags, createTag, updateTag };
}

async function openSelected(user: ReturnType<typeof userEvent.setup>, onTagGlossaryChange = vi.fn()) {
  render(
    <CandidaturesWorkspace
      onDirtyChange={vi.fn()}
      onTagGlossaryChange={onTagGlossaryChange}
    />,
  );
  await user.click(await screen.findByRole("button", { name: "Inspect saved application" }));
  await user.click(screen.getByRole("button", { name: "Open application" }));
  return { tagsRegion: screen.getByRole("region", { name: "Tags" }), onTagGlossaryChange };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("selected application Tags", () => {
  it("keeps one direct compact Tag surface with attach, detach and stored shared meaning", async () => {
    const api = installApi();
    const user = userEvent.setup();
    const glossaryChange = vi.fn();
    const { tagsRegion } = await openSelected(user, glossaryChange);

    expect(tagsRegion).toBeVisible();
    expect(screen.getAllByRole("region", { name: "Tags", hidden: true })).toHaveLength(1);
    expect(screen.queryByText("More", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("Sources, documents & history")).toBeVisible();
    expect(screen.queryByText(operations.name)).not.toBeInTheDocument();

    await user.click(within(tagsRegion).getByRole("button", { name: reliability.name }));
    expect(tagsRegion).toHaveTextContent(reliability.name);
    expect(tagsRegion).toHaveTextContent("SRE, Site reliability");
    expect(tagsRegion).toHaveTextContent(reliability.definition);
    expect(tagsRegion).toHaveTextContent(reliability.notes!);

    const attach = within(tagsRegion).getByRole("searchbox", { name: "Attach Tag" });
    await user.type(attach, "oPs");
    await user.click(within(tagsRegion).getByRole("button", { name: operations.name }));
    await waitFor(() => expect(api.setTags).toHaveBeenCalledWith({
      candidatureId,
      tagIds: [reliabilityId, operationsId],
    }));
    expect(within(tagsRegion).getByRole("button", { name: operations.name })).toBeVisible();
    expect(glossaryChange).not.toHaveBeenCalled();

    await user.click(within(tagsRegion).getByRole("button", { name: `Remove ${reliability.name}` }));
    await waitFor(() => expect(api.setTags).toHaveBeenLastCalledWith({
      candidatureId,
      tagIds: [operationsId],
    }));
    expect(glossaryChange).not.toHaveBeenCalled();
  });

  it("creates a missing Tag only with a real definition, attaches it, and refreshes glossary readers", async () => {
    const api = installApi();
    const user = userEvent.setup();
    const glossaryChange = vi.fn();
    const { tagsRegion } = await openSelected(user, glossaryChange);

    await user.type(within(tagsRegion).getByRole("searchbox", { name: "Attach Tag" }), "Flight safety");
    await user.click(within(tagsRegion).getByRole("button", { name: "Create “Flight safety”" }));

    const save = within(tagsRegion).getByRole("button", { name: "Save Tag" });
    expect(save).toBeDisabled();
    expect(within(tagsRegion).getByRole("textbox", { name: "Name" })).toHaveValue("Flight safety");
    await user.type(
      within(tagsRegion).getByRole("textbox", { name: "Definition" }),
      "Shared vocabulary for safety responsibilities and operating discipline",
    );
    await user.click(save);

    await waitFor(() => expect(api.createTag).toHaveBeenCalledWith(expect.objectContaining({
      name: "Flight safety",
      definition: "Shared vocabulary for safety responsibilities and operating discipline",
    })));
    expect(api.setTags).toHaveBeenCalledWith({
      candidatureId,
      tagIds: [reliabilityId, createdId],
    });
    expect(glossaryChange).toHaveBeenCalledTimes(1);
    expect(within(tagsRegion).getByRole("button", { name: "Flight safety" })).toBeVisible();
  });

  it("keeps shared Tag editing contextual and protects a dirty edit from silent discard", async () => {
    const api = installApi();
    const user = userEvent.setup();
    const glossaryChange = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { tagsRegion } = await openSelected(user, glossaryChange);

    await user.click(within(tagsRegion).getByRole("button", { name: reliability.name }));
    await user.click(within(tagsRegion).getByRole("button", { name: "Edit shared Tag" }));
    const definition = within(tagsRegion).getByRole("textbox", { name: "Definition" });
    await user.clear(definition);
    await user.type(definition, "Dependable systems with explicit incident ownership");

    await user.click(within(tagsRegion).getByRole("button", { name: "Close" }));
    expect(confirm).toHaveBeenCalledWith("Discard unsaved Tag edits?");
    expect(definition).toHaveValue("Dependable systems with explicit incident ownership");

    await user.click(within(tagsRegion).getByRole("button", { name: "Save Tag" }));
    await waitFor(() => expect(api.updateTag).toHaveBeenCalledWith(expect.objectContaining({
      id: reliabilityId,
      name: reliability.name,
      aliases: reliability.aliases,
      definition: "Dependable systems with explicit incident ownership",
      notes: reliability.notes,
    })));
    expect(glossaryChange).toHaveBeenCalledTimes(1);
  });
});
