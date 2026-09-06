import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureFocusPanel } from "../src/renderer/CandidatureFocusPanel";
import type { CandidatureRecord, CandidatureSource } from "../src/shared/contracts";
import type { FocusDesktopApi } from "../src/shared/focus-contracts";
import type { TodoDesktopApi, TodoRecord } from "../src/shared/todo-contracts";

const candidature: CandidatureRecord = {
  id: "00000000-0000-4000-8000-000000000301",
  archived: false,
  createdAt: "2026-09-06T10:00:00.000Z",
  updatedAt: "2026-09-06T10:00:00.000Z",
  label: "Platform engineer",
  sourceSearchText: "",
  values: [],
  documentIds: [],
  conceptIds: [],
};

const source: CandidatureSource = {
  id: "00000000-0000-4000-8000-000000000302",
  candidatureId: candidature.id,
  kind: "recruiter_message",
  title: "Recruiter note",
  url: "https://example.test/job",
  sourceText: "The team needs distributed systems experience and calm incident response.",
  createdAt: "2026-09-06T10:00:00.000Z",
  updatedAt: "2026-09-06T10:00:00.000Z",
};

const todo: TodoRecord = {
  id: "00000000-0000-4000-8000-000000000401",
  body: "Prepare incident response example",
  done: false,
  candidatureId: candidature.id,
  createdAt: "2026-09-06T10:00:00.000Z",
  updatedAt: "2026-09-06T10:00:00.000Z",
};

const current = vi.fn<FocusDesktopApi["focus"]["current"]>();
const update = vi.fn<FocusDesktopApi["focus"]["update"]>();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: { listSources: async () => [source] },
      todos: { list: async () => [todo] } as Pick<TodoDesktopApi["todos"], "list">,
      focus: { current, update },
    },
  });
}

describe("Candidature Focus structural retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    current.mockResolvedValue({ sources: true, concepts: true, todos: true, documents: true });
    update.mockImplementation(async (preferences) => preferences);
    installApi();
  });

  afterEach(() => cleanup());

  it("shows retained Source context and related ToDos without extraction", async () => {
    render(
      <CandidatureFocusPanel
        record={candidature}
        fields={[]}
        concepts={[]}
        documents={[]}
        selectedConceptId={null}
        onSelectConcept={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(await screen.findByText("Recruiter note")).toBeInTheDocument();
    expect(screen.getByText(/distributed systems experience/)).toBeInTheDocument();
    expect(screen.getByText(/Open · Prepare incident response example/)).toBeInTheDocument();
  });

  it("persists an independent structural material choice and hides that section", async () => {
    const user = userEvent.setup();
    render(
      <CandidatureFocusPanel
        record={candidature}
        fields={[]}
        concepts={[]}
        documents={[]}
        selectedConceptId={null}
        onSelectConcept={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    await screen.findByText("Recruiter note");
    const material = screen.getByRole("group", { name: "Focus material" });
    await user.click(within(material).getByRole("checkbox", { name: "Sources" }));

    expect(update).toHaveBeenCalledWith({
      sources: false,
      concepts: true,
      todos: true,
      documents: true,
    });
    expect(screen.queryByText("Recruiter note")).not.toBeInTheDocument();
    expect(screen.getByText(/Open · Prepare incident response example/)).toBeInTheDocument();
  });
});
