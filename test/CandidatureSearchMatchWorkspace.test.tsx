import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type { CandidatureRecord, ConceptRecord, DesktopApi } from "../src/shared/contracts";

const sourceId = "00000000-0000-4000-8000-000000000601";
const conceptId = "00000000-0000-4000-8000-000000000602";
const concept: ConceptRecord = {
  id: "00000000-0000-4000-8000-000000000603",
  name: "Reliability engineering",
  definition: "Dependable production systems",
  aliases: ["SRE"],
  notes: "Ask about incident ownership",
};

function record(id: string, label: string, sourceSearchText: string, conceptIds: string[] = []): CandidatureRecord {
  return {
    id,
    archived: false,
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    label,
    sourceSearchText,
    values: [],
    documentIds: [],
    conceptIds,
  };
}

const sourceRecord = record(
  sourceId,
  "Nimbus Labs",
  "Platform role with a confidential security clearance requirement near the customer environment.",
);
const conceptRecord = record(conceptId, "Regional Air", "Flight operations role", [concept.id]);
const search = vi.fn();

function installApi() {
  const records = [sourceRecord, conceptRecord];
  const api = {
    candidatures: {
      list: vi.fn().mockResolvedValue(records),
      listFields: vi.fn().mockResolvedValue([]),
      listConcepts: vi.fn().mockResolvedValue([concept]),
      listSources: vi.fn().mockResolvedValue([]),
    },
    candidatureSearch: { search },
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
  } as unknown as DesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

describe("candidature corpus search recognition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApi();
    search.mockImplementation(async ({ query }: { query: string }) => {
      if (query === "security clearance") return [sourceId];
      if (query === "incident") return [conceptId];
      return [];
    });
  });

  afterEach(() => cleanup());

  it("shows the buried Source or Concept reason returned by authoritative search", async () => {
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);
    await screen.findByRole("region", { name: "Candidature Focus" });

    const searchInput = screen.getByLabelText("Search retained information");
    await user.type(searchInput, "security clearance");

    const list = screen.getByRole("complementary", { name: "Candidature list" });
    const sourceResult = await within(list).findByRole("button", { name: /Nimbus Labs/ });
    expect(sourceResult).toHaveTextContent("Source match");
    expect(sourceResult).toHaveTextContent("security clearance");
    expect(within(list).queryByRole("button", { name: /Regional Air/ })).not.toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, "incident");

    const conceptResult = await within(list).findByRole("button", { name: /Regional Air/ });
    expect(conceptResult).toHaveTextContent("Concept match");
    expect(conceptResult).toHaveTextContent("Reliability engineering");
    expect(within(list).queryByRole("button", { name: /Nimbus Labs/ })).not.toBeInTheDocument();
  });
});
