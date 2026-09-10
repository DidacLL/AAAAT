import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { CareerContext } from "../shared/contracts";

const emptyContext: CareerContext = {
  careerDirection: "",
  objectives: "",
  constraints: "",
  targetRoles: "",
  targetMarketsLocations: "",
  workPreferences: "",
  applicationWritingPreferences: "",
};

const fields: readonly {
  key: keyof CareerContext;
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
  const [draft, setDraft] = useState<CareerContext>(emptyContext);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.careerContext
      .current()
      .then((current) => {
        if (!active) return;
        setContext(current);
        setDraft(current);
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

  const dirty = context ? JSON.stringify(draft) !== JSON.stringify(context) : false;

  useEffect(() => {
    onDirtyChange?.(editing && dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, editing, onDirtyChange]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const saved = await window.aaaat.careerContext.update(draft);
      setContext(saved);
      setDraft(saved);
      setEditing(false);
    } catch {
      setError("AAAAT could not save your career preferences.");
    }
  };

  const cancel = () => {
    if (dirty && !window.confirm("Discard unsaved career preferences edits?")) return;
    setDraft(context ?? emptyContext);
    setEditing(false);
    setError(null);
  };

  return (
    <section className="career-context-panel" aria-label="Career preferences">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Current direction</p>
          <h2>Career preferences</h2>
          <p>
            Reusable direction, constraints, and preferences to keep alongside your professional
            information. AAAAT retains them; it does not choose opportunities for you.
          </p>
        </div>
        {!editing && context ? (
          <button
            className="compact-secondary"
            type="button"
            onClick={() => {
              setDraft(context);
              setEditing(true);
            }}
          >
            {nonEmpty.length === 0 ? "Add career preferences" : "Edit career preferences"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="error-message" role="alert">
          {error}
        </p>
      ) : null}

      {!context ? (
        <p>{error ? null : "Loading career preferences..."}</p>
      ) : editing ? (
        <form className="editor-card career-context-editor" onSubmit={(event) => void save(event)}>
          {fields.map(({ key, label, hint }) => (
            <label className="wide-field" key={key}>
              {label}
              <span className="field-hint">{hint}</span>
              <textarea
                value={draft[key]}
                onChange={(event) =>
                  setDraft({ ...draft, [key]: event.target.value })
                }
              />
            </label>
          ))}
          <div className="form-actions wide-field">
            <button className="compact-primary" type="submit">
              Save career preferences
            </button>
            <button className="compact-secondary" type="button" onClick={cancel}>
              Cancel
            </button>
          </div>
        </form>
      ) : nonEmpty.length === 0 ? (
        <p className="empty-copy">
          Add only preferences or constraints that help you recognise or describe suitable
          opportunities.
        </p>
      ) : (
        <dl className="career-context-summary">
          {nonEmpty.map(({ key, label }) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{context[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
