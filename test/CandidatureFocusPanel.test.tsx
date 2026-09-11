import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureFocusPanel } from "../src/renderer/CandidatureFocusPanel";
import type {
  CandidatureRecord,
  CandidatureSource,
  ConceptRecord,
  DocumentRecord,
} from "../src/shared/contracts";
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

const documentRecord: DocumentRecord = {
  id: "00000000-0000-4000-8000-000000000601",
  kind: "cv",
  title: "Platform CV",
  variantId: null,
  language: "en",
  engine: "pdflatex",
  bodyParagraphs: [],
  mode: "managed",
  rules: [],
  projectPath: "/workspace/documents/platform-cv",
  sourcePath: "/workspace/documents/platform-cv/main.tex",
  artifactPath: "/workspace/documents/platform-cv/main.pdf",
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
const listSources = vi.fn();
const listConcepts = vi.fn();
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
        listSources,
        listConcepts,
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

function renderFocus(
  record: CandidatureRecord = candidature,
  documents: readonly DocumentRecord[] = [],
) {
  const onNavigate = vi.fn();
  const onSelectConcept = vi.fn();
  const rendered = render(
    <>
      <CandidatureFocusPanel
        record={record}
        fields={[]}
        concepts={record.conceptIds.includes(concept.id) ? [concept] : []}
        documents={documents}
        selectedConceptId={record.conceptIds.includes(concept.id) ? concept.id : null}
        onSelectConcept={onSelectConcept}
        onNavigate={onNavigate}
      />
      <details className="candidature-concepts-support">
        <summary>Concept maintenance host</summary>
      </details>
    </>,
  );
  return { ...rendered, onNavigate, onSelectConcept };
}

describe("Candidature Focus rapid recall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    current.mockResolvedValue({ sources: true, concepts: true, todos: true, documents: true });
    update.mockImplementation(async (preferences) => preferences);
    listSources.mockResolvedValue([source]);
    listConcepts.mockResolvedValue([]);
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

  it("leads with retained recall content while customization stays secondary", async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderFocus();

    const sourceLabels = await screen.findAllByText("Recruiter note");
    const reminders = screen.getByRole("region", { name: "Reminders" });
    expect(within(reminders).getByText("Prepare incident response example")).toBeInTheDocument();
    expect(within(reminders).queryByText("Reminder from another candidature")).not.toBeInTheDocument();

    const customize = screen.getByText("Customize Focus");
    const firstSourceLabel = sourceLabels[0];
    expect(firstSourceLabel).toBeDefined();
    if (!firstSourceLabel) return;
    expect(firstSourceLabel.compareDocumentPosition(customize) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Focus material" })).not.toBeInTheDocument();

    await user.click(customize);
    expect(screen.getByRole("group", { name: "Focus material" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Configure Focus information" }));
    expect(onNavigate).toHaveBeenCalledWith("information");
  });

  it("uses a compact Source clue and provides the existing Sources handoff", async () => {
    const user = userEvent.setup();
    const longText = `${"Distributed systems and incident response. ".repeat(10)}Full detail belongs in Sources.`;
    listSources.mockResolvedValue([{ ...source, sourceText: longText }]);
    const { onNavigate } = renderFocus();

    await screen.findAllByText("Recruiter note");
    expect(screen.queryByText(longText)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Distributed systems and incident response/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Open Sources" }));
    expect(onNavigate).toHaveBeenCalledWith("sources");
  });

  it("persists an independent structural material choice from the secondary disclosure", async () => {
    const user = userEvent.setup();
    renderFocus();

    await screen.findAllByText("Recruiter note");
    await user.click(screen.getByText("Customize Focus"));
    const material = screen.getByRole("group", { name: "Focus material" });
    await user.click(within(material).getByRole("checkbox", { name: "Sources" }));

    expect(update).toHaveBeenCalledWith({
      sources: false,
      concepts: true,
      todos: true,
      documents: true,
    });
    expect(screen.queryByRole("region", { name: "Sources" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Reminders" })).toBeInTheDocument();
  });

  it("uses the existing Focus material preference to hide reminders without deleting them", async () => {
    const user = userEvent.setup();
    renderFocus();

    await screen.findByRole("region", { name: "Reminders" });
    await user.click(screen.getByText("Customize Focus"));
    const material = screen.getByRole("group", { name: "Focus material" });
    await user.click(within(material).getByRole("checkbox", { name: "Reminders" }));

    expect(update).toHaveBeenCalledWith({
      sources: true,
      concepts: true,
      todos: false,
      documents: true,
    });
    expect(screen.queryByRole("region", { name: "Reminders" })).not.toBeInTheDocument();
    expect(removeTodo).not.toHaveBeenCalled();
  });

  it("keeps reminder reading/check state primary while preserving add, edit and delete", async () => {
    const user = userEvent.setup();
    const prompt = vi.spyOn(window, "prompt");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderFocus();

    const reminders = await screen.findByRole("region", { name: "Reminders" });
    expect(within(reminders).queryByRole("button", { name: "Add reminder" })).not.toBeInTheDocument();

    const originalCheckbox = within(reminders).getByRole("checkbox", {
      name: "Mark Prepare incident response example done",
    });
    await user.click(originalCheckbox);
    expect(toggleTodo).toHaveBeenCalledWith({ id: todo.id, done: true });

    await user.click(within(reminders).getByText("Manage reminders"));
    prompt.mockReturnValueOnce("Ask about remote policy");
    await user.click(within(reminders).getByRole("button", { name: "Add reminder" }));
    expect(createTodo).toHaveBeenCalledWith({
      body: "Ask about remote policy",
      candidatureId: candidature.id,
    });
    expect(within(reminders).getByText("Ask about remote policy")).toBeInTheDocument();

    prompt.mockReturnValueOnce("Prepare database failover example");
    await user.click(within(reminders).getByRole("button", { name: `Edit ${todo.body}` }));
    expect(updateTodo).toHaveBeenCalledWith({
      id: todo.id,
      body: "Prepare database failover example",
      candidatureId: candidature.id,
    });

    await user.click(
      within(reminders).getByRole("button", { name: "Delete Prepare database failover example" }),
    );
    expect(confirm).toHaveBeenCalledWith("Delete reminder “Prepare database failover example”?");
    expect(removeTodo).toHaveBeenCalledWith(todo.id);
    expect(within(reminders).queryByText("Prepare database failover example")).not.toBeInTheDocument();
  });

  it("shows Concept recall without an inline editor and opens existing Concept maintenance", async () => {
    const user = userEvent.setup();
    const record = { ...candidature, conceptIds: [concept.id] };
    listConcepts.mockResolvedValue([concept]);

    renderFocus(record);

    expect(await screen.findByText(concept.definition)).toBeInTheDocument();
    expect(screen.getByText("Notes:").parentElement).toHaveTextContent(concept.notes ?? "");
    expect(screen.queryByLabelText("Concept notes")).not.toBeInTheDocument();

    const maintenance = screen.getByText("Concept maintenance host").closest("details");
    expect(maintenance).not.toHaveAttribute("open");
    await user.click(screen.getByRole("button", { name: "Manage concepts" }));
    expect(maintenance).toHaveAttribute("open");
  });

  it("summarizes associated application material and hands off to the existing material surface", async () => {
    const user = userEvent.setup();
    const record = { ...candidature, documentIds: [documentRecord.id] };
    const { onNavigate } = renderFocus(record, [documentRecord]);

    const material = await screen.findByRole("region", { name: "Application material" });
    expect(within(material).getByText("Platform CV")).toBeInTheDocument();
    expect(within(material).getByText("CV · managed content")).toBeInTheDocument();

    await user.click(within(material).getByRole("button", { name: "Open application material" }));
    expect(onNavigate).toHaveBeenCalledWith("documents");
  });
});
