import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type { CandidatureRecord, DesktopApi } from "../src/shared/contracts";

const firstId = "00000000-0000-4000-8000-000000001001";
const secondId = "00000000-0000-4000-8000-000000001002";

function record(id: string, label: string): CandidatureRecord {
  return {
    id,
    archived: false,
    createdAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z",
    label,
    sourceSearchText: "",
    values: [],
    documentIds: [],
    conceptIds: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function installApi(search: (input: { query: string }) => Promise<string[]>) {
  const records = [record(firstId, "First opportunity"), record(secondId, "Second opportunity")];
  const api = {
    candidatures: {
      list: vi.fn().mockResolvedValue(records),
      listFields: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      filter: vi.fn(),
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
      listConcepts: vi.fn().mockResolvedValue([]),
      createConcept: vi.fn(),
      updateConcept: vi.fn(),
      setConcepts: vi.fn(),
    },
    candidatureSearch: { search: vi.fn(search) },
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
    ai: {
      discoverField: vi.fn(),
      previewFit: vi.fn(),
      assessFit: vi.fn(),
      recommendVariant: vi.fn(),
    },
    profile: { current: vi.fn().mockResolvedValue({ items: [], variants: [] }) },
  } as unknown as DesktopApi & { candidatureSearch: { search: typeof search } };
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
  return api.candidatureSearch.search;
}

describe("candidature local corpus search UI", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the named local search operation and ignores an older response after a newer query", async () => {
    const older = deferred<string[]>();
    const newer = deferred<string[]>();
    const search = installApi(({ query }) => {
      if (query === "first") return older.promise;
      if (query === "second") return newer.promise;
      return Promise.resolve([]);
    });

    render(<CandidaturesWorkspace />);
    await screen.findByRole("heading", { name: "Candidatures" });
    const input = screen.getByRole("searchbox", { name: "Search retained information" });

    fireEvent.change(input, { target: { value: "first" } });
    await waitFor(() => expect(search).toHaveBeenCalledWith({ query: "first" }));
    fireEvent.change(input, { target: { value: "second" } });
    await waitFor(() => expect(search).toHaveBeenCalledWith({ query: "second" }));

    newer.resolve([secondId]);
    const list = screen.getByRole("complementary", { name: "Candidature list" });
    await waitFor(() => expect(within(list).getByText("Second opportunity")).toBeInTheDocument());
    expect(within(list).queryByText("First opportunity")).not.toBeInTheDocument();

    older.resolve([firstId]);
    await Promise.resolve();
    expect(within(list).getByText("Second opportunity")).toBeInTheDocument();
    expect(within(list).queryByText("First opportunity")).not.toBeInTheDocument();
  });
});
