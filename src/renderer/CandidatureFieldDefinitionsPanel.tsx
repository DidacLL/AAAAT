import { useEffect, useState, type FormEvent } from "react";

import type { CandidatureFieldCreate } from "../shared/contracts";

interface Props {
  readonly onChanged: () => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
}

function blankField(): CandidatureFieldCreate {
  return { label: "", description: "", valueType: "text", cardinality: "one", choices: [], enabled: true };
}

export function CandidatureFieldDefinitionsPanel({ onChanged, onDirtyChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CandidatureFieldCreate>(blankField);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = open && JSON.stringify(draft) !== JSON.stringify(blankField());

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const close = () => {
    if (dirty && !window.confirm("Discard this new information item?")) return;
    setDraft(blankField());
    setError(null);
    setOpen(false);
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.label.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await window.aaaat.candidatures.createField({ ...draft, label: draft.label.trim() });
      setDraft(blankField());
      setOpen(false);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not add this information.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="candidature-add-information-entry">
        <button type="button" className="candidature-add-information-button" aria-label="Add information" onClick={() => setOpen(true)}>
          <span aria-hidden="true">+</span> Add information
        </button>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </div>
    );
  }

  return (
    <form className="candidature-add-information-form" aria-label="Add information" onSubmit={(event) => void create(event)}>
      <div className="candidature-add-information-fields">
        <label>Name<input autoFocus required value={draft.label} disabled={saving} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="Flight hours" /></label>
        <label>Details <span className="compact-help">optional</span><input value={draft.description} disabled={saving} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What this information means" /></label>
      </div>
      <details className="candidature-add-information-advanced">
        <summary>Value format</summary>
        <div className="candidature-add-information-fields">
          <label>Format<select value={draft.valueType} disabled={saving} onChange={(event) => {
            const valueType = event.target.value as CandidatureFieldCreate["valueType"];
            setDraft({ ...draft, valueType, choices: valueType === "choice" ? [{ id: crypto.randomUUID(), label: "Option" }] : [] });
          }}>
            <option value="text">Short text</option><option value="long_text">Long text</option><option value="number">Number</option><option value="boolean">Yes / no</option><option value="date">Date</option><option value="url">URL</option><option value="choice">Choice list</option>
          </select></label>
          <label>Values<select value={draft.cardinality} disabled={saving} onChange={(event) => setDraft({ ...draft, cardinality: event.target.value as CandidatureFieldCreate["cardinality"] })}>
            <option value="one">One value</option><option value="many">Several values</option>
          </select></label>
        </div>
        {draft.valueType === "choice" ? (
          <div className="candidature-add-information-fields">
            {draft.choices.map((choice, index) => (
              <label key={choice.id}>
                Option {index + 1}
                <span className="button-row">
                  <input
                    value={choice.label}
                    disabled={saving}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        choices: draft.choices.map((candidate) =>
                          candidate.id === choice.id
                            ? { ...candidate, label: event.target.value }
                            : candidate,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="compact-secondary"
                    disabled={saving || draft.choices.length === 1}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        choices: draft.choices.filter((candidate) => candidate.id !== choice.id),
                      })
                    }
                  >
                    Remove
                  </button>
                </span>
              </label>
            ))}
            <button
              type="button"
              className="compact-secondary"
              disabled={saving || draft.choices.length >= 64}
              onClick={() =>
                setDraft({
                  ...draft,
                  choices: [...draft.choices, { id: crypto.randomUUID(), label: "Option" }],
                })
              }
            >
              Add option
            </button>
          </div>
        ) : null}
      </details>
      <div className="button-row">
        <button type="submit" disabled={saving || !draft.label.trim()}>{saving ? "Adding…" : "Add"}</button>
        <button type="button" className="compact-secondary" disabled={saving} onClick={close}>Cancel</button>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </form>
  );
}
