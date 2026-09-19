import { useEffect, useState } from "react";

interface Props {
  readonly itemId: string;
  readonly onDirtyChange?: (dirty: boolean) => void;
}

export function ProfileItemAiDisclosureControl({ itemId, onDirtyChange }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
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
        if (active) setAllowed(preference.aiUseAllowed);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load the AI-use setting.");
      });
    return () => {
      active = false;
    };
  }, [itemId]);

  const toggle = async () => {
    if (allowed === null || saving) return;
    const previous = allowed;
    const next = !allowed;
    setAllowed(next);
    setSaving(true);
    setError(null);
    try {
      const preference = await window.aaaat.profileAiContext.update({
        itemId,
        aiUseAllowed: next,
      });
      setAllowed(preference.aiUseAllowed);
    } catch {
      setAllowed(previous);
      setError("AAAAT could not save the AI-use setting.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className="profile-item-ai-disclosure">
      <button
        type="button"
        className="compact-secondary ai-use-control"
        aria-label="AI may use this information"
        aria-pressed={allowed ?? false}
        title={allowed === false ? "AI will not use this information" : "AI may use this information"}
        disabled={allowed === null || saving}
        onClick={() => void toggle()}
      >
        AI use: {allowed ? "On" : "Off"}
      </button>
      {error ? <span className="error-message" role="alert">{error}</span> : null}
    </span>
  );
}
