import { useEffect, useState } from "react";

import type { AiContextMode } from "../shared/contracts";

interface Props {
  readonly itemId: string;
  readonly onDirtyChange?: (dirty: boolean) => void;
}

const labels: Readonly<Record<AiContextMode, string>> = {
  expose: "Share as written",
  token: "Use a local placeholder",
  omit: "Do not share",
};

export function ProfileItemAiDisclosureControl({ itemId, onDirtyChange }: Props) {
  const [savedMode, setSavedMode] = useState<AiContextMode | null>(null);
  const [draftMode, setDraftMode] = useState<AiContextMode>("expose");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = savedMode !== null && draftMode !== savedMode;

  useEffect(() => {
    let active = true;
    void window.aaaat.profileAiContext
      .current(itemId)
      .then((preference) => {
        if (!active) return;
        setSavedMode(preference.aiContextMode);
        setDraftMode(preference.aiContextMode);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load this AI disclosure preference.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [itemId]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const preference = await window.aaaat.profileAiContext.update({
        itemId,
        aiContextMode: draftMode,
      });
      setSavedMode(preference.aiContextMode);
      setDraftMode(preference.aiContextMode);
    } catch {
      setError("AAAAT could not save this AI disclosure preference.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="profile-item-ai-disclosure">
      <summary>AI disclosure</summary>
      <div className="profile-item-ai-disclosure-content">
        <p className="compact-help">
          Controls this reusable item when AAAAT builds context for optional AI assistance. It does not hide or delete local information and does not change CV or letter inclusion.
        </p>
        {loading ? <p className="compact-help">Loading disclosure preference…</p> : null}
        {!loading && savedMode !== null ? (
          <>
            <label>
              When AI uses this professional information
              <select
                value={draftMode}
                onChange={(event) => setDraftMode(event.target.value as AiContextMode)}
              >
                {(Object.keys(labels) as AiContextMode[]).map((mode) => (
                  <option key={mode} value={mode}>{labels[mode]}</option>
                ))}
              </select>
            </label>
            <button
              className="compact-secondary"
              type="button"
              disabled={saving || !dirty}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save AI disclosure"}
            </button>
          </>
        ) : null}
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </div>
    </details>
  );
}
