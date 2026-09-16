import { useEffect, useState } from "react";

import type {
  CareerContextAiDisclosure,
  CareerContextAiDisclosureKey,
} from "../shared/career-context-ai-disclosure-contracts";

export function CareerContextAiDisclosureControl({
  fieldKey,
  onDirtyChange,
}: {
  readonly fieldKey: CareerContextAiDisclosureKey;
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [value, setValue] = useState<CareerContextAiDisclosure | null>(null);
  const [saving, setSaving] = useState(false);
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
        if (active) setError("AAAAT could not load the AI-use setting.");
      });
    return () => {
      active = false;
    };
  }, [fieldKey]);

  const toggle = async () => {
    if (!value || saving) return;
    const previous = value;
    const next = { ...value, [fieldKey]: !value[fieldKey] };
    setValue(next);
    setSaving(true);
    setError(null);
    try {
      setValue(await window.aaaat.careerContextAiDisclosure.update(next));
    } catch {
      setValue(previous);
      setError("AAAAT could not save the AI-use setting.");
    } finally {
      setSaving(false);
    }
  };

  const allowed = value?.[fieldKey] ?? false;
  return (
    <span className="career-context-ai-use">
      <button
        type="button"
        className="ai-use-eye"
        aria-label="AI may use this information"
        aria-pressed={allowed}
        title={value && !allowed ? "AI will not use this information" : "AI may use this information"}
        disabled={!value || saving}
        onClick={() => void toggle()}
      >
        <span aria-hidden="true">{value && !allowed ? "○" : "◉"}</span>
      </button>
      {error ? <span className="error-message" role="alert">{error}</span> : null}
    </span>
  );
}
