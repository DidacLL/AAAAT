import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { CareerContext } from "../shared/contracts";
import type { CareerContextAiDisclosureKey } from "../shared/career-context-ai-disclosure-contracts";
import { CareerContextAiDisclosureControl } from "./CareerContextAiDisclosureControl";

const fields: readonly {
  key: CareerContextAiDisclosureKey;
  label: string;
  hint: string;
}[] = [
  {
    key: "careerDirection",
    label: "Career direction",
    hint: "Where you want your career to move next.",
  },
  {
    key: "objectives",
    label: "Objectives",
    hint: "What you want the next move to achieve.",
  },
  {
    key: "constraints",
    label: "Constraints",
    hint: "Non-negotiable limits or practical constraints.",
  },
  {
    key: "targetRoles",
    label: "Target roles",
    hint: "Roles or levels you are actively considering.",
  },
  {
    key: "targetMarketsLocations",
    label: "Target markets / locations",
    hint: "Markets, locations, or remote/hybrid boundaries that matter.",
  },
  {
    key: "workPreferences",
    label: "Work preferences",
    hint: "Team, environment, scope, or ways of working you prefer.",
  },
  {
    key: "applicationWritingPreferences",
    label: "Application / writing preferences",
    hint: "Preferences that should shape candidature material and communication.",
  },
];

export function CareerContextPanel({
  onDirtyChange,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [context, setContext] = useState<CareerContext | null>(null);
  const [editingKey, setEditingKey] = useState<CareerContextAiDisclosureKey | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.careerContext
      .current()
      .then((current) => {
        if (!active) return;
        setContext(current);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load your career preferences.");
      });
    return () => {
      active = false;
    };
  }, []);

  const nonEmpty = useMemo(
    () =>
      context
        ? fields.filter(({ key }) => context[key].trim().length > 0)
        : [],
    [context],
  );
  const available = useMemo(
    () =>
      context
        ? fields.filter(({ key }) => context[key].trim().length === 0 && key !== editingKey)
        : [],
    [context, editingKey],
  );
  const dirty = Boolean(
    context && editingKey && draftValue !== context[editingKey],
  );

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const beginEdit = (key: CareerContextAiDisclosureKey) => {
    if (!context) return;
    if (dirty && !window.confirm("Discard unsaved career preference edits?")) return;
    setEditingKey(key);
    setDraftValue(context[key]);
    setError(null);
  };

  const cancel = () => {
    if (dirty && !window.confirm("Discard unsaved career preference edits?")) return;
    setEditingKey(null);
    setDraftValue("");
    setError(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!context || !editingKey) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await window.aaaat.careerContext.update({
        ...context,
        [editingKey]: draftValue,
      });
      setContext(saved);
      setEditingKey(null);
      setDraftValue("");
    } catch {
      setError("AAAAT could not save your career preferences.");
    } finally {
      setSaving(false);
    }
  };

  const renderEditor = (key: CareerContextAiDisclosureKey) => {
    const field = fields.find((candidate) => candidate.key === key);
    if (!field) return null;
    return (
      <form
        className="career-preference-editor"
        aria-label={`Edit ${field.label}`}
        onSubmit={(event) => void save(event)}
      >
        <div className="career-context-field-heading">
          <div>
            <strong>{field.label}</strong>
            <span className="field-hint">{field.hint}</span>
          </div>
          <CareerContextAiDisclosureControl fieldKey={field.key} />
        </div>
        <textarea
          aria-label={field.label}
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          autoFocus
        />
        <div className="button-row">
          <button className="compact-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save preference"}
          </button>
          <button className="compact-secondary" type="button" onClick={cancel}>
            Cancel
          </button>
        </div>
      </form>
    );
  };

  if (!context) {
    return (
      <section className="career-context-panel career-context-compact" aria-label="Career preferences">
        <p className="compact-help">{error ?? "Loading career preferences…"}</p>
      </section>
    );
  }

  return (
    <section className="career-context-panel career-context-compact" aria-label="Career preferences">
      <div className="career-context-heading">
        <div>
          <p className="eyebrow">Optional targeting context</p>
          <h2>Career preferences</h2>
          <p className="profile-intro">Your own direction, constraints and preferences. Keep only what is useful.</p>
        </div>
        <span className="career-context-count">
          {nonEmpty.length === 0 ? "Optional" : `${String(nonEmpty.length)} saved`}
        </span>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      {nonEmpty.length === 0 && editingKey === null ? (
        <p className="compact-help">No career preferences saved. Add one when it helps describe what you want next.</p>
      ) : null}

      <div className="career-context-summary" aria-label="Saved career preferences">
        {nonEmpty.map(({ key, label }) =>
          editingKey === key ? (
            <div key={key} className="career-preference-edit-row">
              {renderEditor(key)}
            </div>
          ) : (
            <article key={key} className="career-preference-readout" aria-label={`${label} preference`}>
              <div className="career-context-field-heading">
                <strong>{label}</strong>
                <div className="career-preference-actions">
                  <CareerContextAiDisclosureControl fieldKey={key} />
                  <button className="compact-secondary" type="button" onClick={() => beginEdit(key)}>
                    Edit
                  </button>
                </div>
              </div>
              <p>{context[key]}</p>
            </article>
          ),
        )}
        {editingKey && context[editingKey].trim().length === 0 ? (
          <div className="career-preference-edit-row">{renderEditor(editingKey)}</div>
        ) : null}
      </div>

      {editingKey === null && available.length > 0 ? (
        <label className="career-preference-add">
          <span>Add preference</span>
          <select
            aria-label="Add career preference"
            value=""
            onChange={(event) => {
              const key = event.target.value as CareerContextAiDisclosureKey;
              if (key) beginEdit(key);
            }}
          >
            <option value="">Choose…</option>
            {available.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      ) : null}
    </section>
  );
}
