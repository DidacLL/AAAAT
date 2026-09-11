import { useEffect, useState } from "react";

import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
  CandidatureSource,
  ConceptRecord,
  DocumentRecord,
} from "../shared/contracts";
import type { FocusMaterialPreferences } from "../shared/focus-contracts";
import type { TodoRecord } from "../shared/todo-contracts";
import { CandidatureActivityPanel } from "./CandidatureActivityPanel";

export type FocusDestination = "information" | "sources" | "documents";

interface Props {
  readonly record: CandidatureRecord;
  readonly fields: readonly CandidatureFieldConfiguration[];
  readonly concepts: readonly ConceptRecord[];
  readonly documents: readonly DocumentRecord[];
  readonly selectedConceptId: string | null;
  readonly onSelectConcept: (conceptId: string) => void;
  readonly onNavigate: (destination: FocusDestination) => void;
}

const defaultMaterialPreferences: FocusMaterialPreferences = {
  sources: true,
  concepts: true,
  todos: true,
  documents: true,
};

const maximumFocusSources = 3;

function displayValue(
  field: CandidatureFieldConfiguration,
  value: CandidatureRuntimeValue,
): string {
  const displayOne = (item: string | number | boolean): string => {
    if (field.definition.valueType === "choice" && typeof item === "string") {
      return field.definition.choices.find((choice) => choice.id === item)?.label ?? item;
    }
    if (typeof item === "boolean") return item ? "Yes" : "No";
    return String(item);
  };
  return Array.isArray(value) ? value.map(displayOne).join(", ") : displayOne(value);
}

function sourceLabel(source: CandidatureSource): string {
  return source.title.trim() || source.kind.replaceAll("_", " ");
}

function sourceType(source: CandidatureSource): string {
  return source.kind.replaceAll("_", " ");
}

