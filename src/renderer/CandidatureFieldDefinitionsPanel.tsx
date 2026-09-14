import { useEffect, useMemo, useState } from "react";

import type {
  CandidatureFieldConfiguration,
  CandidatureFieldCreate,
  CandidatureFieldUpdate,
} from "../shared/contracts";

interface Props {
  readonly onChanged: () => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
}

function blankField(): CandidatureFieldCreate {
  return {
    label: "",
    description: "",
    valueType: "text",
    cardinality: "one",
    choices: [],
    enabled: true,
  };
}

function fieldDraft(field: CandidatureFieldConfiguration): CandidatureFieldUpdate {
  return {
    id: field.definition.id,
    label: field.definition.label,
    description: field.definition.description,
    valueType: field.definition.valueType,
    cardinality: field.definition.cardinality,
    choices: field.definition.choices,
    enabled: field.definition.enabled,
  };
}

function ensureChoiceDraft<T extends CandidatureFieldCreate | CandidatureFieldUpdate>(draft: T, valueType: T["valueType"]): T {
  return {
    ...draft,
    valueType,
    choices:
      valueType === "choice"
        ? draft.choices.length > 0
          ? draft.choices
          : [{ id: crypto.randomUUID(), label: "Option" }]
        : [],
  };
}

export function CandidatureFieldDefinitionsPanel({ onChanged, onDirtyChange }: Props) {
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [editDraft, setEditDraft] = useState<CandidatureFieldUpdate | null>(null);
  const [editAiDiscovery, setEditAiDiscovery] = useState(false);
  const [newDraft, setNewDraft] = useState<CandidatureFieldCreate>(blankField);
  const [newAiDiscovery, setNewAiDiscovery] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = fields.find((field) => field.definition.id === selectedId) ?? null;
  const editDirty =
    selected !== null &&
    editDraft !== null &&
    (JSON.stringify(editDraft) !== JSON.stringify(fieldDraft(selected)) ||
      editAiDiscovery !== selected.preferences.aiDiscovery);
  const newDirty =
    newDraft.label.trim().length > 0 ||
    newDraft.description.length > 0 ||
    newDraft.valueType !== "text" ||
    newDraft.cardinality !== "one" ||
    newDraft.choices.length > 0 ||
    !newDraft.enabled ||
    newAiDiscovery;
  const dirty = editDirty || newDirty;

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const loadFields = async () => {
    const next = await window.aaaat.candidatures.listFields();
    setFields(next);
    return next;
  };

  useEffect(() => {
    let active = true;
    void window.aaaat.candidatures
      .listFields()
      .then((next) => {
        if (active) setFields(next);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load candidature field definitions.");
      });
    return () => {
      active = false;
    };
  }, []);

  const selectField = (fieldId: string) => {
    if (dirty && selectedId && !window.confirm("Discard unsaved field-definition edits?")) return;
    setSelectedId(fieldId);
    const field = fields.find((candidate) => candidate.definition.id === fieldId);
    setEditDraft(field ? fieldDraft(field) : null);
    setEditAiDiscovery(field?.preferences.aiDiscovery ?? false);
    setError(null);
  };

  const saveExisting = async () => {
    if (!selected || !editDraft) return;
    setError(null);
    try {
      await window.aaaat.candidatures.updateField(editDraft);
      await window.aaaat.candidatures.updateFieldPreferences({
        ...selected.preferences,
        aiDiscovery: editAiDiscovery,
        fieldId: selected.definition.id,
      });
      const next = await loadFields();
      const refreshed = next.find((field) => field.definition.id === selected.definition.id) ?? null;
      setEditDraft(refreshed ? fieldDraft(refreshed) : null);
      setEditAiDiscovery(refreshed?.preferences.aiDiscovery ?? false);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this field definition.");
    }
  };

  const createField = async () => {
    if (!newDraft.label.trim()) return;
    setError(null);
    try {
      const created = await window.aaaat.candidatures.createField(newDraft);
      if (newAiDiscovery) {
        await window.aaaat.candidatures.updateFieldPreferences({
          ...created.preferences,
          aiDiscovery: true,
          fieldId: created.definition.id,
        });
      }
      const next = await loadFields();
      setNewDraft(blankField());
      setNewAiDiscovery(false);
      const refreshed = next.find((field) => field.definition.id === created.definition.id) ?? null;
      setSelectedId(created.definition.id);
      setEditDraft(refreshed ? fieldDraft(refreshed) : null);
      setEditAiDiscovery(refreshed?.preferences.aiDiscovery ?? false);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not create this field definition.");
    }
  };

  const deleteSelected = async () => {
    if (!selected || selected.definition.systemKey !== null) return;
    if (!window.confirm(`Delete unused field “${selected.definition.label}”?`)) return;
    setError(null);
    try {
      await window.aaaat.candidatures.deleteField(selected.definition.id);
      await loadFields();
      setSelectedId("");
      setEditDraft(null);
      setEditAiDiscovery(false);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not delete this field definition.");
    }
  };

  const renderChoices = <T extends CandidatureFieldCreate | CandidatureFieldUpdate>(
    draft: T,
    setDraft: (next: T) => void,
  ) => {
    if (draft.valueType !== "choice") return null;
    return (
      <div className="choice-definition-list">
        {draft.choices.map((choice, index) => (
          <div className="button-row" key={choice.id}>
            <input
              aria-label={`Choice ${index + 1}`}
              value={choice.label}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  choices: draft.choices.map((candidate) =>
                    candidate.id === choice.id ? { ...candidate, label: event.target.value } : candidate,
                  ),
                })
              }
            />
            <button
              type="button"
              className="compact-secondary"
              disabled={draft.choices.length <= 1}
              onClick={() =>
                setDraft({
                  ...draft,
                  choices: draft.choices.filter((candidate) => candidate.id !== choice.id),
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="compact-secondary"
          onClick={() =>
            setDraft({
              ...draft,
              choices: [...draft.choices, { id: crypto.randomUUID(), label: "New option" }],
            })
          }
        >
          Add choice
        </button>
      </div>
    );
  };

  const enabledCount = useMemo(() => fields.filter((field) => field.definition.enabled).length, [fields]);

  return (
    <details className="field-definitions-panel">
      <summary>Manage candidature fields</summary>
      <div className="field-definitions-content">
        <p>
          Shipped fields are defaults, not a fixed ontology. Add or adapt fields for the work you actually do.
        </p>
        <p className="compact-help">{enabledCount} enabled field{enabledCount === 1 ? "" : "s"}</p>

        <section className="editor-card" aria-label="Edit candidature field">
          <h4>Edit a field</h4>
          <label>
            Field
            <select value={selectedId} onChange={(event) => selectField(event.target.value)}>
              <option value="">Choose…</option>
              {fields.map((field) => (
                <option key={field.definition.id} value={field.definition.id}>
                  {field.definition.label}{field.definition.enabled ? "" : " · retired"}
                </option>
              ))}
            </select>
          </label>
          {selected && editDraft ? (
            <div className="field-definition-form">
              <label>
                Name
                <input value={editDraft.label} onChange={(event) => setEditDraft({ ...editDraft, label: event.target.value })} />
              </label>
              <label>
                Description
                <textarea rows={3} value={editDraft.description} onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })} />
              </label>
              <label>
                Type
                <select
                  value={editDraft.valueType}
                  onChange={(event) => setEditDraft(ensureChoiceDraft(editDraft, event.target.value as CandidatureFieldUpdate["valueType"]))}
                >
                  <option value="text">Text</option>
                  <option value="long_text">Long text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Yes / no</option>
                  <option value="date">Date</option>
                  <option value="url">URL</option>
                  <option value="choice">Choice</option>
                </select>
              </label>
              <label>
                Values
                <select value={editDraft.cardinality} onChange={(event) => setEditDraft({ ...editDraft, cardinality: event.target.value as CandidatureFieldUpdate["cardinality"] })}>
                  <option value="one">One value</option>
                  <option value="many">Multiple values</option>
                </select>
              </label>
              {renderChoices(editDraft, setEditDraft)}
              <label>
                <input type="checkbox" checked={editDraft.enabled} onChange={(event) => setEditDraft({ ...editDraft, enabled: event.target.checked })} />
                Available for candidature entry
              </label>
              <label>
                <input type="checkbox" checked={editAiDiscovery} onChange={(event) => setEditAiDiscovery(event.target.checked)} />
                AI extraction may propose this field from retained Sources
              </label>
              <div className="button-row">
                <button type="button" disabled={!editDirty} onClick={() => void saveExisting()}>Save field</button>
                {selected.definition.systemKey === null ? (
                  <button type="button" className="compact-secondary" onClick={() => void deleteSelected()}>
                    Delete unused field
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <section className="editor-card" aria-label="Create candidature field">
          <h4>Add a field</h4>
          <label>
            Name
            <input value={newDraft.label} onChange={(event) => setNewDraft({ ...newDraft, label: event.target.value })} placeholder="Flight hours" />
          </label>
          <label>
            Description
            <textarea rows={3} value={newDraft.description} onChange={(event) => setNewDraft({ ...newDraft, description: event.target.value })} />
          </label>
          <label>
            Type
            <select
              value={newDraft.valueType}
              onChange={(event) => setNewDraft(ensureChoiceDraft(newDraft, event.target.value as CandidatureFieldCreate["valueType"]))}
            >
              <option value="text">Text</option>
              <option value="long_text">Long text</option>
              <option value="number">Number</option>
              <option value="boolean">Yes / no</option>
              <option value="date">Date</option>
              <option value="url">URL</option>
              <option value="choice">Choice</option>
            </select>
          </label>
          <label>
            Values
            <select value={newDraft.cardinality} onChange={(event) => setNewDraft({ ...newDraft, cardinality: event.target.value as CandidatureFieldCreate["cardinality"] })}>
              <option value="one">One value</option>
              <option value="many">Multiple values</option>
            </select>
          </label>
          {renderChoices(newDraft, setNewDraft)}
          <label>
            <input type="checkbox" checked={newAiDiscovery} onChange={(event) => setNewAiDiscovery(event.target.checked)} />
            AI extraction may propose this field from retained Sources
          </label>
          <button type="button" disabled={!newDraft.label.trim()} onClick={() => void createField()}>
            Add field
          </button>
        </section>

        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </div>
    </details>
  );
}
