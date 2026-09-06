import { useEffect, useMemo, useState } from "react";

import type { CandidatureRecord } from "../shared/contracts";
import type { TodoRecord } from "../shared/todo-contracts";

interface TodoDraft {
  readonly body: string;
  readonly candidatureId: string;
}

const emptyDraft: TodoDraft = { body: "", candidatureId: "" };

export function TodosWorkspace({
  onDirtyChange = () => undefined,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [todos, setTodos] = useState<TodoRecord[]>([]);
  const [candidatures, setCandidatures] = useState<CandidatureRecord[]>([]);
  const [createDraft, setCreateDraft] = useState<TodoDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TodoDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([window.aaaat.todos.list(), window.aaaat.candidatures.list()])
      .then(([nextTodos, nextCandidatures]) => {
        if (!active) return;
        setTodos(nextTodos);
        setCandidatures(nextCandidatures);
      })
      .catch(() => {
        if (active) setError("ToDos could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  const editingTodo = useMemo(
    () => todos.find((todo) => todo.id === editingId) ?? null,
    [editingId, todos],
  );
  const dirty =
    createDraft.body.length > 0 ||
    (editingTodo !== null &&
      (editDraft.body !== editingTodo.body ||
        editDraft.candidatureId !== (editingTodo.candidatureId ?? "")));

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  const candidatureLabel = (id: string | null) =>
    id ? candidatures.find((item) => item.id === id)?.label ?? "Related candidature" : "No candidature";

  const create = async () => {
    setError(null);
    try {
      const created = await window.aaaat.todos.create({
        body: createDraft.body,
        candidatureId: createDraft.candidatureId || null,
      });
      setTodos((current) => [created, ...current]);
      setCreateDraft(emptyDraft);
    } catch {
      setError("The ToDo could not be created.");
    }
  };

  const beginEdit = (todo: TodoRecord) => {
    setEditingId(todo.id);
    setEditDraft({ body: todo.body, candidatureId: todo.candidatureId ?? "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setError(null);
    try {
      const updated = await window.aaaat.todos.update({
        id: editingId,
        body: editDraft.body,
        candidatureId: editDraft.candidatureId || null,
      });
      setTodos((current) => current.map((todo) => (todo.id === updated.id ? updated : todo)));
      setEditingId(null);
      setEditDraft(emptyDraft);
    } catch {
      setError("The ToDo could not be saved.");
    }
  };

  const toggle = async (todo: TodoRecord) => {
    setError(null);
    try {
      const updated = await window.aaaat.todos.toggle({ id: todo.id, done: !todo.done });
      setTodos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setError("The ToDo could not be updated.");
    }
  };

  const remove = async (todo: TodoRecord) => {
    if (!window.confirm(`Delete “${todo.body}”?`)) return;
    setError(null);
    try {
      setTodos(await window.aaaat.todos.remove(todo.id));
      if (editingId === todo.id) {
        setEditingId(null);
        setEditDraft(emptyDraft);
      }
    } catch {
      setError("The ToDo could not be deleted.");
    }
  };

  return (
    <section className="profile-workspace" aria-labelledby="todos-heading">
      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Lightweight tasks</p>
            <h2 id="todos-heading">ToDos</h2>
          </div>
          <span>{todos.length} saved</span>
        </div>

        <form
          className="editor-card"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <label className="wide-field">
            ToDo
            <textarea
              value={createDraft.body}
              onChange={(event) => setCreateDraft({ ...createDraft, body: event.target.value })}
              placeholder="What do you want to remember?"
            />
          </label>
          <label className="wide-field">
            Candidature (optional)
            <select
              value={createDraft.candidatureId}
              onChange={(event) =>
                setCreateDraft({ ...createDraft, candidatureId: event.target.value })
              }
            >
              <option value="">No candidature</option>
              {candidatures.map((candidature) => (
                <option key={candidature.id} value={candidature.id}>
                  {candidature.label}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions wide-field">
            <button className="compact-primary" type="submit" disabled={!createDraft.body.trim()}>
              Add ToDo
            </button>
          </div>
        </form>

        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </div>

      <div className="profile-column">
        <div className="section-heading">
          <h2>Saved ToDos</h2>
        </div>
        <div className="item-list">
          {todos.length === 0 ? <p>No ToDos yet.</p> : null}
          {todos.map((todo) => (
            <article className="profile-item" key={todo.id}>
              {editingId === todo.id ? (
                <form
                  className="editor-card wide-field"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveEdit();
                  }}
                >
                  <label className="wide-field">
                    ToDo
                    <textarea
                      value={editDraft.body}
                      onChange={(event) => setEditDraft({ ...editDraft, body: event.target.value })}
                    />
                  </label>
                  <label className="wide-field">
                    Candidature (optional)
                    <select
                      value={editDraft.candidatureId}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, candidatureId: event.target.value })
                      }
                    >
                      <option value="">No candidature</option>
                      {candidatures.map((candidature) => (
                        <option key={candidature.id} value={candidature.id}>
                          {candidature.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-actions wide-field">
                    <button className="compact-primary" type="submit" disabled={!editDraft.body.trim()}>
                      Save
                    </button>
                    <button
                      className="compact-secondary"
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft(emptyDraft);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <label>
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() => void toggle(todo)}
                        aria-label={`Mark ${todo.body} ${todo.done ? "not done" : "done"}`}
                      />{" "}
                      <strong>{todo.body}</strong>
                    </label>
                    <p>{candidatureLabel(todo.candidatureId)}</p>
                  </div>
                  <div className="row-actions">
                    <button type="button" onClick={() => beginEdit(todo)}>Edit</button>
                    <button type="button" onClick={() => void remove(todo)}>Delete</button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
