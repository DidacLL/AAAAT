import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TodosWorkspace } from "../src/renderer/TodosWorkspace";
import type { CandidatureRecord, DesktopApi } from "../src/shared/contracts";
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

function todo(overrides: Partial<TodoRecord> = {}): TodoRecord {
  return {
    id: "00000000-0000-4000-8000-000000000401",
    body: "Send portfolio",
    done: false,
    candidatureId: null,
    createdAt: "2026-09-06T10:00:00.000Z",
    updatedAt: "2026-09-06T10:00:00.000Z",
    ...overrides,
  };
}

const list = vi.fn<TodoDesktopApi["todos"]["list"]>();
const create = vi.fn<TodoDesktopApi["todos"]["create"]>();
const update = vi.fn<TodoDesktopApi["todos"]["update"]>();
const toggle = vi.fn<TodoDesktopApi["todos"]["toggle"]>();
const remove = vi.fn<TodoDesktopApi["todos"]["remove"]>();

function installApi() {
  const api = {
    candidatures: { list: async () => [candidature] },
    todos: { list, create, update, toggle, remove },
  } as unknown as DesktopApi & TodoDesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

describe("ToDos workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue([]);
    create.mockImplementation(async (input) => todo({ body: input.body, candidatureId: input.candidatureId }));
    update.mockImplementation(async (input) =>
      todo({ id: input.id, body: input.body, candidatureId: input.candidatureId }),
    );
    toggle.mockImplementation(async (input) => todo({ id: input.id, done: input.done }));
    remove.mockResolvedValue([]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    installApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("creates a ToDo with an optional candidature relation", async () => {
    const user = userEvent.setup();
    render(<TodosWorkspace />);

    await screen.findByRole("heading", { name: "ToDos" });
    await user.type(screen.getByLabelText("ToDo"), "Check recruiter reply");
    await user.selectOptions(screen.getByLabelText("Candidature (optional)"), candidature.id);
    await user.click(screen.getByRole("button", { name: "Add ToDo" }));

    expect(create).toHaveBeenCalledWith({
      body: "Check recruiter reply",
      candidatureId: candidature.id,
    });
    expect(await screen.findByText("Check recruiter reply")).toBeInTheDocument();
    expect(screen.getByText("Platform engineer")).toBeInTheDocument();
  });

  it("edits, toggles, and deletes saved ToDos through the bounded API", async () => {
    const existing = todo();
    list.mockResolvedValueOnce([existing]);
    update.mockResolvedValue(todo({ body: "Send updated portfolio" }));
    toggle.mockResolvedValue(todo({ body: "Send updated portfolio", done: true }));
    const user = userEvent.setup();
    render(<TodosWorkspace />);

    await screen.findByText("Send portfolio");
    await user.click(screen.getByRole("button", { name: "Edit" }));
    const editor = screen.getByLabelText("ToDo");
    await user.clear(editor);
    await user.type(editor, "Send updated portfolio");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(update).toHaveBeenCalledWith({
      id: existing.id,
      body: "Send updated portfolio",
      candidatureId: null,
    });

    await user.click(screen.getByRole("checkbox", { name: "Mark Send updated portfolio done" }));
    expect(toggle).toHaveBeenCalledWith({ id: existing.id, done: true });

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(remove).toHaveBeenCalledWith(existing.id);
    expect(screen.getByText("No ToDos yet.")).toBeInTheDocument();
  });
});
