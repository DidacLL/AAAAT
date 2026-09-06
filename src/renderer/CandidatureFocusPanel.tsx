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

export type FocusDestination = "information";

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

function sourcePreview(source: CandidatureSource): string {
  const normalized = source.sourceText.trim().replaceAll(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.length > 320 ? `${normalized.slice(0, 317)}…` : normalized;
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
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
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
  const notesDraft = selectedConcept
    ? (notesDrafts[selectedConcept.id] ?? selectedConcept.notes ?? "")
    : "";

  const saveConceptNotes = async () => {
    if (!selectedConcept) return;
    setMaterialError(null);
    try {
      const updated = await window.aaaat.candidatures.updateConcept({
        id: selectedConcept.id,
        name: selectedConcept.name,
        definition: selectedConcept.definition,
        aliases: selectedConcept.aliases,
        notes: notesDraft,
      });
      setFocusConcepts((current) =>
        current.map((concept) => (concept.id === updated.id ? updated : concept)),
      );
      setNotesDrafts((current) => ({ ...current, [updated.id]: updated.notes ?? "" }));
    } catch {
      setMaterialError("AAAAT could not save these concept notes.");
    }
  };

  return (
    <section className="focus-panel" aria-label="Candidature Focus">
      <div className="focus-heading">
        <div>
          <p className="eyebrow">Focus</p>
          <h3>{record.label}</h3>
          <p>Only retained information and material you configured for Focus appears here.</p>
        </div>
        <button
          type="button"
          className="compact-secondary"
          onClick={() => onNavigate("information")}
        >
          Configure Focus information
        </button>
      </div>

      <fieldset className="editor-card" aria-label="Focus material">
        <legend>Focus material</legend>
        {(
          [
            ["sources", "Sources"],
            ["concepts", "Concepts"],
            ["todos", "ToDos"],
            ["documents", "Documents"],
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
      {materialError ? <p className="error-message" role="alert">{materialError}</p> : null}

      {focusFields.length === 0 ? (
        <div className="compact-empty">
          <p>No retained candidature information is currently shown in Focus.</p>
          <button type="button" onClick={() => onNavigate("information")}>
            Choose Focus information
          </button>
        </div>
      ) : (
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
      )}

      {materialPreferences.sources && sources.length > 0 ? (
        <section className="focus-documents">
          <h4>Sources</h4>
          <div className="source-card-list">
            {sources.map((source) => {
              const preview = sourcePreview(source);
              return (
                <article className="source-card" key={source.id}>
                  <strong>{sourceLabel(source)}</strong>
                  {source.url ? <p className="source-reference">{source.url}</p> : null}
                  {preview ? <p>{preview}</p> : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {materialPreferences.concepts && associatedConcepts.length > 0 ? (
        <section className="focus-concepts">
          <h4>Concepts &amp; keywords</h4>
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
              <label>
                Concept notes
                <textarea
                  rows={3}
                  value={notesDraft}
                  onChange={(event) =>
                    setNotesDrafts((current) => ({
                      ...current,
                      [selectedConcept.id]: event.target.value,
                    }))
                  }
                />
              </label>
              <button
                type="button"
                className="compact-secondary"
                disabled={notesDraft === (selectedConcept.notes ?? "")}
                onClick={() => void saveConceptNotes()}
              >
                Save concept notes
              </button>
            </article>
          ) : null}
        </section>
      ) : null}

      {materialPreferences.todos && todos.length > 0 ? (
        <section className="focus-documents">
          <h4>ToDos</h4>
          <ul>
            {todos.map((todo) => (
              <li key={todo.id}>
                {todo.done ? "Done" : "Open"} · {todo.body}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {materialPreferences.documents && associatedDocuments.length > 0 ? (
        <section className="focus-documents">
          <h4>Application material</h4>
          <ul>
            {associatedDocuments.map((document) => (
              <li key={document.id}>
                {document.title} · {document.kind === "cv" ? "CV" : "cover letter"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