function sourcePreview(source: CandidatureSource): string {
  const normalized = source.sourceText.trim().replaceAll(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.length > 140 ? `${normalized.slice(0, 137)}…` : normalized;
}

function documentType(document: DocumentRecord): string {
  return document.kind === "cv" ? "CV" : "Cover letter";
}

export function CandidatureFocusPanel({
  record,
  fields,
  concepts,
  documents,
  selectedConceptId,
  onSelectConcept,
  onNavigate,
}: Props) {
  const [materialPreferences, setMaterialPreferences] =
    useState<FocusMaterialPreferences>(defaultMaterialPreferences);
  const [sources, setSources] = useState<CandidatureSource[]>([]);
  const [todos, setTodos] = useState<TodoRecord[]>([]);
  const [focusConcepts, setFocusConcepts] = useState<ConceptRecord[]>([...concepts]);
  const [materialError, setMaterialError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.focus.current(),
      window.aaaat.candidatures.listSources(record.id),
      window.aaaat.candidatures.listConcepts(),
      window.aaaat.todos.list(),
    ])
      .then(([preferences, nextSources, nextConcepts, nextTodos]) => {
        if (!active) return;
        setMaterialError(null);
        setMaterialPreferences(preferences);
        setSources(nextSources);
        setFocusConcepts(nextConcepts);
        setTodos(nextTodos.filter((todo) => todo.candidatureId === record.id));
      })
      .catch(() => {
        if (active) setMaterialError("AAAAT could not load all Focus material.");
      });
    return () => {
      active = false;
    };
  }, [record.id]);

  const setMaterialVisible = async (
    key: keyof FocusMaterialPreferences,
    visible: boolean,
  ) => {
    const previous = materialPreferences;
    const next = { ...previous, [key]: visible };
    setMaterialPreferences(next);
    setMaterialError(null);
    try {
      setMaterialPreferences(await window.aaaat.focus.update(next));
    } catch {
      setMaterialPreferences(previous);
      setMaterialError("AAAAT could not save Focus material preferences.");
    }
  };

  const replaceTodo = (updated: TodoRecord) => {
    setTodos((current) => current.map((todo) => (todo.id === updated.id ? updated : todo)));
  };

  const addReminder = async () => {
    const body = window.prompt("Reminder");
    if (!body?.trim()) return;
    setMaterialError(null);
    try {
      const created = await window.aaaat.todos.create({ body, candidatureId: record.id });
      if (created.candidatureId === record.id) setTodos((current) => [created, ...current]);
    } catch {
      setMaterialError("AAAAT could not add this reminder.");
    }
  };

  const toggleReminder = async (todo: TodoRecord) => {
    setMaterialError(null);
    try {
      replaceTodo(await window.aaaat.todos.toggle({ id: todo.id, done: !todo.done }));
    } catch {
      setMaterialError("AAAAT could not update this reminder.");
    }
  };

  const editReminder = async (todo: TodoRecord) => {
    const body = window.prompt("Edit reminder", todo.body);
    if (body === null || !body.trim() || body.trim() === todo.body) return;
    setMaterialError(null);
    try {
      replaceTodo(
        await window.aaaat.todos.update({
          id: todo.id,
          body,
          candidatureId: record.id,
        }),
      );
    } catch {
      setMaterialError("AAAAT could not save this reminder.");
    }
  };

  const removeReminder = async (todo: TodoRecord) => {
    if (!window.confirm(`Delete reminder “${todo.body}”?`)) return;
    setMaterialError(null);
    try {
      const remaining = await window.aaaat.todos.remove(todo.id);
      setTodos(remaining.filter((item) => item.candidatureId === record.id));
    } catch {
      setMaterialError("AAAAT could not delete this reminder.");
    }
  };

  const openConceptMaintenance = () => {
    const details = document.querySelector<HTMLDetailsElement>(".candidature-concepts-support");
    if (!details) return;
    details.open = true;
    details.scrollIntoView?.({ block: "nearest" });
  };

  const values = new Map(record.values.map((value) => [value.fieldId, value.value]));
  const focusFields = fields
    .filter(
      (field) =>
        field.preferences.focusVisible && values.has(field.definition.id),
    )
    .sort((left, right) => {
      const leftOrder = left.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.definition.label.localeCompare(right.definition.label);
    });

  const associatedConcepts = focusConcepts.filter((concept) =>
    record.conceptIds.includes(concept.id),
  );
  const associatedDocuments = documents.filter((document) =>
    record.documentIds.includes(document.id),
  );
  const selectedConcept =
    associatedConcepts.find((concept) => concept.id === selectedConceptId) ??
    associatedConcepts[0] ??
    null;
  const visibleSources = sources.slice(0, maximumFocusSources);

  return (
    <section className="focus-panel" aria-label="Candidature Focus">
      <div className="focus-heading">
        <div>
          <p className="eyebrow">Focus</p>
          <h3>{record.label}</h3>
          <p>Useful retained context for quick recognition and recall.</p>
        </div>
      </div>

      {materialError ? <p className="error-message" role="alert">{materialError}</p> : null}

      {focusFields.length > 0 ? (
        <div className="focus-grid">
          {focusFields.map((field) => {
            const value = values.get(field.definition.id);
            if (value === undefined) return null;
            return (
              <section
                key={field.definition.id}
                className={`focus-block focus-${field.preferences.focusProminence}`}
              >
                <h4>{field.definition.label}</h4>
                <p>{displayValue(field, value)}</p>
              </section>
            );
          })}
        </div>
      ) : null}

      {materialPreferences.sources && sources.length > 0 ? (
        <section className="focus-documents" aria-label="Sources">
          <div className="focus-section-heading">
            <h4>Sources</h4>
            <button type="button" className="compact-secondary" onClick={() => onNavigate("sources")}>
              Open Sources
            </button>
          </div>
          <div className="source-card-list focus-source-list">
            {visibleSources.map((source, index) => {
              const preview = sourcePreview(source);
              return (
                <article
                  className="source-card focus-source-cue"
                  key={source.id}
                  aria-label={focusFields.length === 0 && index === 0 ? "Recognition clue" : undefined}
                >
                  <div>
                    <strong>{sourceLabel(source)}</strong>
                    <span>{sourceType(source)}</span>
                  </div>
                  {source.url ? <p className="source-reference">{source.url}</p> : null}
                  {preview ? <p>{preview}</p> : null}
                </article>
              );
            })}
          </div>
          {sources.length > maximumFocusSources ? (
            <p className="compact-help">
              {sources.length - maximumFocusSources} more {sources.length - maximumFocusSources === 1 ? "Source" : "Sources"} available.
            </p>
          ) : null}
        </section>
      ) : null}

      {materialPreferences.concepts && associatedConcepts.length > 0 ? (
        <section className="focus-concepts">
          <div className="focus-section-heading">
            <h4>Concepts &amp; keywords</h4>
            <button type="button" className="compact-secondary" onClick={openConceptMaintenance}>
              Manage concepts
            </button>
          </div>
          <div className="concept-chip-row">
            {associatedConcepts.map((concept) => (
              <button
                type="button"
                key={concept.id}
                className={
                  concept.id === selectedConcept?.id
                    ? "concept-chip selected-concept-chip"
                    : "concept-chip"
                }
                onClick={() => onSelectConcept(concept.id)}
              >
                {concept.name}
              </button>
            ))}
          </div>
          {selectedConcept ? (
            <article className="selected-concept-definition">
              <strong>{selectedConcept.name}</strong>
              {selectedConcept.definition ? <p>{selectedConcept.definition}</p> : null}
              {selectedConcept.aliases.length > 0 ? (
                <p><strong>Aliases:</strong> {selectedConcept.aliases.join(", ")}</p>
              ) : null}
              {selectedConcept.notes ? <p><strong>Notes:</strong> {selectedConcept.notes}</p> : null}
            </article>
          ) : null}
        </section>
      ) : null}

      {materialPreferences.todos ? (
        <section className="focus-documents" aria-label="Reminders">
          <h4>Reminders</h4>
          {todos.length === 0 ? <p className="compact-empty">No reminders for this candidature.</p> : (
            <ul className="focus-reminder-list">
              {todos.map((todo) => (
                <li key={todo.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={todo.done}
                      onChange={() => void toggleReminder(todo)}
                      aria-label={`Mark ${todo.body} ${todo.done ? "not done" : "done"}`}
                    />{" "}
                    <span>{todo.body}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <details className="focus-secondary-actions">
            <summary>Manage reminders</summary>
            <div className="focus-reminder-actions">
              <button type="button" className="compact-secondary" onClick={() => void addReminder()}>
                Add reminder
              </button>
              {todos.map((todo) => (
                <div className="button-row" key={todo.id}>
                  <button
                    type="button"
                    className="compact-secondary"
                    aria-label={`Edit ${todo.body}`}
                    onClick={() => void editReminder(todo)}
                  >
                    Edit “{todo.body}”
                  </button>
                  <button
                    type="button"
                    className="compact-secondary"
                    aria-label={`Delete ${todo.body}`}
                    onClick={() => void removeReminder(todo)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </details>
        </section>
      ) : null}

      {materialPreferences.documents && associatedDocuments.length > 0 ? (
        <section className="focus-documents" aria-label="Application material">
          <div className="focus-section-heading">
            <h4>Application material</h4>
            <button type="button" className="compact-secondary" onClick={() => onNavigate("documents")}>
              Open application material
            </button>
          </div>
          <ul className="focus-document-list">
            {associatedDocuments.map((document) => (
              <li key={document.id}>
                <strong>{document.title}</strong>
                <span>{documentType(document)} · working document</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="focus-customization">
        <summary>Customize Focus</summary>
        <div className="focus-customization-content">
          {focusFields.length === 0 ? (
            <p className="compact-help">No retained candidature information is currently configured for Focus.</p>
          ) : null}
          <fieldset className="editor-card" aria-label="Focus material">
            <legend>Focus material</legend>
            {(
              [
                ["sources", "Sources"],
                ["concepts", "Concepts"],
                ["todos", "Reminders"],
                ["documents", "Application material"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={materialPreferences[key]}
                  onChange={(event) => void setMaterialVisible(key, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className="compact-secondary"
            onClick={() => onNavigate("information")}
          >
            Configure Focus information
          </button>
        </div>
      </details>

      <CandidatureActivityPanel key={record.id} candidatureId={record.id} />
    </section>
  );
}
