import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type { CandidatureRecord, DesktopApi, TagRecord } from "../src/shared/contracts";

const sourceId = "00000000-0000-4000-8000-000000000601";
const tagRecordId = "00000000-0000-4000-8000-000000000602";
const tag: TagRecord = {
  id: "00000000-0000-4000-8000-000000000603",
  name: "Reliability engineering",
  definition: "Dependable production systems",
  aliases: ["SRE"],
  notes: "Ask about incident ownership",
};

function record(id: string, label: string, sourceSearchText: string, tagIds: string[] = []): CandidatureRecord {
  return {
    id,
    archived: false,
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    label,
    sourceSearchText,
    values: [],
    documentIds: [],
    tagIds,
  };
}

const sourceRecord = record(
  sourceId,
  "Nimbus Labs",
  "Platform role with a confidential security clearance requirement near the customer environment.",
);
const taggedRecord = record(tagRecordId, "Regional Air", "Flight operations role", [tag.id]);
const search = vi.fn();

function installApi() {
  const records = [sourceRecord, taggedRecord];
  const api = {
    candidatures: {
      list: vi.fn().mockResolvedValue(records),
      listFields: vi.fn().mockResolvedValue([]),
      listTags: vi.fn().mockResolvedValue([tag]),
      listSources: vi.fn().mockResolvedValue([]),
    },
    candidatureSearch: { search },
    documents: { list: vi.fn().mockResolvedValue([]) },
  } as unknown as DesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

describe("candidature corpus search recognition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApi();
    search.mockImplementation(async ({ query }: { query: string }) => {
      if (query === "security clearance") return [sourceId];
      if (query === "incident") return [tagRecordId];
      return [];
    });
  });

  afterEach(() => cleanup());

  it("shows the buried Source or Tag reason returned by authoritative search", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await screen.findByRole("heading", { name: "Candidatures" });

    const searchInput = screen.getByRole("searchbox", { name: "Search candidatures" });
    await user.type(searchInput, "security clearance");

    const sourceResult = await screen.findByRole("button", { name: /Nimbus Labs/ });
    expect(sourceResult).toHaveTextContent("Source match");
    expect(sourceResult).toHaveTextContent("security clearance");
    expect(screen.queryByRole("button", { name: /Regional Air/ })).not.toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, "incident");

    const tagResult = await screen.findByRole("button", { name: /Regional Air/ });
    expect(tagResult).toHaveTextContent("Tag match");
    expect(tagResult).toHaveTextContent("Reliability engineering");
    expect(screen.queryByRole("button", { name: /Nimbus Labs/ })).not.toBeInTheDocument();
  });
});
