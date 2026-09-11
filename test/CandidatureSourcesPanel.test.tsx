import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureSourcesPanel } from "../src/renderer/CandidatureSourcesPanel";
import type { CandidatureSource } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000301";
const source: CandidatureSource = {
  id: "00000000-0000-4000-8000-000000000302",
  candidatureId,
  kind: "recruiter_message",
  title: "Recruiter note",
  url: "https://example.test/job",
  sourceText: `${"Distributed systems context and interview detail. ".repeat(8)}\nFULL-TAIL-MARKER`,
  createdAt: "2026-09-11T10:00:00.000Z",
  updatedAt: "2026-09-11T10:00:00.000Z",
};

const listSources = vi.fn();
const addSource = vi.fn();
const updateSource = vi.fn();
const removeSource = vi.fn();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: {
        listSources,
        addSource,
        updateSource,
        removeSource,
      },
    },
  });
}

function renderSources() {
  const onDirtyChange = vi.fn();
  const onSourcesChanged = vi.fn();
  const rendered = render(
    <CandidatureSourcesPanel
      candidatureId={candidatureId}
      onDirtyChange={onDirtyChange}
      onSourcesChanged={onSourcesChanged}
    />,
  );
  return { ...rendered, onDirtyChange, onSourcesChanged };
}

describe("Candidature Sources read-first interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSources.mockResolvedValue([source]);
    addSource.mockResolvedValue([source]);
    updateSource.mockResolvedValue([source]);
    removeSource.mockResolvedValue([]);
    installApi();
  });

  afterEach(() => cleanup());

  it("keeps the overview compact and opens complete retained content without editing", async () => {
    const user = userEvent.setup();
    const { onDirtyChange } = renderSources();

    await screen.findByText("Recruiter note");
    expect(screen.queryByText(/FULL-TAIL-MARKER/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Read source" }));

    const reader = screen.getByRole("article", { name: "Source content" });
    expect(reader).toHaveTextContent("Recruiter note");
    expect(reader).toHaveTextContent("FULL-TAIL-MARKER");
    expect(within(reader).getByText("https://example.test/job")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Source material" })).not.toBeInTheDocument();
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it("returns from full reading to the Source overview without mutating anything", async () => {
    const user = userEvent.setup();
    renderSources();

    await screen.findByText("Recruiter note");
    await user.click(screen.getByRole("button", { name: "Read source" }));
    expect(screen.getByRole("article", { name: "Source content" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to Sources" }));

    expect(screen.queryByRole("article", { name: "Source content" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Source list")).toBeInTheDocument();
    expect(addSource).not.toHaveBeenCalled();
    expect(updateSource).not.toHaveBeenCalled();
    expect(removeSource).not.toHaveBeenCalled();
  });

  it("enters mutation UI deliberately from the read context and keeps existing save semantics", async () => {
    const user = userEvent.setup();
    const updated = { ...source, sourceText: "Updated retained material" };
    updateSource.mockResolvedValue([updated]);
    const { onDirtyChange, onSourcesChanged } = renderSources();

    await screen.findByText("Recruiter note");
    await user.click(screen.getByRole("button", { name: "Read source" }));
    await user.click(screen.getByRole("button", { name: "Edit source" }));

    const sourceMaterial = screen.getByRole("textbox", { name: "Source material" });
    expect(sourceMaterial).toHaveValue(source.sourceText);
    await user.clear(sourceMaterial);
    await user.type(sourceMaterial, updated.sourceText);
    expect(onDirtyChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Save source" }));

    expect(updateSource).toHaveBeenCalledWith({
      id: source.id,
      candidatureId,
      kind: source.kind,
      title: source.title,
      url: source.url,
      sourceText: updated.sourceText,
    });
    expect(onSourcesChanged).toHaveBeenCalledWith([updated]);
    expect(screen.queryByRole("textbox", { name: "Source material" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Source list")).toHaveTextContent("Updated retained material");
  });
});
