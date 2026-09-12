import { useEffect, useState } from "react";

import type {
  CareerContextAiDisclosure,
  CareerContextAiDisclosureKey,
} from "../shared/career-context-ai-disclosure-contracts";

const labels: Readonly<Record<CareerContextAiDisclosureKey, string>> = {
  careerDirection: "Career direction",
  objectives: "Objectives",
  constraints: "Constraints",
  targetRoles: "Target roles",
  targetMarketsLocations: "Target markets / locations",
  workPreferences: "Work preferences",
  applicationWritingPreferences: "Application / writing preferences",
};

const keys = Object.keys(labels) as CareerContextAiDisclosureKey[];

export function CareerContextAiDisclosureControl({
  onDirtyChange,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [saved, setSaved] = useState<CareerContextAiDisclosure | null>(null);
  const [draft, setDraft] = useState<CareerContextAiDisclosure | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.careerContextAiDisclosure
      .current()
      .then((current) => {
        if (!active) return;
        setSaved(current);
        setDraft(current);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load external AI disclosure preferences.");
      });
    return () => {
      active = false;
    };
  }, []);

  const dirty = saved !== null && draft !== null && JSON.stringify(saved) !== JSON.stringify(draft);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const next = await window.aaaat.careerContextAiDisclosure.update(draft);
      setSaved(next);
      setDraft(next);
    } catch {
      setError("AAAAT could not save external AI disclosure preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="career-context-ai-disclosure">
      <summary>External AI disclosure</summary>
      <div className="career-context-ai-disclosure-content">
        <p className="compact-help">
          Choose which Career preferences may leave AAAAT through the external career-assistance
          connection. Turning sharing off keeps the preference stored and visible locally.
        </p>
        {!draft ? <p className="compact-help">Loading disclosure preferences…</p> : null}
        {draft ? (
          <fieldset>
            <legend>Share with external career assistance</legend>
            {keys.map((key) => (
              <label className="check-field" key={key}>
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(event) =>
                    setDraft({ ...draft, [key]: event.target.checked })
                  }
                />
                {labels[key]}
              </label>
            ))}
          </fieldset>
        ) : null}
        {draft ? (
          <button
            className="compact-secondary"
            type="button"
            disabled={saving || !dirty}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save external AI disclosure"}
          </button>
        ) : null}
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </div>
    </details>
  );
}
