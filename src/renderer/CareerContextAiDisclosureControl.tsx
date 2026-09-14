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
  const [value, setValue] = useState<CareerContextAiDisclosure | null>(null);
  const [savingKey, setSavingKey] = useState<CareerContextAiDisclosureKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDirtyChange?.(false);
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  useEffect(() => {
    let active = true;
    void window.aaaat.careerContextAiDisclosure
      .current()
      .then((current) => {
        if (active) setValue(current);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load the AI-use settings.");
      });
    return () => {
      active = false;
    };
  }, []);

  const setAllowed = async (key: CareerContextAiDisclosureKey, allowed: boolean) => {
    if (!value || savingKey) return;
    const previous = value;
    const next = { ...value, [key]: allowed };
    setValue(next);
    setSavingKey(key);
    setError(null);
    try {
      setValue(await window.aaaat.careerContextAiDisclosure.update(next));
    } catch {
      setValue(previous);
      setError("AAAAT could not save the AI-use setting.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <details className="ai-visibility-control career-context-ai-disclosure">
      <summary aria-label="Choose what AI may use" title="Choose what AI may use">
        AI
      </summary>
      <div className="ai-visibility-content">
        <p className="compact-help">
          Choose which preferences optional AI help may use. Everything stays stored locally either way.
        </p>
        {!value ? <p className="compact-help">Loading…</p> : null}
        {value ? (
          <div className="ai-visibility-options">
            {keys.map((key) => (
              <label className="check-field" key={key}>
                <input
                  type="checkbox"
                  checked={value[key]}
                  disabled={savingKey !== null}
                  onChange={(event) => void setAllowed(key, event.target.checked)}
                />
                {labels[key]}
              </label>
            ))}
          </div>
        ) : null}
        {savingKey ? <span className="compact-help">Saving…</span> : null}
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </div>
    </details>
  );
}
