import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureFocusPanel } from "../src/renderer/CandidatureFocusPanel";
import type { CandidatureRecord, CandidatureSource, ConceptRecord } from "../src/shared/contracts";
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

const concept: ConceptRecord = {
  id: "00000000-0000-4000-8000-000000000501",
  name: "Incident response",
  definition: "Handling production incidents deliberately.",
  notes: "Use the payment outage example.",
  aliases: ["IR"],
};

const todo: TodoRecord = {
  id: "00000000-0000-4000-8000-000000000401",
  body: "Prepare incident response example",
  done: false,
  candidatureId: candidature.id,
  createdAt: "2026-09-06T10:00:00.000Z",
  updatedAt: "2026-09-06T10:00:00.000Z",
};

const otherTodo: TodoRecord = {
  ...todo,
  id: "00000000-0000-4000-8000-000000000402",
  body: "Reminder from another candidature",
  candidatureId: "00000000-0000-4000-8000-000000000399",
};

const current = vi.fn<FocusDesktopApi["focus"]["current"]>();
const update = vi.fn<FocusDesktopApi["focus"]["update"]>();
const listConcepts = vi.fn();
const updateConcept = vi.fn();
const listTodos = vi.fn<TodoDesktopApi["todos"]["list"]>();
const createTodo = vi.fn<TodoDesktopApi["todos"]["create"]>();
const updateTodo = vi.fn<TodoDesktopApi["todos"]["update"]>();
const toggleTodo = vi.fn<TodoDesktopApi["todos"]["toggle"]>();
const removeTodo = vi.fn<TodoDesktopApi["todos"]["remove"]>();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: {
        listSources: async () => [source],
        listConcepts,
        updateConcept,
      },
      todos: {
        list: listTodos,
        create: createTodo,
        update: updateTodo,
        toggle: toggleTodo,
        remove: removeTodo,
      },
      focus: { current, update },
    },
  });
}

function renderFocus(record: CandidatureRecord = candidature) {
  return render(
    <CandidatureFocusPanel
      record={record}
      fields={[]}
      concepts={record.conceptIds.includes(concept.id) ? [concept] : []}
      documents={[]}
      selectedConceptId={record.conceptIds.includes(concept.id) ? concept.id : null}
      onSelectConcept={vi.fn()}
      onNavigate={vi.fn()}
    />,
  );
}

describe("Candidature Focus structural retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    current.mockResolvedValue({ sources: true, concepts: true, todos: true, documents: true });
    update.mockImplementation(async (preferences) => preferences);
    listConcepts.mockResolvedValue([]);
    updateConcept.mockImplementation(async (input) => input);
    listTodos.mockResolvedValue([todo, otherTodo]);
    createTodo.mockImplementation(async (input) => ({
      ...todo,
      id: "00000000-0000-4000-8000-000000000403",
      body: input.body.trim(),
      candidatureId: input.candidatureId,
    }));
    updateTodo.mockImplementation(async (input) => ({ ...todo, ...input, body: input.body.trim() }));
    toggleTodo.mockImplementation(async (input) => ({ ...todo, done: input.done }));
    removeTodo.mockResolvedValue([otherTodo]);
    installApi();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("shows retained Source context and only reminders related to this candidature", async () => {
    renderFocus();

    expect(await screen.findByText("Recruiter note")).toBeInTheDocument();
    expect(screen.getByText(/distributed systems experience/)).toBeInTheDocument();
    const reminders = screen.getByRole("region", { name: "Reminders" });
    expect(within(reminders).getByText("Prepare incident response example")).toBeInTheDocument();
    expect(within(reminders).queryByText("Reminder from another candidature")).not.toBeInTheDocument();
  });

  it("persists an independent structural material choice and hides that section", async () => {
    const user = userEvent.setup();
    renderFocus();

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
    expect(screen.getByRole("region", { name: "Reminders" })).toBeInTheDocument();
  });

  it("adds, checks, edits and removes reminders for the current candidature", async () => {
    const user = userEvent.setup();
    const prompt = vi.spyOn(window, "prompt");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderFocus();

    const reminders = await screen.findByRole("region", { name: "Reminders" });

    prompt.mockReturnValueOnce("Ask about remote policy");
    await user.click(within(reminders).getByRole("button", { name: "Add reminder" }));
    expect(createTodo).toHaveBeenCalledWith({
      body: "Ask about remote policy",
      candidatureId: candidature.id,
    });
    expect(within(reminders).getByText("Ask about remote policy")).toBeInTheDocument();

    await user.click(
      within(reminders).getByRole("checkbox", { name: "Mark Prepare incident response example done" }),
    );
    expect(toggleTodo).toHaveBeenCalledWith({ id: todo.id, done: true });

    prompt.mockReturnValueOnce("Prepare database failover example");
    await user.click(within(reminders).getAllByRole("button", { name: "Edit" })[1]);
    expect(updateTodo).toHaveBeenCalledWith({
      id: todo.id,
      body: "Prepare database failover example",
      candidatureId: candidature.id,
    });
    expect(within(reminders).getByText("Prepare database failover example")).toBeInTheDocument();

    await user.click(within(reminders).getAllByRole("button", { name: "Delete" })[1]);
    expect(confirm).toHaveBeenCalledWith("Delete reminder “Prepare database failover example”?");
    expect(removeTodo).toHaveBeenCalledWith(todo.id);
    expect(within(reminders).queryByText("Prepare database failover example")).not.toBeInTheDocument();
  });

  it("shows and edits notes for a concept associated with the selected candidature", async () => {
    const user = userEvent.setup();
    const record = { ...candidature, conceptIds: [concept.id] };
    listConcepts.mockResolvedValue([concept]);
    updateConcept.mockImplementation(async (input) => ({ ...concept, ...input }));

    renderFocus(record);

    const editor = await screen.findByLabelText("Concept notes");
    expect(editor).toHaveValue("Use the payment outage example.");
    await user.clear(editor);
    await user.type(editor, "Use the database failover example instead.");
    await user.click(screen.getByRole("button", { name: "Save concept notes" }));

    expect(updateConcept).toHaveBeenCalledWith({
      id: concept.id,
      name: concept.name,
      definition: concept.definition,
      aliases: concept.aliases,
      notes: "Use the database failover example instead.",
    });
    expect(screen.getByText("Notes:").parentElement).toHaveTextContent(
      "Use the database failover example instead.",
    );
    expect(screen.getByLabelText("Concept notes")).toHaveValue(
      "Use the database failover example instead.",
    );
  });
});
