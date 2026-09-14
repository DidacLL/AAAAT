import { useEffect, useState } from "react";

import type { AiContextMode } from "../shared/contracts";

interface Props {
  readonly itemId: string;
  readonly onDirtyChange?: (dirty: boolean) => void;
}

const labels: Readonly<Record<AiContextMode, string>> = {
  expose: "Use this information",
  token: "Use a local placeholder",
  omit: "Do not use",
};

export function ProfileItemAiDisclosureControl({ itemId, onDirtyChange }: Props) {
  const [mode, setMode] = useState<AiContextMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDirtyChange?.(false);
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  useEffect(() => {
    let active = true;
    void window.aaaat.profileAiContext
      .current(itemId)
      .then((preference) => {
        if (active) setMode(preference.aiContextMode);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load the AI-use setting.");
      });
    return () => {
      active = false;
    };
  }, [itemId]);

  const updateMode = async (nextMode: AiContextMode) => {
    if (mode === null || saving || nextMode === mode) return;
    const previous = mode;
    setMode(nextMode);
    setSaving(true);
    setError(null);
    try {
      const preference = await window.aaaat.profileAiContext.update({
        itemId,
        aiContextMode: nextMode,
      });
      setMode(preference.aiContextMode);
    } catch {
      setMode(previous);
      setError("AAAAT could not save the AI-use setting.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="ai-visibility-control profile-item-ai-disclosure">
      <summary aria-label="Choose how AI may use this information" title="Choose how AI may use this information">
        AI
      </summary>
      <div className="ai-visibility-content">
        <p className="compact-help">
          This only affects optional AI help. It does not hide, remove or change your local information.
        </p>
        {mode === null ? <p className="compact-help">Loading…</p> : null}
        {mode !== null ? (
          <label>
            AI may
            <select
              value={mode}
              disabled={saving}
              onChange={(event) => void updateMode(event.target.value as AiContextMode)}
            >
              {(Object.keys(labels) as AiContextMode[]).map((value) => (
                <option key={value} value={value}>{labels[value]}</option>
              ))}
            </select>
          </label>
        ) : null}
        {saving ? <span className="compact-help">Saving…</span> : null}
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </div>
    </details>
  );
}
